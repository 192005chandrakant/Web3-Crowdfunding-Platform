import React, { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { Button } from '@/components/ui';
import { Wallet, LogOut, Loader2, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useSignIn, useAuth, useClerk } from '@clerk/clerk-react';

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  const { signIn, setActive } = useSignIn();
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnect = async (connector: any) => {
    try {
      await connectAsync({ connector });
      // Keep open so they can click sign in
    } catch (err) {
      console.error(err);
    }
  };

  async function handleSignIn() {
    if (!address || !signIn) return;
    setIsSigning(true);
    try {
      const res = await signIn.authenticateWithWeb3({
        identifier: address,
      } as any);
      if (res.status === 'complete' && setActive) {
        await setActive({ session: res.createdSessionId });
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Clerk Web3 Auth Error:", err);
    } finally {
      setIsSigning(false);
    }
  }

  const handleDisconnect = () => {
    signOut();
    disconnect();
    setIsOpen(false);
  };

  if (isConnected && address) {
    const isAuthenticated = isLoaded && isSignedIn;

    return (
      <div className="relative z-50" ref={dropdownRef}>
        <Button 
          variant={isAuthenticated ? "outline" : "secondary"} 
          size="sm" 
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2 bg-slate-900/50 backdrop-blur-md border-white/[0.08] max-w-[calc(100vw-6.5rem)] sm:max-w-none"
        >
          <Wallet className={`w-4 h-4 ${isAuthenticated ? 'text-primary-400' : 'text-slate-400'}`} />
          <span>{address.slice(0, 6)}…{address.slice(-4)}</span>
          {!isAuthenticated && <span className="hidden md:inline ml-1 text-xs font-normal opacity-80">(Not signed in)</span>}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-slate-800 shadow-xl overflow-hidden p-2 flex flex-col gap-1">
            {!isAuthenticated && (
              <div className="mb-2 p-2 rounded-lg bg-secondary-500/10 border border-secondary-500/20">
                <p className="text-xs text-secondary-200 mb-2 leading-relaxed">
                  Sign in with your wallet to authenticate and access all features.
                </p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full"
                  isLoading={isSigning}
                  leadingIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
              </div>
            )}
            
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/[0.04] rounded-lg transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <Button 
        variant="primary" 
        size="sm"
        leadingIcon={isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="shadow-glow-primary max-w-[calc(100vw-6.5rem)] sm:max-w-none"
      >
        <span className="sm:hidden">{isPending ? 'Connecting…' : 'Wallet'}</span>
        <span className="hidden sm:inline">{isPending ? 'Connecting…' : 'Connect Wallet'}</span>
      </Button>

      {isOpen && !isPending && connectors.length > 0 && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-slate-800 shadow-xl overflow-hidden p-2 flex flex-col gap-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Select Wallet
          </div>
          {connectors.map(connector => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-200 hover:bg-white/[0.06] rounded-lg transition-colors text-left"
            >
              <span>{connector.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
