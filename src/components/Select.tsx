import type { SelectHTMLAttributes } from "react";
import Field, { CONTROL_CLASS, type FieldProps } from "@/components/Field";

export type Option = { value: string; label: string };

export default function Select({ label, hint, error, className, options, placeholder, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <select className={CONTROL_CLASS} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
