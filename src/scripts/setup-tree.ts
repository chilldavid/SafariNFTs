/**
 * Create a Merkle tree for compressed NFT minting.
 *
 * Usage:
 *   npm run cnft:tree                # create tree (small preset, up to 16k NFTs)
 *   npm run cnft:tree -- --preset medium  # for up to 131k NFTs
 */

import { loadConfig } from "../config";
import { createConnection, loadWallet, getBalance } from "../utils";
import { createMerkleTree, TREE_PRESETS, TreePreset } from "../nft/compressed";

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadWallet();

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}`);

  const balance = await getBalance(connection, wallet);
  console.log(`Balance: ${balance} SOL\n`);

  // Parse preset from args
  const args = process.argv.slice(2);
  let preset: TreePreset = "small";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--preset" && args[i + 1]) {
      preset = args[i + 1] as TreePreset;
      if (!TREE_PRESETS[preset]) {
        console.error(`Invalid preset: ${preset}. Use: small, medium, large`);
        process.exit(1);
      }
    }
  }

  const result = await createMerkleTree(connection, wallet, preset);

  console.log(`\nAdd this to your .env file:`);
  console.log(`  MERKLE_TREE_ADDRESS=${result.treeAddress}`);
}

main().catch(console.error);
