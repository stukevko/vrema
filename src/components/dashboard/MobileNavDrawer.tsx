"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, X } from "lucide-react";
import clsx from "clsx";
import { getDashboardNavItems } from "./dashboard-nav-config";

export function DashboardMobileNavDrawer({
  open,
  onOpenChange,
  role,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  plan: string;
}) {
  const pathname = usePathname();
  const items = getDashboardNavItems(role, plan);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[59] bg-black/45 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className={clsx(
            "fixed left-0 top-0 z-[60] flex h-full max-h-[100dvh] w-[min(90vw,20rem)] flex-col border-r border-border bg-background shadow-[8px_0_40px_rgba(0,0,0,0.12)] outline-none",
            "translate-x-[-100%] transition-transform duration-300 ease-out data-[state=open]:translate-x-0"
          )}
        >
          <Dialog.Title className="sr-only">Hauptnavigation</Dialog.Title>
          <Dialog.Description className="sr-only">Menüpunkte und Abmeldung</Dialog.Description>

          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Link
              href="/dashboard"
              className="min-w-0 flex-1 pr-2"
              onClick={() => onOpenChange(false)}
            >
              <Image
                src="/vrema_logo.png"
                alt="VREMA"
                width={200}
                height={56}
                className="h-9 w-auto max-w-full object-contain object-left"
              />
            </Link>
            <Dialog.Close
              type="button"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border text-foreground transition-colors active:scale-95 md:hover:bg-muted/60"
              aria-label="Menü schließen"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="px-4 py-3">
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold capitalize text-foreground">
              {plan} Plan
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {items.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={clsx(
                    "flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-colors active:scale-[0.99]",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                void signOut({ callbackUrl: "/" });
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors active:scale-[0.99] md:hover:bg-red-50 md:hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              Abmelden
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
