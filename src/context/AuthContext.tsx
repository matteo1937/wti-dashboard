import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../lib/api";
import type { Member } from "../types";

interface AuthContextValue {
  member: Member | null;
  members: Member[];
  loading: boolean;
  login: (name: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setMember(data.member);
      setMembers(data.members);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (name: string, passcode: string) => {
    const data = await api.login(name, passcode);
    setMember(data.member);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.logout();
    setMember(null);
  }, []);

  const value = useMemo(
    () => ({ member, members, loading, login, logout }),
    [member, members, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  return ctx;
}
