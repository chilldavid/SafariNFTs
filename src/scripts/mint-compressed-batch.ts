/**
 * Mint compressed NFTs into a Merkle tree.
 *
 * Usage:
 *   npm run cnft:mint                          # mint all 10,000
 *   npm run cnft:mint -- --from 1 --to 100     # mint tokens 1–100
 *   npm run cnft:mint -- --dry-run             # preview
 */

import { loadConfig } from "../config";
import { createConnection, loadWallet, getBalance } from "../utils";
import {
  generateCollectionMetadata,
  printCollectionSummary,
} from "../nft/generate";
import { mintCompressedBatch } from "../nft/compressed";
import { TOTAL_SUPPLY } from "../nft/tiers";
import fs from "fs";
import path from "path";

function parseArgs(): { from: number; to: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let from = 1;
  let to = TOTAL_SUPPLY;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) { from = parseInt(args[i + 1]); i++; }
    else if (args[i] === "--to" && args[i + 1]) { to = parseInt(args[i + 1]); i++; }
    else if (args[i] === "--dry-run") { dryRun = true; }
  }

  return { from, to, dryRun };
}

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadWallet();

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}`);

  const balance = await getBalance(connection, wallet);
  console.log(`Balance: ${balance} SOL`);

  printCollectionSummary();

  const treeAddress = process.env.MERKLE_TREE_ADDRESS;
  if (!treeAddress) {
    console.error(
      "MERKLE_TREE_ADDRESS not set in .env.\n" +
        "Create a tree first with: npm run cnft:tree"
    );
    process.exit(1);
  }

  const bronzeUri = process.env.BRONZE_IMAGE_URI;
  const silverUri = process.env.SILVER_IMAGE_URI;
  const goldUri = process.env.GOLD_IMAGE_URI;

  if (!bronzeUri || !silverUri || !goldUri) {
    console.error(
      "Missing image URIs. Set BRONZE_IMAGE_URI, SILVER_IMAGE_URI, GOLD_IMAGE_URI in .env"
    );
    process.exit(1);
  }

  const { from, to, dryRun } = parseArgs();
  const count = to - from + 1;

  const items = generateCollectionMetadata({
    imageUris: { Bronze: bronzeUri, Silver: silverUri, Gold: goldUri },
    sellerFeeBasisPoints: parseInt(process.env.SELLER_FEE_BPS || "500"),
    creatorAddress: wallet.publicKey.toBase58(),
    externalUrl: process.env.EXTERNAL_URL,
    fromToken: from,
    toToken: to,
  });

  console.log(`Minting ${count} compressed NFTs into tree ${treeAddress}`);

  if (dryRun) {
    console.log("\n--- DRY RUN ---\n");
    for (const item of items.slice(0, 5)) {
      console.log(`  ${item.metadata.name}`);
    }
    if (items.length > 5) console.log(`  ... and ${items.length - 5} more.`);
    console.log(`\nEstimated cost: ~${(count * 0.000005).toFixed(4)} SOL (tx fees only)`);
    console.log("Run without --dry-run to mint.");
    return;
  }

  const collectionMint = process.env.COLLECTION_MINT;
  const delayMs = parseInt(process.env.MINT_DELAY_MS || "500");

  const result = await mintCompressedBatch(
    connection,
    wallet,
    treeAddress,
    items.map((i) => i.metadata),
    { collectionMint, delayMs }
  );

  console.log(`\nDone! ${result.minted} compressed NFTs minted.`);
}

main().catch(console.error);
