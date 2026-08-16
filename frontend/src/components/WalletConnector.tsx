import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage } from "wagmi";
import {
  Wallet,
  Link2,
  Link2Off,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink
} from "lucide-react";
import clsx from "clsx";
import { Button, Alert, Badge } from "@/components/ui";
import { TARGET_CHAIN_ID, getAddressUrl, getChainLabel } from "@/lib/chain";


// ─── Connection state helpers ──────────────────────────────────────────────
type WalletStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong-network"
  | "signing"
  | "authenticated";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getNetworkName(chainId: number | undefined): string {
  return chainId ? getChainLabel(chainId) : "Unknown";
}

function isSupported(chainId: number | undefined): boolean {
  return chainId === TARGET_CHAIN_ID;
}

// ─── Component ────────────────────────────────────────────────────────────
interface WalletConnectorProps {
  onAuthenticated?: (payload: {
    message: string;
    signature: string;
    address: string;
  }) => void;
  className?: string;
}

export function WalletConnector({ onAuthenticated, className }: WalletConnectorProps) {
  const { address, isConnected }        = useAccount();
  const chainId                         = useChainId();
  const { connectors, connectAsync, isPending }  = useConnect();
  const { disconnect }                  = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  async function handleSwitchNetwork() {
    const provider = (window as any).ethereum;
    if (!provider) {
      alert("No wallet provider found. Please install MetaMask or another Ethereum wallet.");
      return;
    }

    const targetChainHex = `0x${TARGET_CHAIN_ID.toString(16)}`;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainHex }]
      });
    } catch (error: any) {
      if (error?.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: targetChainHex,
            chainName: "Local Ganache",
            nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
            blockExplorerUrls: []
          }]
        });
      } else {
        throw error;
      }
    }
  }

  // Derive current status
  const status: WalletStatus = (() => {
    if (!isConnected) return "disconnected";
    if (isPending)    return "connecting";
    if (!isSupported(chainId)) return "wrong-network";
    if (isSigning)    return "signing";
    return "connected";
  })();

  async function handleSignIn() {
    if (!address) return;

    const domain  = window.location.host;
    const uri     = window.location.origin;
    const nonce   = String(Date.now());

    const message = [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      "",
      "Sign in to MilestoneChain — Transparent Milestone Crowdfunding.",
      "",
      `URI: ${uri}`,
      "Version: 1",
      `Chain ID: ${chainId ?? TARGET_CHAIN_ID}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`
    ].join("\n");

    try {
      const signature = await signMessageAsync({ message });
      const authPayload = { message, signature, address };
      
      onAuthenticated?.(authPayload);
    } catch (err) {
      // User rejected — framer/wagmi already handles error state
    }
  }

  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/[0.08] bg-slate-800/50 p-5 space-y-4",
        className
      )}
      aria-label="Wallet connection"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-blockchain-600/20">
            <Wallet className="h-4 w-4 text-blockchain-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Wallet</p>
            <p className="text-xs text-slate-500">Connect to donate or create campaigns</p>
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge status={status} />
      </div>

      {/* Address display */}
      {isConnected && address && (
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Connected Account</p>
              <code className="font-mono text-sm text-slate-300">{shortenAddress(address)}</code>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Network</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    isSupported(chainId) ? "bg-success-400" : "bg-danger-400"
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs text-slate-400">{getNetworkName(chainId)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wrong network warning */}
      {status === "wrong-network" && (
        <Alert variant="warning" title="Wrong network">
          <div className="space-y-3">
            <p>Please switch to {getChainLabel(TARGET_CHAIN_ID)} in your wallet to use MilestoneChain.</p>
            <Button variant="secondary" size="sm" onClick={handleSwitchNetwork}>
              Switch to Local Ganache
            </Button>
          </div>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!isConnected ? (
          // Show all available connectors
          connectors.map((connector) => (
              <Button
                key={connector.uid}
                variant="blockchain"
                size="sm"
                isLoading={isPending}
                leadingIcon={<Link2 className="h-4 w-4" />}
                onClick={async () => {
                  try {
                    await connectAsync({ connector });
                  } catch (err) {
                    console.error('Wallet connect failed:', err);
                    // Provide a helpful UI hint when MetaMask/injected provider missing
                    const msg = (err instanceof Error && err.message) ? err.message : 'Failed to connect wallet';
                    // eslint-disable-next-line no-alert
                    alert(`Wallet connect error: ${msg}`);
                  }
                }}
              >
                Connect {connector.name}
              </Button>
            ))
        ) : (
          <>
            {status === "connected" && (
              <Button
                variant="primary"
                size="sm"
                isLoading={isSigning}
                leadingIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={handleSignIn}
              >
                Sign In with Wallet
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Link2Off className="h-4 w-4" />}
              onClick={() => {  disconnect(); }}
            >
              Disconnect
            </Button>
            {address && (
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<ExternalLink className="h-3.5 w-3.5" />}
                to={getAddressUrl(chainId ?? TARGET_CHAIN_ID, address)}
              >
                View on Explorer
              </Button>
            )}
          </>
        )}
      </div>

      {/* SIWE info when disconnected */}
      {!isConnected && (
        <p className="text-xs text-slate-400 leading-relaxed">
          Sign In With Ethereum (SIWE) is used for secure, wallet-based authentication.
          No password required.
        </p>
      )}
    </section>
  );
}

// ─── Status badge sub-component ───────────────────────────────────────────
function StatusBadge({ status }: { status: WalletStatus }) {
  switch (status) {
    case "connected":
    case "authenticated":
      return <Badge variant="success" dot>Connected</Badge>;
    case "connecting":
    case "signing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blockchain-500/25 bg-blockchain-500/10 px-2.5 py-1 text-xs font-medium text-blockchain-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === "signing" ? "Signing…" : "Connecting…"}
        </span>
      );
    case "wrong-network":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-500/25 bg-warning-500/10 px-2.5 py-1 text-xs font-medium text-warning-400">
          <AlertTriangle className="h-3 w-3" />
          Wrong Network
        </span>
      );
    default:
      return <Badge variant="default">Disconnected</Badge>;
  }
}
