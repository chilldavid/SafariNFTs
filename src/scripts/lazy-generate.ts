/**
 * Generate the lazy mint manifest (pre-compute all 10,000 NFT metadata).
 *
 * Usage:
 *   npm run lazy:generate
 */

import { loadConfig } from "../config";
import { loadWallet } from "../utils";
import { generateManifest, getManifestStats } from "../nft/lazy-mint";
import { printCollectionSummary } from "../nft/generate";

async function main() {
  const wallet = loadWallet();

  console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

  const bronzeUri = process.env.BRONZE_IMAGE_URI;
  const silverUri = process.env.SILVER_IMAGE_URI;
  const goldUri = process.env.GOLD_IMAGE_URI;

  if (!bronzeUri || !silverUri || !goldUri) {
    console.error(
      "Missing image URIs. Set BRONZE_IMAGE_URI, SILVER_IMAGE_URI, GOLD_IMAGE_URI in .env"
    );
    process.exit(1);
  }

  printCollectionSummary();

  const manifest = generateManifest({
    imageUris: { Bronze: bronzeUri, Silver: silverUri, Gold: goldUri },
    sellerFeeBasisPoints: parseInt(process.env.SELLER_FEE_BPS || "500"),
    creatorAddress: wallet.publicKey.toBase58(),
    externalUrl: process.env.EXTERNAL_URL,
  });

  const stats = getManifestStats(manifest);
  console.log(`\nManifest ready:`);
  console.log(`  Total:     ${stats.total}`);
  console.log(`  Available: ${stats.available}`);
  console.log(`  Minted:    ${stats.minted}`);
  console.log(`\nNow use "npm run lazy:claim -- <token-number>" to mint on demand.`);
}

main().catch(console.error);
