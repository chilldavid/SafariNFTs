import { clusterApiUrl, Cluster } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  /** Solana cluster: devnet, testnet, or mainnet-beta */
  cluster: Cluster;
  /** RPC endpoint URL (overrides cluster default if set) */
  rpcUrl: string;
  /** Path to the wallet keypair JSON file */
  walletPath: string;
}

export function loadConfig(): AppConfig {
  const cluster = (process.env.SOLANA_CLUSTER as Cluster) || "devnet";
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(cluster);
  const walletPath =
    process.env.WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;

  return { cluster, rpcUrl, walletPath };
}
