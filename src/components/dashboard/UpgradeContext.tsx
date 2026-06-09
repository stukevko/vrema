"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { UpgradeReason } from "@/lib/plan-upgrade-messages";
import { UpgradeSheet } from "@/components/dashboard/UpgradeSheet";

type UpgradeContextValue = {
  openUpgrade: (reason: UpgradeReason) => void;
  closeUpgrade: () => void;
};

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<UpgradeReason | null>(null);

  const openUpgrade = useCallback((r: UpgradeReason) => setReason(r), []);
  const closeUpgrade = useCallback(() => setReason(null), []);

  return (
    <UpgradeContext.Provider value={{ openUpgrade, closeUpgrade }}>
      {children}
      <UpgradeSheet open={reason !== null} reason={reason} onClose={closeUpgrade} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext);
  if (!ctx) {
    throw new Error("useUpgrade muss innerhalb von UpgradeProvider verwendet werden.");
  }
  return ctx;
}
