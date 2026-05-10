"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
      className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] md:p-6"
    >
      <header>
        <h2 className="text-base font-semibold text-fg">Neues Ticket</h2>
        <p className="mt-1 text-xs text-fg-muted">
          Wir melden uns so schnell wie möglich – mit Antwort hier im Dashboard.
        </p>
      </header>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-muted" htmlFor="support-type">
          Kategorie
        </label>
        <select
          id="support-type"
          name="type"
          required
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg"
          defaultValue="QUESTION"
        >
          <option value="QUESTION">Frage</option>
          <option value="BUG">Fehler</option>
          <option value="FEEDBACK">Feedback</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-muted" htmlFor="support-subject">
          Betreff
        </label>
        <input
          id="support-subject"
          name="subject"
          required
          minLength={3}
          data-support-subject
          placeholder="Kurz beschreiben…"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-muted" htmlFor="support-message">
          Nachricht
        </label>
        <textarea
          id="support-message"
          name="message"
          required
          minLength={5}
          rows={5}
          placeholder="Details, Screenshots gern im Text beschreiben…"
          className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg"
        />
      </div>

      <Button
        type="submit"
        variant="brand"
        size="lg"
        fullWidth
        loading={isSubmitting}
        leadingIcon={!isSubmitting ? <Send className="h-4 w-4" /> : undefined}
      >
        {isSubmitting ? "Sende…" : "Ticket absenden"}
      </Button>
    </form>
  );
}
