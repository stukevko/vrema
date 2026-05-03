"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SaldoWidgetProps {
  workedMinutes: number;
  expectedMinutes: number;
  saldoMinutes: number;
  hasWorkLogs?: boolean;
}

function formatMinutes(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function SaldoWidget({
  workedMinutes,
  expectedMinutes,
  saldoMinutes,
  hasWorkLogs = true,
}: SaldoWidgetProps) {
  const isPositive = saldoMinutes > 0;
  const isZero = saldoMinutes === 0;

  const worked = Math.round(workedMinutes / 60 * 10) / 10;
  const expected = Math.round(expectedMinutes / 60 * 10) / 10;
  const percentage = expected > 0 ? Math.min((workedMinutes / expectedMinutes) * 100, 150) : 0;

  if (!hasWorkLogs) {
    return (
      <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <h2 className="font-semibold text-lg mb-3">Stunden-Saldo</h2>
        <p className="text-sm text-muted-foreground">
          Noch keine erfassten Zeiten. Nutzen Sie das Terminal, um zu starten.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
      <h2 className="font-semibold text-lg mb-6">Stunden-Saldo</h2>

      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isZero ? "bg-card" : isPositive ? "bg-primary/10" : "bg-red-500/10"
        }`}>
          {isZero ? (
            <Minus className="w-6 h-6 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="w-6 h-6 text-[#22c55e]" />
          ) : (
            <TrendingDown className="w-6 h-6 text-red-400" />
          )}
        </div>
        <div>
          <p className={`text-3xl font-bold tabular-nums ${
            isZero ? "text-foreground" : isPositive ? "text-[#22c55e]" : "text-red-400"
          }`}>
            {isPositive && "+"}{isZero ? "0h 00m" : formatMinutes(saldoMinutes)}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPositive ? "Überstunden" : isZero ? "Ausgeglichen" : "Minusstunden"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Gearbeitet: {worked}h</span>
          <span>Soll: {expected}h</span>
        </div>
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${isPositive ? "bg-primary" : "bg-red-500"}`}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(0)}% der Sollzeit</p>
      </div>
    </div>
  );
}
