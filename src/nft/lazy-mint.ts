/**
 * Lazy minting system for the Safari NFT collection.
 *
 * Instead of minting all 10,000 NFTs upfront, this system:
 * 1. Pre-generates all metadata and saves it to a manifest file
 * 2. Mints individual NFTs on demand (e.g. when a buyer purchases)
 *
 * This saves the upfront cost of minting — you only pay when someone claims.
 */

import fs from "fs";
import path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NftMetadata } from "./metadata";
import {
  generateCollectionMetadata,
  GenerateCollectionParams,
} from "./generate";
import { mintNft } from "./mint";
import { mintCompressedNft } from "./compressed";

export interface ManifestEntry {
  tokenNumber: number;
  metadata: NftMetadata;
  status: "available" | "minted";
  mintAddress?: string;
  mintedAt?: string;
  owner?: string;
}

export interface Manifest {
  collectionName: string;
  totalSupply: number;
  generated: string;
  entries: ManifestEntry[];
}

const DEFAULT_MANIFEST_PATH = path.resolve("manifest.json");

/**
 * Generate a manifest file containing metadata for all NFTs.
 * This is the first step in lazy minting — pre-compute everything.
 */
export function generateManifest(
  params: GenerateCollectionParams,
  outputPath: string = DEFAULT_MANIFEST_PATH
): Manifest {
  const items = generateCollectionMetadata(params);

  const manifest: Manifest = {
    collectionName: "Safari NFTs",
    totalSupply: items.length,
    generated: new Date().toISOString(),
    entries: items.map((item) => ({
      tokenNumber: item.tokenNumber,
      metadata: item.metadata,
      status: "available" as const,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest saved to ${outputPath} (${items.length} entries)`);

  return manifest;
}

/**
 * Load an existing manifest file.
 */
export function loadManifest(
  manifestPath: string = DEFAULT_MANIFEST_PATH
): Manifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Manifest not found at ${manifestPath}.\n` +
        "Generate one first with: npm run lazy:generate"
    );
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as Manifest;
}

/**
 * Save manifest back to disk (after minting updates).
 */
function saveManifest(
  manifest: Manifest,
  manifestPath: string = DEFAULT_MANIFEST_PATH
): void {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Get stats about the manifest.
 */
export function getManifestStats(manifest: Manifest): {
  total: number;
  available: number;
  minted: number;
} {
  const minted = manifest.entries.filter((e) => e.status === "minted").length;
  return {
    total: manifest.totalSupply,
    available: manifest.totalSupply - minted,
    minted,
  };
}

/**
 * Claim/mint a specific token by number.
 * Uses regular NFT minting (not compressed).
 */
export async function claimToken(
  connection: Connection,
  wallet: Keypair,
  tokenNumber: number,
  options: {
    manifestPath?: string;
    collectionMint?: PublicKey;
    isDevnet?: boolean;
    owner?: string;
  } = {}
): Promise<ManifestEntry> {
  const {
    manifestPath = DEFAULT_MANIFEST_PATH,
    collectionMint,
    isDevnet = true,
    owner,
  } = options;

  const manifest = loadManifest(manifestPath);
  const entry = manifest.entries.find((e) => e.tokenNumber === tokenNumber);

  if (!entry) {
    throw new Error(`Token #${tokenNumber} not found in manifest.`);
  }
  if (entry.status === "minted") {
    throw new Error(
      `Token #${tokenNumber} already minted: ${entry.mintAddress}`
    );
  }

  console.log(`Claiming token #${tokenNumber}: ${entry.metadata.name}`);

  const result = await mintNft({
    connection,
    wallet,
    metadata: entry.metadata,
    collectionMint,
    isDevnet,
  });

  entry.status = "minted";
  entry.mintAddress = result.mintAddress;
  entry.mintedAt = new Date().toISOString();
  entry.owner = owner || wallet.publicKey.toBase58();

  saveManifest(manifest, manifestPath);

  return entry;
}

/**
 * Claim/mint a specific token as a compressed NFT.
 */
export async function claimTokenCompressed(
  connection: Connection,
  wallet: Keypair,
  tokenNumber: number,
  treeAddress: string,
  options: {
    manifestPath?: string;
    collectionMint?: string;
    owner?: string;
  } = {}
): Promise<ManifestEntry> {
  const { manifestPath = DEFAULT_MANIFEST_PATH, collectionMint, owner } =
    options;

  const manifest = loadManifest(manifestPath);
  const entry = manifest.entries.find((e) => e.tokenNumber === tokenNumber);

  if (!entry) {
    throw new Error(`Token #${tokenNumber} not found in manifest.`);
  }
  if (entry.status === "minted") {
    throw new Error(
      `Token #${tokenNumber} already minted: ${entry.mintAddress}`
    );
  }

  console.log(
    `Claiming token #${tokenNumber} (compressed): ${entry.metadata.name}`
  );

  const result = await mintCompressedNft({
    connection,
    wallet,
    treeAddress,
    metadata: entry.metadata,
    collectionMint,
  });

  entry.status = "minted";
  entry.mintAddress = `tree:${treeAddress}`;
  entry.mintedAt = new Date().toISOString();
  entry.owner = owner || wallet.publicKey.toBase58();

  saveManifest(manifest, manifestPath);

  return entry;
}

/**
 * Get the next available token number.
 */
export function getNextAvailable(manifest: Manifest): number | null {
  const entry = manifest.entries.find((e) => e.status === "available");
  return entry ? entry.tokenNumber : null;
}

/**
 * Get the next available token in a specific tier.
 */
export function getNextAvailableInTier(
  manifest: Manifest,
  tier: string
): number | null {
  const entry = manifest.entries.find(
    (e) =>
      e.status === "available" &&
      e.metadata.attributes?.some(
        (a) => a.trait_type === "Tier" && a.value === tier
      )
  );
  return entry ? entry.tokenNumber : null;
}
