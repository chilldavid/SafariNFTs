import {
  Metaplex,
  keypairIdentity,
  Nft,
  NftWithToken,
} from "@metaplex-foundation/js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NftMetadata, validateMetadata } from "./metadata";
import { createMetaplexWithStorage, uploadMetadata } from "./upload";

export interface MintNftParams {
  connection: Connection;
  wallet: Keypair;
  metadata: NftMetadata;
  /** Pre-uploaded metadata URI. If not provided, metadata will be uploaded first. */
  metadataUri?: string;
  /** Whether to make the NFT immutable after minting */
  isMutable?: boolean;
  /** Collection NFT address to verify against */
  collectionMint?: PublicKey;
  /** Use devnet Bundlr (default: true) */
  isDevnet?: boolean;
}

export interface MintResult {
  nft: Nft | NftWithToken;
  mintAddress: string;
  metadataUri: string;
  explorerUrl: string;
}

/**
 * Mint a single NFT on Solana using Metaplex.
 */
export async function mintNft(params: MintNftParams): Promise<MintResult> {
  const {
    connection,
    wallet,
    metadata,
    isMutable = true,
    collectionMint,
    isDevnet = true,
  } = params;

  // Validate metadata
  const errors = validateMetadata(metadata);
  if (errors.length > 0) {
    throw new Error(`Invalid metadata:\n${errors.join("\n")}`);
  }

  const metaplex = createMetaplexWithStorage(connection, wallet, isDevnet);

  // Upload metadata if no URI was provided
  let metadataUri = params.metadataUri;
  if (!metadataUri) {
    metadataUri = await uploadMetadata(metaplex, metadata);
  }

  console.log(`Minting NFT: ${metadata.name}...`);

  const createInput: Parameters<ReturnType<typeof metaplex.nfts>["create"]>[0] = {
    uri: metadataUri,
    name: metadata.name,
    symbol: metadata.symbol,
    sellerFeeBasisPoints: metadata.seller_fee_basis_points ?? 500,
    isMutable,
  };

  if (collectionMint) {
    createInput.collection = collectionMint;
  }

  const { nft } = await metaplex.nfts().create(createInput);

  const cluster = isDevnet ? "?cluster=devnet" : "";
  const explorerUrl = `https://explorer.solana.com/address/${nft.address.toBase58()}${cluster}`;

  console.log(`NFT minted successfully!`);
  console.log(`  Mint address: ${nft.address.toBase58()}`);
  console.log(`  Metadata URI: ${metadataUri}`);
  console.log(`  Explorer: ${explorerUrl}`);

  return {
    nft,
    mintAddress: nft.address.toBase58(),
    metadataUri,
    explorerUrl,
  };
}

/**
 * Mint multiple NFTs in sequence.
 */
export async function mintBatch(
  connection: Connection,
  wallet: Keypair,
  items: Array<{ metadata: NftMetadata; metadataUri?: string }>,
  options: {
    isMutable?: boolean;
    collectionMint?: PublicKey;
    isDevnet?: boolean;
    delayMs?: number;
  } = {}
): Promise<MintResult[]> {
  const results: MintResult[] = [];
  const { delayMs = 1000, ...mintOptions } = options;

  console.log(`\nMinting batch of ${items.length} NFTs...\n`);

  for (let i = 0; i < items.length; i++) {
    console.log(`[${i + 1}/${items.length}] Minting: ${items[i].metadata.name}`);

    const result = await mintNft({
      connection,
      wallet,
      metadata: items[i].metadata,
      metadataUri: items[i].metadataUri,
      ...mintOptions,
    });

    results.push(result);

    // Delay between mints to avoid rate limiting
    if (i < items.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\nBatch minting complete! ${results.length} NFTs minted.`);
  return results;
}
