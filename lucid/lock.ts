import {
    Lucid,
    Blockfrost,
    Data,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    fromText,
   
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
   lucid.selectWalletFromSeed(await Deno.readTextFile("../signature/owner.seed"));
   
   //function support read validator
   
   async function readValidator(): Promise<SpendingValidator> {
       const validator = JSON.parse(await Deno.readTextFile("../utils/plutus.json")).validators[0];
       return{
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
    console.log("39");
 
    console.log("46");
    const Datum = Data.Object({
       owner: Data.Bytes(),           
       beneficiary: Data.Bytes(),     // VerificationKeyHash
       lock_until: Data.Integer(),     // Int   
       message: Data.Bytes(),         // ByteArray
       nft: Asset,                  // Asset type defined above
       locked_ada: Data.Integer(),     // Int     
    });
    console.log("57");
   type Datum = Data.Static<typeof Datum>;
   //function lock
   async function lock(lovelace: bigint, {into, datum}:{into: SpendingValidator, datum: string}): Promise<TxHash> {
       const contractAddress = await lucid.utils.validatorToAddress(into);
       console.log("62");
       const tx = await lucid.newTx()
       .payToContract(contractAddress,{inline: datum}, {lovelace})
       .complete();
       console.log("66");
       const signedTx = await tx.sign().complete();
       console.log("69");
       return signedTx.submit();
   }
   
   async function main(){
       console.log("73");
       const validator = await readValidator();
       console.log("75");
       const ownerPublicKeyHash = lucid.utils.getAddressDetails(await lucid.wallet.address()).paymentCredential?.hash;
       console.log("77");
       const beneficiaryPublicKeyHash =
           lucid.utils.getAddressDetails(await Deno.readTextFile("../signature/beneficiary.addr"))
               .paymentCredential?.hash;
       console.log("78");
       const datum = Data.to<Datum>(
            {
               lock_until: 1713319660n, // Wed Jan 04 2023 14:52:41 GMT+0000
               owner: ownerPublicKeyHash ?? '', // our own wallet verification key hash
               beneficiary: beneficiaryPublicKeyHash ?? '',
               message: fromText("Hello, babe"),
               nft: {
                   policy_id: "",
                   token_name: fromText("hello"),
                   amt: 1n
               },
               locked_ada: 1_000_000n,
               },
                   Datum
               );
       console.log("96");
       const txLock = await lock(1_000_000n, {into: validator, datum: datum});
       console.log("98");
       await lucid.awaitTx(txLock);
   
       console.log(`1 tADA locked into the contract
           Tx ID: ${txLock}
           Datum: ${datum}
       `);
   }
   
   main();
   
   
   //deno run --allow-net --allow-read --allow-env lock.ts
   
   
   
   