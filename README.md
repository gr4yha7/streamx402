# StreamX402

A decentralized live streaming platform built with Next.js, LiveKit, and Solana blockchain integration. StreamX402 enables creators to monetize their streams using USDC payments on Solana, powered by the x402 payment protocol.

## Features

- **Real-time Streaming**: Sub-100ms latency streaming powered by LiveKit WebRTC infrastructure
- **Solana Wallet Integration**: Seamless wallet connection using Wallet Standard (supports Phantom, Solflare, and other Solana wallets)
- **Crypto Payments**: Pay-per-view streams using USDC on Solana devnet
- **x402 Payment Protocol**: HTTP 402 Payment Required integration for automated payment flows
- **Creator Dashboard**: Analytics, earnings tracking, and stream management
- **Interactive Features**: Live chat, reactions, and audience participation
- **Flexible Broadcasting**: Stream from browser or OBS Studio via LiveKit Ingress

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Streaming**: LiveKit Cloud
- **Blockchain**: Solana (devnet), @solana/kit, @wallet-standard/react
- **Payments**: x402 protocol, USDC
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Radix UI, Tailwind CSS
- **Authentication**: Wallet-based authentication

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- LiveKit Cloud account
- Solana wallet (Phantom, Solflare, etc.)

### Installation

1. Clone the repository:

```bash
git clone git@github.com:gr4yha7/streamx402.git
cd streamx402
npm install
```

2. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# LiveKit Configuration
LIVEKIT_WS_URL=<your-livekit-websocket-url>
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/streamx402

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<optional-for-future-use>
```

3. Set up the database:

```bash
npm run db:push
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Viewers

1. Connect your Solana wallet using the "Connect Wallet" button
2. Complete sign up with a username
3. Browse live streams on the homepage
4. Click on a stream to watch
5. For paid streams, approve the USDC payment when prompted

### For Creators

1. Connect your Solana wallet and sign up
2. Navigate to "Become Creator" to set up your channel
3. Configure your channel name, category, and payment address
4. Click "Go Live" to start streaming
5. Set stream title and price (or make it free)
6. Start broadcasting from your browser or OBS Studio

## Architecture

### Wallet Integration

StreamX402 uses the Wallet Standard for Solana wallet connections, providing a unified interface for all compatible wallets. The custom `SolanaProvider` component manages wallet state and provides connection/disconnection functionality throughout the app.

### Payment Flow

1. Viewer requests access to a paid stream
2. Server returns 402 Payment Required with payment requirements
3. x402 client initiates USDC payment on Solana
4. Payment is verified on-chain
5. Access is granted and payment is recorded in the database

### Database Schema

- **User**: Wallet address, username, creator status
- **CreatorProfile**: Channel information, payment address
- **Stream**: Stream metadata, pricing, LiveKit room details
- **Payment**: Transaction records, verification status

## API Routes

- `/api/auth/*` - Wallet-based authentication
- `/api/streams/*` - Stream management and search
- `/api/payments/*` - Payment initiation and verification
- `/api/creator/*` - Creator dashboard and analytics
- `/api/create_stream` - Start a new stream
- `/api/join_stream` - Join as a viewer

## Development

### Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── creator/           # Creator dashboard
│   └── (stream)/          # Stream pages
├── components/            # React components
├── contexts/              # React contexts (auth, etc.)
├── lib/                   # Utilities and configurations
└── styles/                # Global styles
```

## Deployment

This is a Next.js application that can be deployed to Vercel, Railway, or any Node.js hosting platform.

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform, including:
- LiveKit credentials
- Database connection string
- Solana network configuration (mainnet-beta for production)

### Database

Set up a PostgreSQL database and run migrations before deploying:

```bash
npm run db:push
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [LiveKit](https://livekit.io/) for real-time streaming
- Powered by [Solana](https://solana.com/) blockchain
- Uses [x402](https://github.com/x402) payment protocol
- UI components from [Radix UI](https://www.radix-ui.com/)
