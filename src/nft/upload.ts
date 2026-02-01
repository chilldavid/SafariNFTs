import { Metaplex, keypairIdentity, irysStorage, toMetaplexFile } from "@metaplex-foundation/js";
import { Connection, Keypair } from "@solana/web3.js";
import { NftMetadata } from "./metadata";
import fs from "fs";
import path from "path";

/**
 * Create a Metaplex instance configured with Irys storage for uploading.
 * On devnet, uses the devnet Irys endpoint.
 */
export function createMetaplexWithStorage(
  connection: Connection,
  wallet: Keypair,
  isDevnet: boolean = true
): Metaplex {
  const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));

  if (isDevnet) {
    metaplex.use(
      irysStorage({
        address: "https://devnet.irys.xyz",
        providerUrl: connection.rpcEndpoint,
        timeout: 60000,
      })
    );
  } else {
    metaplex.use(
      irysStorage({
        address: "https://node1.irys.xyz",
        providerUrl: connection.rpcEndpoint,
        timeout: 60000,
      })
    );
  }

  return metaplex;
}

/**
 * Upload an image file and return its URI.
 */
export async function uploadImage(
  metaplex: Metaplex,
  imagePath: string
): Promise<string> {
  console.log(`Uploading image: ${imagePath}`);

  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);
  const file = toMetaplexFile(fileBuffer, fileName);

  const imageUri = await metaplex.storage().upload(file);
  console.log(`Image uploaded: ${imageUri}`);

  return imageUri;
}

/**
 * Upload a full metadata JSON and return its URI.
 */
export async function uploadMetadata(
  metaplex: Metaplex,
  metadata: NftMetadata
): Promise<string> {
  console.log(`Uploading metadata for: ${metadata.name}`);

  const { uri } = await metaplex.nfts().uploadMetadata(metadata as Parameters<ReturnType<typeof metaplex.nfts>["uploadMetadata"]>[0]);
  console.log(`Metadata uploaded: ${uri}`);

  return uri;
}

/**
 * Upload both image and metadata in one go.
 * Reads the image, uploads it, sets the image URI in metadata, then uploads metadata.
 */
export async function uploadImageAndMetadata(
  metaplex: Metaplex,
  imagePath: string,
  metadata: Omit<NftMetadata, "image">
): Promise<{ imageUri: string; metadataUri: string }> {
  const imageUri = await uploadImage(metaplex, imagePath);

  const fullMetadata: NftMetadata = {
    ...metadata,
    image: imageUri,
    properties: {
      ...metadata.properties,
      files: [{ uri: imageUri, type: "image/png" }],
    },
  };

  const metadataUri = await uploadMetadata(metaplex, fullMetadata);

  return { imageUri, metadataUri };
}
