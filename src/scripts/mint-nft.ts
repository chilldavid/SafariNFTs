import { PublicKey } from "@solana/web3.js";
import { loadConfig } from "../config";
import { createConnection, loadWallet, getBalance } from "../utils";
import { mintNft, buildSafariMetadata } from "../nft";

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
      "Insufficient balance. You need at least 0.05 SOL to mint an NFT."
    );
    console.error("Run `npm run airdrop` to get devnet SOL.");
    process.exit(1);
  }

  // Build metadata — customize these values for your NFT
  const metadata = buildSafariMetadata({
    name: process.env.NFT_NAME || "Safari Lion #1",
    description:
      process.env.NFT_DESCRIPTION ||
      "A majestic lion from the Safari NFT collection on Solana.",
    imageUri:
      process.env.NFT_IMAGE_URI ||
      "https://arweave.net/placeholder-replace-with-your-image-uri",
    symbol: process.env.NFT_SYMBOL || "SAFARI",
    animal: "Lion",
    habitat: "Savanna",
    rarity: "Legendary",
    sellerFeeBasisPoints: parseInt(process.env.SELLER_FEE_BPS || "500"),
    creatorAddress: wallet.publicKey.toBase58(),
  });

  // Optional: set collection mint from env
  const collectionMint = process.env.COLLECTION_MINT
    ? new PublicKey(process.env.COLLECTION_MINT)
    : undefined;

  const result = await mintNft({
    connection,
    wallet,
    metadata,
    collectionMint,
    isDevnet,
  });

  console.log("\n--- Mint Summary ---");
  console.log(`Mint Address:  ${result.mintAddress}`);
  console.log(`Metadata URI:  ${result.metadataUri}`);
  console.log(`Explorer:      ${result.explorerUrl}`);
}

main().catch(console.error);
