"use client";

import Link from "next/link";
import { Drawer } from "vaul";
import { Sparkles, X } from "lucide-react";
import { upgradeSheetContent, type UpgradeReason } from "@/lib/plan-upgrade-messages";

export function UpgradeSheet({
  open,
  reason,
  onClose,
}: {
  open: boolean;
  reason: UpgradeReason | null;
  onClose: () => void;
}) {
  if (!reason) return null;
  const content = upgradeSheetContent(reason);

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-card outline-none dark:border-white/10 dark:bg-surface">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand">{content.eyebrow}</p>
              <Drawer.Title className="mt-1 text-xl font-bold tracking-tight text-foreground">
                {content.title}
              </Drawer.Title>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3">
            <p className="text-sm leading-relaxed text-muted-foreground">{content.body}</p>
            {content.secondary ? (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground/90">{content.secondary}</p>
            ) : null}
            <Link
              href={content.href}
              onClick={onClose}
              className="btn-brand mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold shadow-[var(--shadow-button)] active:scale-[0.99]"
            >
              <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
              {content.cta}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full min-h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Später
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
