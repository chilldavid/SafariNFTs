/**
 * Mint the Safari NFT collection in batches.
 *
 * Usage:
 *   npm run mint:batch                    # mint all 10,000
 *   npm run mint:batch -- --from 1 --to 10   # mint tokens 1–10 only
 *   npm run mint:batch -- --dry-run       # preview without minting
 */

import { PublicKey } from "@solana/web3.js";
import { loadConfig } from "../config";
import { createConnection, loadWallet, getBalance } from "../utils";
import { createMetaplexWithStorage, uploadMetadata } from "../nft";
import { mintNft } from "../nft/mint";
import {
  generateCollectionMetadata,
  printCollectionSummary,
} from "../nft/generate";
import { TOTAL_SUPPLY } from "../nft/tiers";
import fs from "fs";
import path from "path";

function parseArgs(): { from: number; to: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let from = 1;
  let to = TOTAL_SUPPLY;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) {
      from = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--to" && args[i + 1]) {
      to = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { from, to, dryRun };
}

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadWallet();
  const isDevnet = config.cluster === "devnet";

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}`);

  const balance = await getBalance(connection, wallet);
  console.log(`Balance: ${balance} SOL`);

  printCollectionSummary();

  const { from, to, dryRun } = parseArgs();
  const count = to - from + 1;

  // Require image URIs per tier
  const bronzeUri = process.env.BRONZE_IMAGE_URI;
  const silverUri = process.env.SILVER_IMAGE_URI;
  const goldUri = process.env.GOLD_IMAGE_URI;

  if (!bronzeUri || !silverUri || !goldUri) {
    console.error(
      "\nMissing image URIs. Set these in your .env file:\n" +
        "  BRONZE_IMAGE_URI=https://...\n" +
        "  SILVER_IMAGE_URI=https://...\n" +
        "  GOLD_IMAGE_URI=https://...\n\n" +
        "Upload images first with: npm run upload -- ./assets/bronze.png"
    );
    process.exit(1);
  }

  const collectionMint = process.env.COLLECTION_MINT
    ? new PublicKey(process.env.COLLECTION_MINT)
    : undefined;

  if (!collectionMint) {
    console.warn(
      "\nWarning: COLLECTION_MINT not set. NFTs will not be linked to a collection.\n" +
        "Create one first with: npm run mint:collection\n"
    );
  }

  // Generate metadata for the requested range
  const items = generateCollectionMetadata({
    imageUris: {
      Bronze: bronzeUri,
      Silver: silverUri,
      Gold: goldUri,
    },
    sellerFeeBasisPoints: parseInt(process.env.SELLER_FEE_BPS || "500"),
    creatorAddress: wallet.publicKey.toBase58(),
    externalUrl: process.env.EXTERNAL_URL,
    fromToken: from,
    toToken: to,
  });

  console.log(`Minting tokens #${from} to #${to} (${count} NFTs)`);

  if (dryRun) {
    console.log("\n--- DRY RUN (no transactions) ---\n");
    for (const item of items.slice(0, 5)) {
      console.log(`  ${item.metadata.name}`);
      console.log(`    ${item.metadata.description}`);
      console.log(
        `    Attributes: ${item.metadata.attributes?.map((a) => `${a.trait_type}=${a.value}`).join(", ")}`
      );
      console.log("");
    }
    if (items.length > 5) {
      console.log(`  ... and ${items.length - 5} more.\n`);
    }
    console.log("Run without --dry-run to mint.");
    return;
  }

  // Estimate cost
  const estimatedCostPerNft = 0.015; // ~0.012 mint + ~0.003 upload
  const estimatedTotal = count * estimatedCostPerNft;
  console.log(
    `Estimated cost: ~${estimatedTotal.toFixed(2)} SOL (${count} x ~${estimatedCostPerNft} SOL)`
  );

  if (balance < estimatedTotal) {
    console.error(
      `\nInsufficient balance. You have ${balance} SOL but need ~${estimatedTotal.toFixed(2)} SOL.`
    );
    if (isDevnet) {
      console.error("Run: npm run airdrop -- 2   (to request more devnet SOL)");
    }
    process.exit(1);
  }

  // Create results log file
  const logDir = path.resolve("mint-results");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(
    logDir,
    `batch-${from}-${to}-${Date.now()}.json`
  );
  const results: Array<{
    tokenNumber: number;
    name: string;
    tier: string;
    mintAddress: string;
    metadataUri: string;
    explorerUrl: string;
  }> = [];

  const metaplex = createMetaplexWithStorage(connection, wallet, isDevnet);
  const delayMs = parseInt(process.env.MINT_DELAY_MS || "2000");

  console.log(`\nStarting mint (${delayMs}ms delay between mints)...\n`);

  let minted = 0;
  let failed = 0;

  for (const item of items) {
    const tierAttr = item.metadata.attributes?.find(
      (a) => a.trait_type === "Tier"
    );
    const tierName = tierAttr?.value || "Unknown";

    try {
      // Upload metadata
      const metadataUri = await uploadMetadata(metaplex, item.metadata);

      // Mint
      const result = await mintNft({
        connection,
        wallet,
        metadata: item.metadata,
        metadataUri,
        collectionMint,
        isDevnet,
      });

      results.push({
        tokenNumber: item.tokenNumber,
        name: item.metadata.name,
        tier: tierName,
        mintAddress: result.mintAddress,
        metadataUri: result.metadataUri,
        explorerUrl: result.explorerUrl,
      });

      minted++;
      console.log(
        `  [${minted + failed}/${count}] ${tierName.padEnd(6)} #${item.tokenNumber} => ${result.mintAddress}`
      );

      // Save progress after each mint
      fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
    } catch (err: any) {
      failed++;
      console.error(
        `  [${minted + failed}/${count}] FAILED #${item.tokenNumber}: ${err.message}`
      );
    }

    // Delay between mints
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\n=== Batch Complete ===`);
  console.log(`  Minted: ${minted}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Results saved to: ${logFile}`);
}

main().catch(console.error);
