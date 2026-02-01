# Safari NFTs

Create and manage NFTs on the Solana blockchain. Built with TypeScript, Solana Web3.js, and Metaplex.

## Features

- **Mint NFTs** — Create individual NFTs with custom metadata and attributes
- **Create Collections** — Set up verified NFT collections
- **Upload Metadata** — Upload images and JSON metadata via Bundlr/Arweave
- **Batch Minting** — Mint multiple NFTs in sequence
- **Devnet Support** — Full devnet support for development and testing

## Prerequisites

- **Node.js** >= 18
- **Solana CLI** — [Install guide](https://docs.solana.com/cli/install-solana-cli-tools)
- A Solana wallet keypair file (JSON format)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create a Solana wallet** (if you don't have one):

   ```bash
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

3. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your settings. For development, the defaults (devnet) work fine.

4. **Get devnet SOL** (for testing):

   ```bash
   npm run airdrop
   ```

## Usage

### Check wallet balance

```bash
npm run check-balance
```

### Request devnet SOL airdrop

```bash
npm run airdrop         # Request 1 SOL
npm run airdrop -- 2    # Request 2 SOL
```

### Upload metadata

Upload an image file and generate metadata:

```bash
npm run upload -- ./assets/my-image.png
```

Or upload metadata only (using an existing image URI set in `.env`):

```bash
npm run upload
```

### Create a collection

```bash
npm run mint:collection
```

After creation, copy the collection address to your `.env` as `COLLECTION_MINT`.

### Mint an NFT

Configure your NFT details in `.env`, then:

```bash
npm run mint
```

### Programmatic usage

```typescript
import { createConnection, loadKeypairFromFile } from "safari-nfts";
import { mintNft, buildSafariMetadata } from "safari-nfts";

const connection = createConnection();
const wallet = loadKeypairFromFile("~/.config/solana/id.json");

const metadata = buildSafariMetadata({
  name: "Safari Elephant #1",
  description: "A gentle giant roaming the digital savanna.",
  imageUri: "https://arweave.net/your-image-uri",
  animal: "Elephant",
  habitat: "Savanna",
  rarity: "Epic",
  creatorAddress: wallet.publicKey.toBase58(),
});

const result = await mintNft({
  connection,
  wallet,
  metadata,
  isDevnet: true,
});

console.log(`Minted: ${result.explorerUrl}`);
```

## Project Structure

```
src/
├── config/         # Environment and cluster configuration
│   └── index.ts
├── utils/          # Wallet, connection, and airdrop utilities
│   ├── wallet.ts
│   └── index.ts
├── nft/            # Core NFT functionality
│   ├── metadata.ts # Metadata types, builders, and validation
│   ├── upload.ts   # Image and metadata upload via Bundlr
│   ├── mint.ts     # Single and batch NFT minting
│   ├── collection.ts # Collection creation and verification
│   └── index.ts
├── scripts/        # CLI scripts
│   ├── check-balance.ts
│   ├── airdrop.ts
│   ├── upload-metadata.ts
│   ├── mint-nft.ts
│   └── create-collection.ts
└── index.ts        # Main entry point / re-exports
```

## Configuration

All configuration is done through environment variables (`.env` file):

| Variable | Default | Description |
|---|---|---|
| `SOLANA_CLUSTER` | `devnet` | Solana cluster (`devnet`, `testnet`, `mainnet-beta`) |
| `SOLANA_RPC_URL` | cluster default | Custom RPC endpoint |
| `WALLET_PATH` | `~/.config/solana/id.json` | Path to wallet keypair |
| `NFT_NAME` | `Safari Lion #1` | Name of the NFT |
| `NFT_SYMBOL` | `SAFARI` | Token symbol |
| `NFT_DESCRIPTION` | — | NFT description |
| `NFT_IMAGE_URI` | — | URI to the NFT image |
| `COLLECTION_MINT` | — | Collection NFT address |
| `SELLER_FEE_BPS` | `500` | Royalty in basis points (500 = 5%) |

## License

MIT
