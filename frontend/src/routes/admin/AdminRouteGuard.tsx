import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export function AdminRouteGuard() {
  const { address } = useAccount();
  const { isSignedIn, isLoaded } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!isLoaded) return;
      if (!address || !isSignedIn) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.getUser(address);
        setUserRole(res.user?.role || null);
      } catch (e) {
        console.error('Failed to fetch user role:', e);
      } finally {
        setIsLoading(false);
      }
    }
    checkRole();
  }, [address, isSignedIn, isLoaded]);

  if (!isLoaded || isLoading) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-slate-400 font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!address || !isSignedIn) {
    toast.error('Connect your wallet and sign in to access admin pages.');
    return <Navigate to="/" replace />;
  }

  if (userRole !== 'admin') {
    toast.error('Admin access required.');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
