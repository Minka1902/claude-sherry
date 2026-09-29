"use client";
import { useFormStatus } from "react-dom";
import Button, { type ButtonProps } from "@/components/Button";

export default function SubmitButton(props: Omit<ButtonProps, "type" | "href">) {
  const { pending } = useFormStatus();

  return <Button type="submit" loading={pending} {...props} />;
}
