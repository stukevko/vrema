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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <p className="text-center text-xs font-sans uppercase tracking-widest text-muted-foreground mb-2">
          Vrema Terminal
        </p>
        <div
          className={clsx(
            "mb-5 rounded-2xl border px-4 py-3 text-center font-semibold transition-colors",
            feedbackState === "success" && "border-primary/30 bg-primary/10 text-primary",
            feedbackState === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
            feedbackState === "error" && "border-red-200 bg-red-50 text-red-700",
            feedbackState === "idle" && "border-border bg-background text-foreground"
          )}
        >
          {message}
        </div>
        {guidance && (
          <p className="mb-4 -mt-2 text-center text-xs text-muted-foreground">{guidance}</p>
        )}

        <div className="mb-5 rounded-2xl bg-background border border-border py-5 text-center">
          <p className="font-sans text-3xl tracking-[0.5em] pl-[0.5em]">{pin.replace(/./g, "•") || "----"}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={clsx(
                "h-16 rounded-2xl text-xl font-bold transition-colors",
                key === "ok" &&
                  "bg-primary text-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)]",
                key === "clear" && "bg-red-50 text-red-700 hover:bg-red-100",
                key !== "ok" && key !== "clear" && "bg-card text-foreground hover:bg-card/80"
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
