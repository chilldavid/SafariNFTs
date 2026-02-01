/**
 * NFT tier definitions for the Safari collection.
 *
 * Total supply: 10,000
 *   - Bronze: 7,000 (70%)
 *   - Silver: 2,500 (25%)
 *   - Gold:     500  (5%)
 */

export interface NftTier {
  name: string;
  supply: number;
  description: string;
  attributes: Record<string, string>;
}

export const COLLECTION_NAME = "Safari NFTs";
export const COLLECTION_SYMBOL = "SAFARI";
export const TOTAL_SUPPLY = 10_000;

export const TIERS: NftTier[] = [
  {
    name: "Bronze",
    supply: 7_000,
    description: "A common Safari creature roaming the wild plains.",
    attributes: {
      Tier: "Bronze",
      Rarity: "Common",
    },
  },
  {
    name: "Silver",
    supply: 2_500,
    description: "A rare Safari creature with a silver sheen, seldom seen by travelers.",
    attributes: {
      Tier: "Silver",
      Rarity: "Rare",
    },
  },
  {
    name: "Gold",
    supply: 500,
    description: "A legendary Safari creature, gilded and mythical. Only 500 exist.",
    attributes: {
      Tier: "Gold",
      Rarity: "Legendary",
    },
  },
];

/**
 * Get the tier for a given token number (1-indexed).
 * Tokens 1–7000 = Bronze, 7001–9500 = Silver, 9501–10000 = Gold.
 */
export function getTierForToken(tokenNumber: number): NftTier {
  let cumulative = 0;
  for (const tier of TIERS) {
    cumulative += tier.supply;
    if (tokenNumber <= cumulative) {
      return tier;
    }
  }
  throw new Error(`Token number ${tokenNumber} exceeds total supply of ${TOTAL_SUPPLY}`);
}
