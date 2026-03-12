# ChainWatch ⬡

**Ethereum wallet risk intelligence platform** — free, open-source alternative to enterprise AML tools.

🔗 **[Live Demo →](https://chainwatch.vercel.app)**

## Features
- Composite risk scoring across 8 weighted factors
- Mixer / Tornado Cash interaction detection
- OFAC sanctions exposure screening
- NFT wash trading detection
- ERC-20 stablecoin volume analysis
- ENS name resolution
- AI-generated AML assessment (Claude-powered)
- Force-directed transaction network graph
- Batch analysis mode (up to 50 addresses)
- No API key required to explore (demo mode)

## Tech Stack
React · Vite · D3 · Recharts · Etherscan API · Anthropic Claude

## Setup
```bash
npm install
echo "VITE_ETHERSCAN_KEY=your_key" > .env
npm run dev
```

## Roadmap
- [ ] Multi-chain support (Polygon, Arbitrum, BSC)
- [ ] Real-time OFAC API integration
- [ ] Wallet clustering / entity labeling
