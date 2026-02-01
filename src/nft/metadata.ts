/**
 * NFT metadata types and helpers following Metaplex Token Metadata standard.
 * Reference: https://docs.metaplex.com/programs/token-metadata/overview
 */

export interface NftAttribute {
  trait_type: string;
  value: string;
}

export interface NftCreator {
  address: string;
  share: number; // percentage (0-100), all creators must sum to 100
}

export interface NftMetadata {
  name: string;
  symbol: string;
  description: string;
  /** URI to the image (HTTPS or Arweave) */
  image: string;
  /** URI to an optional animation file */
  animation_url?: string;
  /** External URL for the NFT (e.g. project website) */
  external_url?: string;
  attributes?: NftAttribute[];
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
    creators?: NftCreator[];
  };
  /** Seller fee basis points (e.g. 500 = 5% royalty) */
  seller_fee_basis_points?: number;
  /** Optional collection info */
  collection?: {
    name: string;
    family?: string;
  };
}

/**
 * Build a metadata JSON object for a Safari-themed NFT.
 */
export function buildSafariMetadata(params: {
  name: string;
  symbol?: string;
  description: string;
  imageUri: string;
  animal?: string;
  habitat?: string;
  rarity?: string;
  sellerFeeBasisPoints?: number;
  creatorAddress?: string;
  externalUrl?: string;
}): NftMetadata {
  const attributes: NftAttribute[] = [];

  if (params.animal) {
    attributes.push({ trait_type: "Animal", value: params.animal });
  }
  if (params.habitat) {
    attributes.push({ trait_type: "Habitat", value: params.habitat });
  }
  if (params.rarity) {
    attributes.push({ trait_type: "Rarity", value: params.rarity });
  }

  const metadata: NftMetadata = {
    name: params.name,
    symbol: params.symbol || "SAFARI",
    description: params.description,
    image: params.imageUri,
    external_url: params.externalUrl,
    attributes,
    seller_fee_basis_points: params.sellerFeeBasisPoints ?? 500,
    properties: {
      files: [
        {
          uri: params.imageUri,
          type: "image/png",
        },
      ],
      category: "image",
      creators: params.creatorAddress
        ? [{ address: params.creatorAddress, share: 100 }]
        : undefined,
    },
    collection: {
      name: "Safari NFTs",
    },
  };

  return metadata;
}

/**
 * Validate metadata has the required fields for on-chain minting.
 */
export function validateMetadata(metadata: NftMetadata): string[] {
  const errors: string[] = [];

  if (!metadata.name || metadata.name.length === 0) {
    errors.push("Name is required");
  }
  if (metadata.name && metadata.name.length > 32) {
    errors.push("Name must be 32 characters or fewer");
  }
  if (!metadata.symbol || metadata.symbol.length === 0) {
    errors.push("Symbol is required");
  }
  if (metadata.symbol && metadata.symbol.length > 10) {
    errors.push("Symbol must be 10 characters or fewer");
  }
  if (!metadata.image) {
    errors.push("Image URI is required");
  }
  if (
    metadata.seller_fee_basis_points !== undefined &&
    (metadata.seller_fee_basis_points < 0 ||
      metadata.seller_fee_basis_points > 10000)
  ) {
    errors.push("Seller fee must be between 0 and 10000 basis points");
  }

  return errors;
}
