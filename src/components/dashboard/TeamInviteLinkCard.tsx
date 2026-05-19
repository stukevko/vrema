"use client";

import { useState, useTransition } from "react";
import { createTeamInviteLink } from "@/lib/actions/team";
import { Copy, Loader2, Share2 } from "lucide-react";

export function TeamInviteLinkCard() {
  const [role, setRole] = useState<"USER" | "MANAGER" | "ADVISOR">("USER");
  const [inviteUrl, setInviteUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const createLink = () => {
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await createTeamInviteLink(role);
        setInviteUrl(result.url);
      } catch {
        setFeedback("Link konnte nicht erstellt werden.");
      }
    });
  };

  const shareOrCopy = async () => {
    if (!inviteUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "VREMA Team-Einladung",
          text: "Komm in unser VREMA-Team:",
          url: inviteUrl,
        });
        setFeedback("Einladung geteilt.");
        return;
      }
      await navigator.clipboard.writeText(inviteUrl);
      setFeedback("Link kopiert.");
    } catch {
      setFeedback("Teilen/Kopieren nicht möglich.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Team via Link einladen</h3>
      <p className="mt-1 text-xs text-slate-600">
        Erzeuge einen sicheren Join-Link und teile ihn direkt per WhatsApp oder Zwischenablage.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-xs text-slate-600">Rolle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "USER" | "MANAGER" | "ADVISOR")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="USER">Mitarbeiter</option>
          <option value="MANAGER">Manager</option>
          <option value="ADVISOR">Berater (Stoß & Umsatz)</option>
        </select>

        <button
          type="button"
          onClick={createLink}
          disabled={isPending}
          className="btn-primary-solid flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          {isPending ? "Lädt..." : "Einladungslink erstellen"}
        </button>

        {inviteUrl ? (
          <>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 break-all">{inviteUrl}</p>
            <button
              type="button"
              onClick={shareOrCopy}
              className="btn-secondary-outline flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium"
            >
              <Share2 className="h-4 w-4" />
              Teilen / Kopieren
            </button>
          </>
        ) : null}

        {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}
      </div>
    </div>
  );
}
