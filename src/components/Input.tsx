import type { InputHTMLAttributes } from "react";
import Field, { CONTROL_CLASS, type FieldProps } from "@/components/Field";

export default function Input({ label, hint, error, className, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <input className={CONTROL_CLASS} {...rest} />
    </Field>
  );
}
