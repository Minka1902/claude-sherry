import type { TextareaHTMLAttributes } from "react";
import Field, { CONTROL_CLASS, type FieldProps } from "@/components/Field";

export default function TextArea({ label, hint, error, className, rows = 4, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <textarea rows={rows} className={`${CONTROL_CLASS} resize-y font-mono`} {...rest} />
    </Field>
  );
}
