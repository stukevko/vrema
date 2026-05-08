"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  label,
  pendingLabel,
  className,
  name,
  value,
  disabled: disabledProp,
}: {
  label: string;
  pendingLabel?: string;
  className: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || Boolean(disabledProp)}
      className={className}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {pending ? pendingLabel ?? "Wird verarbeitet..." : label}
    </button>
  );
}
