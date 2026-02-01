/**
 * Generate metadata JSON for all 10,000 NFTs across the three tiers.
 */

import { NftMetadata } from "./metadata";
import {
  TIERS,
  TOTAL_SUPPLY,
  COLLECTION_NAME,
  COLLECTION_SYMBOL,
  getTierForToken,
} from "./tiers";

export interface GenerateCollectionParams {
  /** Base image URI per tier — e.g. { Bronze: "https://...", Silver: "https://...", Gold: "https://..." } */
  imageUris: Record<string, string>;
  /** Seller fee in basis points (default 500 = 5%) */
  sellerFeeBasisPoints?: number;
  /** Creator wallet address */
  creatorAddress?: string;
  /** External project URL */
  externalUrl?: string;
  /** Optional: generate only a range (1-indexed, inclusive) */
  fromToken?: number;
  toToken?: number;
}

/**
 * Generate metadata for the full 10,000-NFT collection (or a subset).
 * Returns an array of { tokenNumber, metadata } objects.
 */
export function generateCollectionMetadata(
  params: GenerateCollectionParams
): Array<{ tokenNumber: number; metadata: NftMetadata }> {
  const {
    imageUris,
    sellerFeeBasisPoints = 500,
    creatorAddress,
    externalUrl,
    fromToken = 1,
    toToken = TOTAL_SUPPLY,
  } = params;

  const results: Array<{ tokenNumber: number; metadata: NftMetadata }> = [];

  for (let i = fromToken; i <= toToken; i++) {
    const tier = getTierForToken(i);
    const imageUri = imageUris[tier.name];

    if (!imageUri) {
      throw new Error(
        `Missing image URI for tier "${tier.name}". ` +
          `Provide imageUris.${tier.name} in params.`
      );
    }

    const paddedNumber = String(i).padStart(5, "0");
    const name = `${COLLECTION_NAME} ${tier.name} #${paddedNumber}`;

    const attributes = Object.entries(tier.attributes).map(
      ([trait_type, value]) => ({ trait_type, value })
    );
    attributes.push({ trait_type: "Number", value: String(i) });

    const metadata: NftMetadata = {
      name,
      symbol: COLLECTION_SYMBOL,
      description: tier.description,
      image: imageUri,
      external_url: externalUrl,
      seller_fee_basis_points: sellerFeeBasisPoints,
      attributes,
      properties: {
        files: [{ uri: imageUri, type: "image/png" }],
        category: "image",
        creators: creatorAddress
          ? [{ address: creatorAddress, share: 100 }]
          : undefined,
      },
      collection: {
        name: COLLECTION_NAME,
      },
    };

    results.push({ tokenNumber: i, metadata });
  }

  return results;
}

/**
 * Print a summary of what will be generated.
 */
export function printCollectionSummary(): void {
  console.log(`\n=== ${COLLECTION_NAME} Collection ===`);
  console.log(`Total supply: ${TOTAL_SUPPLY.toLocaleString()}\n`);

  let start = 1;
  for (const tier of TIERS) {
    const end = start + tier.supply - 1;
    const pct = ((tier.supply / TOTAL_SUPPLY) * 100).toFixed(0);
    console.log(
      `  ${tier.name.padEnd(8)} ${tier.supply.toLocaleString().padStart(6)} NFTs  ` +
        `(${pct}%)  #${String(start).padStart(5, "0")} – #${String(end).padStart(5, "0")}  ` +
        `[${tier.attributes.Rarity}]`
    );
    start = end + 1;
  }
  console.log("");
}
