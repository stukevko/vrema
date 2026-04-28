"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { validatePinAndClock } from "@/lib/actions/terminal";
import clsx from "clsx";

type FeedbackState = "idle" | "success" | "warning" | "error";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "ok"] as const;

export default function TerminalPage() {
  const params = useParams<{ companySlug: string }>();
  const companySlug = params.companySlug;
  const [pin, setPin] = useState("");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [message, setMessage] = useState("PIN eingeben");
  const [isPending, startTransition] = useTransition();

  const guidance = (() => {
    if (message.includes("erfordert GPS")) {
      return "Standort freigeben und erneut mit OK bestätigen.";
    }
    if (message.includes("GPS-Radius")) {
      return "Standort liegt außerhalb des erlaubten Arbeitsradius.";
    }
    return null;
  })();

  const runValidation = () => {
    if (pin.length < 4 || !companySlug) {
      setFeedbackState("error");
      setMessage("Bitte mindestens 4 Stellen eingeben.");
      return;
    }

    startTransition(async () => {
      try {
        const locationData = await new Promise<{ latitude?: number; longitude?: number }>((resolve) => {
          if (!navigator.geolocation) {
            resolve({});
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve({}),
            { enableHighAccuracy: true, timeout: 4000 }
          );
        });

        const result = await validatePinAndClock(companySlug, pin, locationData);
        setFeedbackState(result.status);
        setMessage(result.message);
      } catch {
        setFeedbackState("error");
        setMessage("Terminalfehler. Bitte erneut versuchen.");
      } finally {
        setPin("");
      }
    });
  };

  const handleKey = (key: (typeof KEYS)[number]) => {
    if (isPending) return;
    if (key === "clear") {
      setPin("");
      return;
    }
    if (key === "ok") {
      runValidation();
      return;
    }
    if (pin.length < 8) {
      setPin((prev) => `${prev}${key}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6">
        <p className="text-center text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          Vrema Terminal
        </p>
        <div
          className={clsx(
            "mb-5 rounded-2xl border px-4 py-3 text-center font-semibold transition-colors",
            feedbackState === "success" && "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#86efac]",
            feedbackState === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
            feedbackState === "error" && "border-red-500/30 bg-red-500/10 text-red-300",
            feedbackState === "idle" && "border-white/10 bg-[#0b0b0b] text-white/80"
          )}
        >
          {message}
        </div>
        {guidance && (
          <p className="mb-4 -mt-2 text-center text-xs text-white/45">{guidance}</p>
        )}

        <div className="mb-5 rounded-2xl bg-[#0b0b0b] border border-white/10 py-5 text-center">
          <p className="font-mono text-3xl tracking-[0.5em] pl-[0.5em]">{pin.replace(/./g, "•") || "----"}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={clsx(
                "h-16 rounded-2xl text-xl font-bold transition-colors",
                key === "ok" && "bg-[#22c55e] text-black hover:bg-[#16a34a]",
                key === "clear" && "bg-red-500/15 text-red-300 hover:bg-red-500/25",
                key !== "ok" && key !== "clear" && "bg-white/5 text-white hover:bg-white/10"
              )}
            >
              {key === "clear" ? "C" : key === "ok" ? "OK" : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
