import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { loadConfig } from "../config";
import fs from "fs";

/**
 * Load a Keypair from a JSON file (Solana CLI format).
 * The file should contain a JSON array of 64 bytes (secret key).
 */
export function loadKeypairFromFile(filePath: string): Keypair {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Wallet file not found: ${filePath}\n` +
        "Generate one with: solana-keygen new --outfile <path>"
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const secretKey = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Load a Keypair from a base58-encoded private key string.
 * This is the format used by Phantom and most Solana wallets when exporting.
 */
export function loadKeypairFromPrivateKey(privateKey: string): Keypair {
  const decoded = bs58.decode(privateKey.trim());
  return Keypair.fromSecretKey(decoded);
}

/**
 * Load wallet from PRIVATE_KEY env var (base58) or fall back to WALLET_PATH file.
 */
export function loadWallet(): Keypair {
  const config = loadConfig();

  if (process.env.PRIVATE_KEY) {
    return loadKeypairFromPrivateKey(process.env.PRIVATE_KEY);
  }

  return loadKeypairFromFile(config.walletPath);
}

/**
 * Generate a brand-new keypair and optionally save it to disk.
 */
export function generateKeypair(savePath?: string): Keypair {
  const keypair = Keypair.generate();

  if (savePath) {
    fs.writeFileSync(
      savePath,
      JSON.stringify(Array.from(keypair.secretKey)),
      "utf-8"
    );
    console.log(`Keypair saved to ${savePath}`);
  }

  return keypair;
}

/**
 * Create a connection to the configured Solana cluster.
 */
export function createConnection(): Connection {
  const { rpcUrl } = loadConfig();
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Get SOL balance for the loaded wallet.
 */
export async function getBalance(connection: Connection, keypair: Keypair): Promise<number> {
  const balance = await connection.getBalance(keypair.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Request an airdrop of SOL on devnet/testnet.
 */
export async function requestAirdrop(
  connection: Connection,
  keypair: Keypair,
  solAmount: number = 1
): Promise<string> {
  console.log(
    `Requesting ${solAmount} SOL airdrop to ${keypair.publicKey.toBase58()}...`
  );

  const signature = await connection.requestAirdrop(
    keypair.publicKey,
    solAmount * LAMPORTS_PER_SOL
  );

  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });

  console.log(`Airdrop confirmed! Signature: ${signature}`);
  return signature;
}
