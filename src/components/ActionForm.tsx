"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import SubmitButton from "@/components/SubmitButton";
import type { ButtonProps } from "@/components/Button";
import type { ActionState } from "@/lib/action";

export type ActionFormProps = {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  submitLabel?: ReactNode;
  submitVariant?: ButtonProps["variant"];
  submitSize?: ButtonProps["size"];
  submitFullWidth?: boolean;
  confirm?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  inline?: boolean;
  className?: string;
  children?: ReactNode;
};

export default function ActionForm({
  action,
  hidden,
  submitLabel = "Save",
  submitVariant,
  submitSize,
  submitFullWidth,
  confirm,
  successMessage,
  resetOnSuccess,
  inline,
  className = "",
  children,
}: ActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => confirm && !window.confirm(confirm) && e.preventDefault()}
      className={`${inline ? "inline-flex items-center gap-2" : "flex flex-col gap-4"} ${className}`}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <SubmitButton variant={submitVariant} size={submitSize} fullWidth={submitFullWidth}>
        {submitLabel}
      </SubmitButton>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
    </form>
  );
}
