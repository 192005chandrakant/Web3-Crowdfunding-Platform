import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useAuth } from '@clerk/clerk-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Loader2 } from 'lucide-react';

const ADMIN_WALLETS = (import.meta.env.VITE_ADMIN_WALLET_ADDRESSES || '')
  .split(',')
  .map((address: string) => address.trim().toLowerCase())
  .filter(Boolean);

export function AdminRouteGuard() {
  const { address } = useAccount();
  const { isLoaded, isSignedIn } = useAuth();
  const { role: userRole, isLoading } = useCurrentUser();
  const isAllowlistedAdmin = !!address && ADMIN_WALLETS.includes(address.toLowerCase());

  if (!isLoaded || isLoading) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-slate-400 font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!address || !isSignedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAllowlistedAdmin && userRole !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
