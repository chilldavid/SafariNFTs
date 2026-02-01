import { loadConfig } from "../config";
import { createConnection, loadKeypairFromFile, getBalance } from "../utils";

async function main() {
  const config = loadConfig();
  const connection = createConnection();
  const wallet = loadKeypairFromFile(config.walletPath);

  console.log(`Cluster:    ${config.cluster}`);
  console.log(`RPC URL:    ${config.rpcUrl}`);
  console.log(`Wallet:     ${wallet.publicKey.toBase58()}`);

  const balance = await getBalance(connection, wallet);
  console.log(`Balance:    ${balance} SOL`);
}

main().catch(console.error);
