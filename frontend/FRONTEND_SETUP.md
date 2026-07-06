# MilestoneChain Frontend Setup Guide

## Overview

MilestoneChain frontend is built with React + TypeScript + Vite, using wagmi/viem for Web3 interactions and TailwindCSS for styling.

## Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **Web3**: wagmi v2, viem, @tanstack/react-query
- **Styling**: TailwindCSS + Framer Motion
- **State Management**: Zustand (auth), React Query (server state)
- **Routing**: React Router v6
- **GraphQL**: Apollo Client (optional)
- **Charts**: Recharts (Analytics page)

---

## Prerequisites

- Node.js 18+ and npm 9+
- MetaMask or compatible Web3 wallet
- Backend API running (see `backend/README.md`)
- Smart contracts deployed (Factory contract address required)

---

## Installation

### 1. Clone and Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Backend API
VITE_BACKEND_URL=http://localhost:5000

# Blockchain
VITE_FACTORY_CONTRACT_ADDRESS=0xYourFactoryContractAddress
VITE_TARGET_CHAIN_ID=80002
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
VITE_ALCHEMY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional
VITE_GRAPHQL_URL=http://localhost:5000/graphql
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables Explained

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Backend API base URL | `http://localhost:5000` |
| `VITE_FACTORY_CONTRACT_ADDRESS` | Deployed Factory contract address | `0x123...abc` |
| `VITE_TARGET_CHAIN_ID` | Blockchain network ID | `80002` (Polygon Amoy) |
| `VITE_ALCHEMY_API_KEY` | Alchemy API key for RPC | `your_key` |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | `abc123...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GRAPHQL_URL` | GraphQL endpoint | `${BACKEND_URL}/graphql` |
| `VITE_IPFS_GATEWAY` | IPFS gateway URL | `https://gateway.pinata.cloud/ipfs/` |
| `VITE_ENABLE_ANALYTICS` | Enable Google Analytics | `false` |
| `VITE_ENABLE_TESTNET_FAUCET` | Show testnet faucet link | `true` |

### Network IDs Reference

- `1` = Ethereum Mainnet
- `137` = Polygon Mainnet
- `80002` = Polygon Amoy Testnet (recommended for development)
- `11155111` = Sepolia Testnet

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── GlassCard.tsx
│   │   │   └── ...
│   │   ├── layout/          # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   └── ...
│   │   ├── navigation/      # Navigation components
│   │   │   ├── DesktopSidebar.tsx
│   │   │   └── MobileBottomNav.tsx
│   │   ├── CampaignCard.tsx
│   │   ├── MilestoneTimeline.tsx
│   │   ├── TrustIndicators.tsx
│   │   ├── WalletConnector.tsx
│   │   └── ...
│   ├── routes/              # Page components
│   │   ├── HomePage.tsx
│   │   ├── ExplorePage.tsx
│   │   ├── CampaignDetailPage.tsx
│   │   ├── MyCampaignsPage.tsx
│   │   ├── MyDonationsPage.tsx
│   │   ├── MilestoneReviewsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── WalletPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── HelpPage.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useCampaigns.ts
│   │   ├── useCampaignContract.ts
│   │   └── ...
│   ├── store/               # Zustand stores
│   │   └── authStore.ts
│   ├── lib/                 # Utilities & configs
│   │   ├── api.ts           # REST API client
│   │   ├── apollo.ts        # GraphQL client
│   │   ├── chain.ts         # Chain helpers
│   │   ├── contracts.ts     # Contract ABIs
│   │   └── wagmi.ts         # Wagmi config
│   ├── styles/
│   │   └── globals.css      # Global styles
│   ├── App.tsx              # App router
│   ├── main.tsx             # Entry point
│   └── vite-env.d.ts
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── package.json
```

---

## Key Features

### 1. Design System

Located in `src/components/ui/`:

- **Button**: 7 variants (primary, secondary, outline, ghost, danger, success, blockchain)
- **Badge**: 8 variants with status indicators
- **StatusChip**: Milestone status indicators with animated ping
- **GlassCard**: Glassmorphism card component
- **ProgressBar**: 5 variants for funding/voting progress
- **Avatar**: Jazzicon-style avatars from wallet addresses
- **Skeleton**: Loading states
- **Alert**: 4 variants (info, success, warning, danger)
- **Tooltip**: 4 placement options

### 2. Authentication (SIWE)

**Store**: `src/store/authStore.ts`  
**Pattern**: Sign-In with Ethereum (SIWE)

```typescript
import { useAuthStore } from '@/store/authStore';

// In component
const { address, isAuthenticated, signIn, signOut } = useAuthStore();

// Sign in
await signIn(walletAddress, signature, message);

// Sign out
signOut();
```

### 3. API Integration

**Client**: `src/lib/api.ts`

```typescript
import { apiClient } from '@/lib/api';

// Fetch campaigns
const campaigns = await apiClient.get('/campaigns');

// Create campaign
const newCampaign = await apiClient.post('/campaigns', {
  title: 'My Campaign',
  targetAmount: '10',
  milestones: [...]
});

// Upload cover image
const formData = new FormData();
formData.append('image', file);
const result = await apiClient.post('/media/campaign-cover', formData);
```

**Features**:
- Automatic SIWE header injection
- Base URL from environment
- Error handling with graceful degradation
- TypeScript types for responses

### 4. Smart Contract Integration

**Config**: `src/lib/wagmi.ts`  
**Hooks**: `src/hooks/useCampaignContract.ts`

```typescript
import { useCampaignContract } from '@/hooks/useCampaignContract';

// In component
const { donate, submitMilestoneProof, vote } = useCampaignContract(campaignAddress);

// Donate to campaign
await donate({ amount: '0.1' }); // In ETH

// Submit milestone proof
await submitMilestoneProof({ milestoneIndex: 0, cid: 'Qm...' });

// Vote on milestone
await vote({ milestoneIndex: 0, support: true });
```

### 5. React Query (Server State)

**Hook**: `src/hooks/useCampaigns.ts`

```typescript
import { useCampaigns } from '@/hooks/useCampaigns';

// In component
const { data: campaigns, isLoading, error, refetch } = useCampaigns();

// Campaign details
const { data: campaign } = useCampaign(campaignId);

// Automatic refetching every 30 seconds
// Automatic cache invalidation on mutations
```

---

## Development Workflow

### Running the App

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run tsc

# Linting
npm run lint
```

### Testing Locally

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Connect Wallet**: Use MetaMask on Polygon Amoy testnet
4. **Get Test MATIC**: Use faucet at https://faucet.polygon.technology/

### Common Development Tasks

#### Upload Campaign Cover Image

```typescript
// In CreateCampaignPage.tsx
const handleImageUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await apiClient.post('/media/campaign-cover', formData);
  setCoverImageUrl(response.data.coverImageUrl);
};
```

#### Submit Milestone Proof

```typescript
// In CampaignManagePage.tsx
const handleProofUpload = async (file: File, milestoneIndex: number) => {
  // 1. Upload to IPFS via backend
  const formData = new FormData();
  formData.append('file', file);
  formData.append('contractAddress', campaignAddress);
  formData.append('milestoneIndex', milestoneIndex.toString());
  
  const response = await apiClient.post('/upload/proof', formData);
  const { cid } = response.data;
  
  // 2. Submit CID to smart contract
  const { submitMilestoneProof } = useCampaignContract(campaignAddress);
  await submitMilestoneProof({ milestoneIndex, cid });
};
```

#### Donate to Campaign

```typescript
// In CampaignDetailPage.tsx
const handleDonate = async (amount: string) => {
  const { donate } = useCampaignContract(campaignAddress);
  await donate({ amount }); // Amount in ETH/MATIC
  
  // Query will auto-refetch and update UI
};
```

---

## Styling Guide

### Tailwind Theme

Configured in `tailwind.config.ts`:

**Colors**:
- `primary`: Indigo (brand)
- `secondary`: Purple
- `blockchain`: Blue
- `success`: Emerald
- `warning`: Amber
- `danger`: Red

**Typography**:
- `font-sans`: Inter (body text)
- `font-display`: Sora (headings)
- `font-mono`: JetBrains Mono (code)

**Surfaces**:
- `background`: Base background
- `surface`: Elevated surface
- `surface-elevated`: Card backgrounds
- `elevated`: Modal/dropdown backgrounds

### Component Examples

```tsx
// Primary button
<Button variant="primary" leadingIcon={<Plus />}>
  Create Campaign
</Button>

// Glass card with hover
<GlassCard className="p-6 hover:shadow-lg transition-shadow">
  <h3>Card Title</h3>
</GlassCard>

// Progress bar
<ProgressBar 
  value={currentAmount} 
  max={targetAmount} 
  variant="success"
/>

// Status chip with animation
<StatusChip status="voting" />
```

---

## Troubleshooting

### Wallet Not Connecting

**Issue**: "Connector not found"  
**Fix**: Ensure WalletConnect project ID is set in `.env`

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

Get project ID at: https://cloud.walletconnect.com/

### API Requests Failing

**Issue**: CORS errors or 404s  
**Fix**: 
1. Verify `VITE_BACKEND_URL` is correct
2. Ensure backend is running on specified port
3. Check backend CORS configuration allows your frontend origin

### Smart Contract Calls Failing

**Issue**: "Contract not deployed"  
**Fix**:
1. Verify `VITE_FACTORY_CONTRACT_ADDRESS` is correct
2. Ensure you're connected to the correct network (check `VITE_TARGET_CHAIN_ID`)
3. Verify contract is deployed using block explorer

### Build Errors

**Issue**: TypeScript errors during build  
**Fix**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run tsc
```

### Missing Environment Variables

**Issue**: `undefined` values from `import.meta.env`  
**Fix**: All env vars must start with `VITE_` prefix and be defined in `.env` file

---

## Production Deployment

### Build Optimization

```bash
# Production build
npm run build

# Output: dist/ directory
# Serves: dist/index.html
```

### Environment Variables

Set production values:

```env
VITE_BACKEND_URL=https://api.milestonechain.io
VITE_FACTORY_CONTRACT_ADDRESS=0xProductionAddress
VITE_TARGET_CHAIN_ID=137  # Polygon Mainnet
VITE_ALCHEMY_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Deployment Platforms

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### IPFS (Decentralized)
```bash
npm run build
npx ipfs-deploy dist/
```

### Performance Checklist

- ✅ Code splitting (Vite automatic)
- ✅ Image optimization (Cloudinary)
- ✅ Lazy loading (React.lazy for routes)
- ✅ Tree shaking (Vite automatic)
- ✅ CSS minification (Tailwind)
- ✅ Bundle analysis: `npm run build -- --analyze`

---

## Additional Resources

- **Wagmi Docs**: https://wagmi.sh/
- **Viem Docs**: https://viem.sh/
- **TailwindCSS**: https://tailwindcss.com/
- **React Query**: https://tanstack.com/query/
- **Polygon Faucet**: https://faucet.polygon.technology/
- **Alchemy Dashboard**: https://dashboard.alchemy.com/

---

## Support

- **Issues**: Check `frontend/logs/` (if logging configured)
- **Type Errors**: Run `npm run tsc` for detailed error messages
- **Backend Issues**: See `BACKEND_INTEGRATION.md`
- **Smart Contract Issues**: See `blockchain/README.md`

