import { loadConfig } from "../config";
import { createConnection, loadWallet } from "../utils";
import {
  buildSafariMetadata,
  createMetaplexWithStorage,
  uploadImageAndMetadata,
  uploadMetadata,
} from "../nft";
import path from "path";
import fs from "fs";

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadWallet();
  const isDevnet = config.cluster === "devnet";

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}\n`);

  const metaplex = createMetaplexWithStorage(connection, wallet, isDevnet);

  const imagePath = process.argv[2];

  if (imagePath) {
    // Upload image + metadata
    const resolvedPath = path.resolve(imagePath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Image file not found: ${resolvedPath}`);
      process.exit(1);
    }

    console.log(`Uploading image and metadata...`);

    const metadataWithoutImage = {
      name: process.env.NFT_NAME || "Safari NFT",
      symbol: process.env.NFT_SYMBOL || "SAFARI",
      description:
        process.env.NFT_DESCRIPTION || "A safari-themed NFT on Solana.",
      seller_fee_basis_points: parseInt(process.env.SELLER_FEE_BPS || "500"),
      attributes: [
        { trait_type: "Animal", value: "Lion" },
        { trait_type: "Habitat", value: "Savanna" },
      ],
    };

    const { imageUri, metadataUri } = await uploadImageAndMetadata(
      metaplex,
      resolvedPath,
      metadataWithoutImage
    );

    console.log(`\nImage URI:    ${imageUri}`);
    console.log(`Metadata URI: ${metadataUri}`);
    console.log(`\nUse this metadata URI when minting:`);
    console.log(`  NFT_IMAGE_URI=${imageUri}`);
  } else {
    // Upload metadata only (with a placeholder/existing image URI)
    const metadata = buildSafariMetadata({
      name: process.env.NFT_NAME || "Safari NFT",
      description:
        process.env.NFT_DESCRIPTION || "A safari-themed NFT on Solana.",
      imageUri:
        process.env.NFT_IMAGE_URI ||
        "https://arweave.net/placeholder-replace-with-your-image-uri",
      symbol: process.env.NFT_SYMBOL || "SAFARI",
      animal: "Lion",
      habitat: "Savanna",
      rarity: "Rare",
      creatorAddress: wallet.publicKey.toBase58(),
    });

    const metadataUri = await uploadMetadata(metaplex, metadata);

    console.log(`Metadata URI: ${metadataUri}`);
  }
}

main().catch(console.error);
