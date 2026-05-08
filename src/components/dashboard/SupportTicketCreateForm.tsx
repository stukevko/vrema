"use client";

import { useRef, useState } from "react";
import { createSupportTicketFormAction } from "@/lib/actions/support";

export function SupportTicketCreateForm({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setIsSubmitting(true);
        try {
          await createSupportTicketFormAction(formData);
          form.reset();
          onSuccess?.();
        } catch (err: unknown) {
          onError?.(err instanceof Error ? err.message : "Ticket konnte nicht erstellt werden.");
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
    >
      <h2 className="text-base font-semibold">Neues Ticket</h2>
      <p className="text-xs text-muted-foreground">Wir melden uns so schnell wie möglich – mit Antwort hier im Dashboard.</p>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Kategorie</label>
        <select
          name="type"
          required
          className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          defaultValue="QUESTION"
        >
          <option value="QUESTION">Frage</option>
          <option value="BUG">Fehler</option>
          <option value="FEEDBACK">Feedback</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Betreff</label>
        <input
          name="subject"
          required
          minLength={3}
          data-support-subject
          placeholder="Kurz beschreiben…"
          className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Nachricht</label>
        <textarea
          name="message"
          required
          minLength={5}
          rows={5}
          placeholder="Details, Screenshots gern im Text beschreiben…"
          className="mt-1 w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        {isSubmitting ? "Sende..." : "Ticket absenden"}
      </button>
    </form>
  );
}
