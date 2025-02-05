import {
    Lucid,
    Blockfrost,
    Data,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    fromText,
    Redeemer,
    UTxO,
    Constr,
    datumJsonToCbor,
} from "https://deno.land/x/lucid@0.10.11/mod.ts";
   
   import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
   const lucid = await Lucid.new(
       new Blockfrost(
           "https://cardano-preview.blockfrost.io/api/v0",
           "preview9OHh6v8FZ0Aqshi0Rs73v4BqeDCPCTy8"
       ),
       "Preview"
   );
 console.log("20");
lucid.selectWalletFromSeed(await Deno.readTextFile("../signature/beneficiary.seed"));
console.log("22");
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("../utils/plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}
console.log("32");
const Asset = Data.Object({
    policy_id: Data.Bytes(),    // PolicyId
    token_name: Data.Bytes(),   // AssetName
    amt: Data.Integer(),         // Int
 });
 console.log("46");
 const Datum = Data.Object({
    owner: Data.Bytes(),           
    beneficiary: Data.Bytes(),     // VerificationKeyHash
    lock_until: Data.Integer(),     // Int
    message: Data.Bytes(),         // ByteArray
    nft: Asset,                  // Asset type defined above
    locked_ada: Data.Integer(),     // Int       
 });
console.log("50");
 
 type Datum = Data.Static<typeof Datum>;
 async function unlock(utxos: UTxO[], currentTime: number, {from, using} : {from: SpendingValidator, using: Redeemer}): Promise<TxHash>{
    const laterTime = new Date(currentTime + 2 * 60 * 60 * 1000).getTime();

    console.log("69");
    const tx = await lucid
    .newTx()
    .collectFrom(utxos, using) //collect utxo to redeemer
    .addSigner(await lucid.wallet.address()) // this should be beneficiary address
    .validFrom(currentTime)
    .validTo(laterTime)
    .attachSpendingValidator(from)
    .complete();
    console.log("77");

    const signedTx = await tx.sign().complete();
    
    return signedTx.submit();
 }
 async function main(){
    const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(await lucid.wallet.address()).paymentCredential?.hash;
    const validator = await readValidator();
    const contractAddress = lucid.utils.validatorToAddress(validator);
    const scriptUTxOs = await lucid.utxosAt(contractAddress);
    const currentTime = new Date().getTime();
    console.log("78");
    const utxos = scriptUTxOs.filter((utxo)=> {
        try {
            const datum = Data.from<Datum>(utxo.datum ?? '', Datum);
            console.log("82");
            console.log("Checking UTxO with datum:", datum);
            console.log("Current beneficiary:", beneficiaryPublicKeyHash);
            console.log("Current time:", BigInt(currentTime));
            
            // Kiểm tra từng điều kiện và log ra
            const isBeneficiaryMatch = datum.beneficiary === beneficiaryPublicKeyHash;
            const isTimeExpired = BigInt(datum.lock_until) <= BigInt(currentTime);

             console.log("Conditions:", {
                isBeneficiaryMatch,
                isTimeExpired,
            });
             return isBeneficiaryMatch &&    
                   isTimeExpired
        } catch (e) {
            console.log(e);
            return false;
        }
    });
    if (utxos.length === 0) {
        console.log("No redeemable utxo found. You need to wait a little longer...");
        Deno.exit(1);
    }
    console.log("92");
    
    const redeemer = Data.void();
    console.log("redeemer: ", redeemer);
    console.log("95");
    const txUnlock = await unlock(utxos, currentTime, { from: validator, using: redeemer });
    console.log("96");
    await lucid.awaitTx(txUnlock);
    console.log(`1 tADA recovered from the contract
        Tx ID: ${txUnlock}
        Redeemer: ${redeemer}
    `);

 }
 main();
 //deno run --allow-net --allow-read --allow-env unlock.ts 9373d029cbc4ef72769569491590cefc569d7941f6f214b53fed4dc3d51193af
 