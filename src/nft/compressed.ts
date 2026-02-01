/**
 * Compressed NFT (cNFT) minting using Metaplex Bubblegum.
 *
 * Compressed NFTs use Merkle trees to store NFT data on-chain at a fraction
 * of the cost of regular NFTs. A single Merkle tree can hold thousands of NFTs.
 *
 * Cost comparison for 10,000 NFTs:
 *   Regular:     ~150 SOL
 *   Compressed:  ~5 SOL (Merkle tree creation + minting)
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createUmi,
} from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity as umiKeypairIdentity,
  generateSigner,
  publicKey as umiPublicKey,
  none as umiNone,
  some as umiSome,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import {
  createTree,
  mintV1 as bubblegumMintV1,
  mintToCollectionV1,
  findTreeConfigPda,
} from "@metaplex-foundation/mpl-bubblegum";
import { NftMetadata } from "./metadata";

/**
 * Recommended tree sizes for different collection sizes:
 *
 * | Max NFTs | maxDepth | maxBufferSize | canopyDepth | ~Cost (SOL) |
 * |----------|----------|---------------|-------------|-------------|
 * | 1,000    | 14       | 64            | 11          | ~0.3        |
 * | 10,000   | 14       | 64            | 11          | ~0.3        |
 * | 100,000  | 17       | 64            | 14          | ~2.5        |
 * | 1,000,000| 20       | 256           | 15          | ~20         |
 *
 * maxDepth=14 supports up to 2^14 = 16,384 NFTs (enough for 10,000)
 */
export const TREE_PRESETS = {
  small: { maxDepth: 14, maxBufferSize: 64, canopyDepth: 11 },   // up to 16,384 NFTs
  medium: { maxDepth: 17, maxBufferSize: 64, canopyDepth: 14 },  // up to 131,072 NFTs
  large: { maxDepth: 20, maxBufferSize: 256, canopyDepth: 15 },  // up to 1,048,576 NFTs
} as const;

export type TreePreset = keyof typeof TREE_PRESETS;

/**
 * Create a UMI instance from a web3.js Connection and Keypair.
 */
function createUmiInstance(connection: Connection, wallet: Keypair) {
  const umi = createUmi(connection.rpcEndpoint);
  const umiKeypair = fromWeb3JsKeypair(wallet);
  umi.use(umiKeypairIdentity(umiKeypair));
  return umi;
}

export interface CreateMerkleTreeResult {
  treeAddress: string;
  treeCreator: string;
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth: number;
}

/**
 * Create a Merkle tree account for compressed NFTs.
 * This is a one-time setup step before minting cNFTs.
 */
export async function createMerkleTree(
  connection: Connection,
  wallet: Keypair,
  preset: TreePreset = "small"
): Promise<CreateMerkleTreeResult> {
  const { maxDepth, maxBufferSize, canopyDepth } = TREE_PRESETS[preset];

  console.log(`Creating Merkle tree (${preset} preset)...`);
  console.log(`  maxDepth: ${maxDepth} (up to ${Math.pow(2, maxDepth).toLocaleString()} NFTs)`);
  console.log(`  maxBufferSize: ${maxBufferSize}`);
  console.log(`  canopyDepth: ${canopyDepth}`);

  const umi = createUmiInstance(connection, wallet);
  const merkleTree = generateSigner(umi);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth,
    maxBufferSize,
    canopyDepth,
  });

  await builder.sendAndConfirm(umi);

  const treeAddress = merkleTree.publicKey.toString();
  console.log(`\nMerkle tree created!`);
  console.log(`  Address: ${treeAddress}`);

  return {
    treeAddress,
    treeCreator: wallet.publicKey.toBase58(),
    maxDepth,
    maxBufferSize,
    canopyDepth,
  };
}

export interface MintCompressedNftParams {
  connection: Connection;
  wallet: Keypair;
  treeAddress: string;
  metadata: NftMetadata;
  /** Collection NFT address (optional but recommended) */
  collectionMint?: string;
}

export interface MintCompressedResult {
  signature: string;
  treeAddress: string;
  leafIndex: number;
}

/**
 * Mint a single compressed NFT into a Merkle tree.
 * Cost: ~0.000005 SOL per mint (just the transaction fee).
 */
export async function mintCompressedNft(
  params: MintCompressedNftParams
): Promise<MintCompressedResult> {
  const { connection, wallet, treeAddress, metadata, collectionMint } = params;
  const umi = createUmiInstance(connection, wallet);
  const merkleTree = umiPublicKey(treeAddress);

  const creators = metadata.properties?.creators?.map((c) => ({
    address: umiPublicKey(c.address),
    verified: false,
    share: c.share,
  })) ?? [{
    address: fromWeb3JsPublicKey(wallet.publicKey),
    verified: false,
    share: 100,
  }];

  if (collectionMint) {
    const result = await mintToCollectionV1(umi, {
      leafOwner: fromWeb3JsPublicKey(wallet.publicKey),
      merkleTree,
      collectionMint: umiPublicKey(collectionMint),
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol || "SAFARI",
        uri: metadata.image, // For cNFTs, this should be the metadata JSON URI
        sellerFeeBasisPoints: metadata.seller_fee_basis_points ?? 500,
        collection: { key: umiPublicKey(collectionMint), verified: false },
        creators,
      },
    }).sendAndConfirm(umi);

    return {
      signature: Buffer.from(result.signature).toString("base64"),
      treeAddress,
      leafIndex: -1, // Can be parsed from transaction logs
    };
  }

  const result = await bubblegumMintV1(umi, {
    leafOwner: fromWeb3JsPublicKey(wallet.publicKey),
    merkleTree,
    metadata: {
      name: metadata.name,
      symbol: metadata.symbol || "SAFARI",
      uri: metadata.image,
      sellerFeeBasisPoints: metadata.seller_fee_basis_points ?? 500,
      collection: umiNone(),
      creators,
    },
  }).sendAndConfirm(umi);

  return {
    signature: Buffer.from(result.signature).toString("base64"),
    treeAddress,
    leafIndex: -1,
  };
}

/**
 * Mint a batch of compressed NFTs.
 */
export async function mintCompressedBatch(
  connection: Connection,
  wallet: Keypair,
  treeAddress: string,
  items: NftMetadata[],
  options: {
    collectionMint?: string;
    delayMs?: number;
  } = {}
): Promise<{ minted: number; failed: number }> {
  const { collectionMint, delayMs = 500 } = options;
  let minted = 0;
  let failed = 0;

  console.log(`\nMinting ${items.length} compressed NFTs into tree ${treeAddress}...\n`);

  for (let i = 0; i < items.length; i++) {
    try {
      await mintCompressedNft({
        connection,
        wallet,
        treeAddress,
        metadata: items[i],
        collectionMint,
      });

      minted++;
      console.log(`  [${i + 1}/${items.length}] Minted: ${items[i].name}`);
    } catch (err: any) {
      failed++;
      console.error(`  [${i + 1}/${items.length}] FAILED: ${items[i].name} — ${err.message}`);
    }

    if (delayMs > 0 && i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\nCompressed batch complete: ${minted} minted, ${failed} failed.`);
  return { minted, failed };
}
