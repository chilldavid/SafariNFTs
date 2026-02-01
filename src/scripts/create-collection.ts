import { loadConfig } from "../config";
import { createConnection, loadWallet, getBalance } from "../utils";
import { createCollection } from "../nft";

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadWallet();
  const isDevnet = config.cluster === "devnet";

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}`);

  const balance = await getBalance(connection, wallet);
  console.log(`Balance: ${balance} SOL\n`);

  if (balance < 0.05) {
    console.error(
      "Insufficient balance. You need at least 0.05 SOL to create a collection."
    );
    console.error("Run `npm run airdrop` to get devnet SOL.");
    process.exit(1);
  }

  const result = await createCollection({
    connection,
    wallet,
    name: process.env.COLLECTION_NAME || "Safari NFTs",
    symbol: process.env.COLLECTION_SYMBOL || "SAFARI",
    description:
      process.env.COLLECTION_DESCRIPTION ||
      "A collection of safari-themed NFTs on the Solana blockchain.",
    imageUri:
      process.env.COLLECTION_IMAGE_URI ||
      "https://arweave.net/placeholder-replace-with-your-collection-image",
    sellerFeeBasisPoints: parseInt(process.env.SELLER_FEE_BPS || "500"),
    isDevnet,
  });

  console.log("\n--- Collection Summary ---");
  console.log(`Collection Address: ${result.collectionAddress}`);
  console.log(`Metadata URI:       ${result.metadataUri}`);
  console.log(`Explorer:           ${result.explorerUrl}`);
  console.log(
    `\nSet COLLECTION_MINT=${result.collectionAddress} in your .env to mint NFTs into this collection.`
  );
}

main().catch(console.error);
