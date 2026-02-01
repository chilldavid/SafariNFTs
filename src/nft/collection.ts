import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Nft, NftWithToken } from "@metaplex-foundation/js";
import { createMetaplexWithStorage, uploadMetadata } from "./upload";
import { NftMetadata, validateMetadata } from "./metadata";

export interface CreateCollectionParams {
  connection: Connection;
  wallet: Keypair;
  name: string;
  symbol?: string;
  description: string;
  imageUri: string;
  sellerFeeBasisPoints?: number;
  externalUrl?: string;
  isDevnet?: boolean;
  isMutable?: boolean;
}

export interface CollectionResult {
  collectionNft: Nft | NftWithToken;
  collectionAddress: string;
  metadataUri: string;
  explorerUrl: string;
}

/**
 * Create a Collection NFT on Solana.
 * Collection NFTs are special NFTs that other NFTs can reference to form a verified collection.
 */
export async function createCollection(
  params: CreateCollectionParams
): Promise<CollectionResult> {
  const {
    connection,
    wallet,
    name,
    symbol = "SAFARI",
    description,
    imageUri,
    sellerFeeBasisPoints = 500,
    externalUrl,
    isDevnet = true,
    isMutable = true,
  } = params;

  const metaplex = createMetaplexWithStorage(connection, wallet, isDevnet);

  const metadata: NftMetadata = {
    name,
    symbol,
    description,
    image: imageUri,
    external_url: externalUrl,
    seller_fee_basis_points: sellerFeeBasisPoints,
    properties: {
      files: [{ uri: imageUri, type: "image/png" }],
      category: "image",
    },
  };

  const errors = validateMetadata(metadata);
  if (errors.length > 0) {
    throw new Error(`Invalid collection metadata:\n${errors.join("\n")}`);
  }

  console.log(`Creating collection: ${name}...`);

  const metadataUri = await uploadMetadata(metaplex, metadata);

  const { nft: collectionNft } = await metaplex.nfts().create({
    uri: metadataUri,
    name,
    symbol,
    sellerFeeBasisPoints,
    isCollection: true,
    isMutable,
  });

  const cluster = isDevnet ? "?cluster=devnet" : "";
  const explorerUrl = `https://explorer.solana.com/address/${collectionNft.address.toBase58()}${cluster}`;

  console.log(`Collection created!`);
  console.log(`  Address: ${collectionNft.address.toBase58()}`);
  console.log(`  Explorer: ${explorerUrl}`);

  return {
    collectionNft,
    collectionAddress: collectionNft.address.toBase58(),
    metadataUri,
    explorerUrl,
  };
}

/**
 * Verify that an NFT belongs to a collection.
 * Must be called by the collection's update authority.
 */
export async function verifyNftInCollection(
  connection: Connection,
  wallet: Keypair,
  nftAddress: PublicKey,
  collectionMintAddress: PublicKey,
  isDevnet: boolean = true
): Promise<void> {
  const metaplex = createMetaplexWithStorage(connection, wallet, isDevnet);

  console.log(`Verifying NFT ${nftAddress.toBase58()} in collection...`);

  const nft = await metaplex.nfts().findByMint({ mintAddress: nftAddress });

  await metaplex.nfts().verifyCollection({
    mintAddress: nftAddress,
    collectionMintAddress,
  });

  console.log(`NFT verified in collection!`);
}
