import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SiwePayload {
  address: string;
  message: string;
  signature: string;
}

interface AuthState {
  siwe: SiwePayload | null;
  userRole: string | null;
  setSiwe: (payload: SiwePayload) => void;
  clearSiwe: () => void;
  setUserRole: (role: string | null) => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      siwe: null,
      userRole: null,
      setSiwe: (payload) => set({ siwe: payload }),
      clearSiwe: () => set({ siwe: null, userRole: null }),
      setUserRole: (role) => set({ userRole: role }),
      isAdmin: () => get().userRole === "admin"
    }),
    {
      name: "milestonechain-auth",
      // Persist the full SIWE payload — message + signature needed for backend auth
      partialize: (state) => ({
        siwe: state.siwe,
        userRole: state.userRole
      })
    }
  )
);
