/**
 * Claim (lazy mint) a specific NFT by token number.
 *
 * Usage:
 *   npm run lazy:claim -- 1                   # mint token #1 as regular NFT
 *   npm run lazy:claim -- 9501                # mint token #9501 (Gold!)
 *   npm run lazy:claim -- 42 --compressed     # mint as compressed NFT
 *   npm run lazy:claim -- --next              # mint the next available token
 *   npm run lazy:claim -- --next --tier Gold  # mint next available Gold token
 *   npm run lazy:claim -- --stats             # show manifest stats
 */

import { PublicKey } from "@solana/web3.js";
import { loadConfig } from "../config";
import { createConnection, loadWallet, getBalance } from "../utils";
import {
  loadManifest,
  getManifestStats,
  getNextAvailable,
  getNextAvailableInTier,
  claimToken,
  claimTokenCompressed,
} from "../nft/lazy-mint";

function parseArgs(): {
  tokenNumber: number | null;
  compressed: boolean;
  next: boolean;
  tier: string | null;
  stats: boolean;
} {
  const args = process.argv.slice(2);
  let tokenNumber: number | null = null;
  let compressed = false;
  let next = false;
  let tier: string | null = null;
  let stats = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--compressed") compressed = true;
    else if (args[i] === "--next") next = true;
    else if (args[i] === "--tier" && args[i + 1]) { tier = args[i + 1]; i++; }
    else if (args[i] === "--stats") stats = true;
    else if (!isNaN(parseInt(args[i]))) tokenNumber = parseInt(args[i]);
  }

  return { tokenNumber, compressed, next, tier, stats };
}

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadWallet();
  const isDevnet = config.cluster === "devnet";

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}`);

  const balance = await getBalance(connection, wallet);
  console.log(`Balance: ${balance} SOL\n`);

  const { tokenNumber, compressed, next, tier, stats } = parseArgs();

  const manifest = loadManifest();
  const manifestStats = getManifestStats(manifest);

  if (stats) {
    console.log(`=== Manifest Stats ===`);
    console.log(`  Total:     ${manifestStats.total}`);
    console.log(`  Available: ${manifestStats.available}`);
    console.log(`  Minted:    ${manifestStats.minted}`);

    // Per-tier stats
    const tiers = ["Bronze", "Silver", "Gold"];
    for (const t of tiers) {
      const tierEntries = manifest.entries.filter((e) =>
        e.metadata.attributes?.some(
          (a) => a.trait_type === "Tier" && a.value === t
        )
      );
      const tierMinted = tierEntries.filter((e) => e.status === "minted").length;
      console.log(`  ${t}: ${tierMinted}/${tierEntries.length} minted`);
    }
    return;
  }

  // Determine which token to mint
  let target: number;

  if (next) {
    const nextToken = tier
      ? getNextAvailableInTier(manifest, tier)
      : getNextAvailable(manifest);
    if (nextToken === null) {
      console.log(tier ? `No available ${tier} tokens.` : "All tokens minted!");
      return;
    }
    target = nextToken;
  } else if (tokenNumber !== null) {
    target = tokenNumber;
  } else {
    console.error(
      "Specify a token number or use --next.\n" +
        "  npm run lazy:claim -- 1\n" +
        "  npm run lazy:claim -- --next\n" +
        "  npm run lazy:claim -- --next --tier Gold\n" +
        "  npm run lazy:claim -- --stats"
    );
    process.exit(1);
  }

  if (compressed) {
    const treeAddress = process.env.MERKLE_TREE_ADDRESS;
    if (!treeAddress) {
      console.error("MERKLE_TREE_ADDRESS not set. Create a tree first: npm run cnft:tree");
      process.exit(1);
    }

    const entry = await claimTokenCompressed(
      connection,
      wallet,
      target,
      treeAddress,
      { collectionMint: process.env.COLLECTION_MINT }
    );

    console.log(`\nClaimed (compressed) #${entry.tokenNumber}: ${entry.metadata.name}`);
  } else {
    const collectionMint = process.env.COLLECTION_MINT
      ? new PublicKey(process.env.COLLECTION_MINT)
      : undefined;

    const entry = await claimToken(connection, wallet, target, {
      collectionMint,
      isDevnet,
    });

    console.log(`\nClaimed #${entry.tokenNumber}: ${entry.metadata.name}`);
    console.log(`  Mint: ${entry.mintAddress}`);
  }

  // Show updated stats
  const updated = getManifestStats(loadManifest());
  console.log(`\nRemaining: ${updated.available}/${updated.total}`);
}

main().catch(console.error);
