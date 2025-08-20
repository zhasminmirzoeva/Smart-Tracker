import React, { createContext, useContext } from "react";
import { useAuthVM } from "../features/auth/ViewModel/useAuthVM";

const AuthCtx = createContext<ReturnType<typeof useAuthVM> | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const vm = useAuthVM();
  return <AuthCtx.Provider value={vm}>{children}</AuthCtx.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}