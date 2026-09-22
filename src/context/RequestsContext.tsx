import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../lib/api";
import { useAuth } from "./AuthContext";
import type { BookingRequest } from "../types";

interface RequestsContextValue {
  requests: BookingRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const RequestsContext = createContext<RequestsContextValue | undefined>(undefined);

export function RequestsProvider({ children }: { children: ReactNode }) {
  const { member } = useAuth();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    try {
      const data = await api.listRequests();
      setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    if (member) {
      refresh();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [member, refresh]);

  const value = useMemo(() => ({ requests, loading, refresh }), [requests, loading, refresh]);

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}

export function useRequests(): RequestsContextValue {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error("useRequests muss innerhalb von RequestsProvider verwendet werden.");
  return ctx;
}
