"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ActiveClientContextValue = {
  clientId: string | null;
  setClientId: (id: string | null) => void;
};

const ActiveClientContext = createContext<ActiveClientContextValue | null>(
  null
);

export function ActiveClientProvider({
  children,
  initialClientId = null,
}: {
  children: React.ReactNode;
  initialClientId?: string | null;
}) {
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const value = useMemo<ActiveClientContextValue>(
    () => ({ clientId, setClientId }),
    [clientId]
  );
  return (
    <ActiveClientContext.Provider value={value}>
      {children}
    </ActiveClientContext.Provider>
  );
}

export function useActiveClient() {
  const ctx = useContext(ActiveClientContext);
  if (!ctx) {
    throw new Error("useActiveClient must be used within ActiveClientProvider");
  }
  return ctx;
}
