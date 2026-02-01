import { loadConfig } from "../config";
import {
  createConnection,
  loadKeypairFromFile,
  requestAirdrop,
  getBalance,
} from "../utils";

async function main() {
  const config = loadConfig();

  if (config.cluster === "mainnet-beta") {
    console.error("Airdrop is not available on mainnet.");
    process.exit(1);
  }

  const connection = createConnection();
  const wallet = loadKeypairFromFile(config.walletPath);

  const amount = parseFloat(process.argv[2] || "1");

  console.log(`Cluster: ${config.cluster}`);
  console.log(`Wallet:  ${wallet.publicKey.toBase58()}`);

  await requestAirdrop(connection, wallet, amount);

  const balance = await getBalance(connection, wallet);
  console.log(`New balance: ${balance} SOL`);
}

main().catch(console.error);
