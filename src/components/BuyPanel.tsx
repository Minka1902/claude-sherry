"use client";
import { useState } from "react";
import ActionForm from "@/components/ActionForm";
import Button from "@/components/Button";
import Card from "@/components/Card";
import CreditAmount from "@/components/CreditAmount";
import Input from "@/components/Input";
import RepoPicker from "@/components/RepoPicker";
import TextArea from "@/components/TextArea";
import { buyAction } from "@/actions/orders";
import { tokenPrice } from "@/lib/credits";
import { MAX_PROMPT_LENGTH, MAX_PROMPT_TOKENS } from "@/lib/limits";

const DEFAULT_MAX_TOKENS = 20_000;

export type BuyPanelProps = {
  sellerId: string;
  ratePer10k: number;
  sessionPrice: number;
  sessionMinutes: number;
  sessionTokenCap: number;
  balance: number | null;
  className?: string;
};

export default function BuyPanel({ sellerId, ratePer10k, sessionPrice, sessionMinutes, sessionTokenCap, balance, className }: BuyPanelProps) {
  const [type, setType] = useState<"PROMPT" | "SESSION">("PROMPT");
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const price = type === "PROMPT" ? tokenPrice(maxTokens || 0, ratePer10k) : sessionPrice;

  if (balance === null) {
    return (
      <Card title="Buy" className={className}>
        <Button href="/login" fullWidth>
          Sign in with GitHub to buy
        </Button>
      </Card>
    );
  }
  return (
    <Card title="Buy" className={className}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button type="button" variant={type === "PROMPT" ? "primary" : "secondary"} onClick={() => setType("PROMPT")}>
          Single prompt
        </Button>
        <Button type="button" variant={type === "SESSION" ? "primary" : "secondary"} onClick={() => setType("SESSION")}>
          Session
        </Button>
      </div>
      <ActionForm action={buyAction} hidden={{ sellerId, type }} submitLabel="Buy" submitFullWidth>
        <RepoPicker />
        {type === "PROMPT" ? (
          <>
            <TextArea name="prompt" label="Prompt" rows={6} required maxLength={MAX_PROMPT_LENGTH} placeholder="What should be built or fixed?" />
            <Input
              name="maxTokens"
              type="number"
              label="Max output tokens"
              min={1}
              max={MAX_PROMPT_TOKENS}
              step={1}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Math.floor(Number(e.target.value)))}
              hint={
                <>
                  <CreditAmount units={ratePer10k} /> per 10k added-code tokens. Unused tokens are refunded.
                </>
              }
            />
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            {sessionMinutes} minutes or {sessionTokenCap.toLocaleString()} output tokens, whichever comes first. The clock starts when the seller accepts. Full refund if nothing is delivered.
          </p>
        )}
        <div className="flex justify-between border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <span>{type === "PROMPT" ? "Held now (max)" : "Price"}</span>
          <CreditAmount units={price} withDollars className="font-semibold" />
        </div>
        <p className={`text-xs ${balance < price ? "text-red-600" : "text-zinc-500"}`}>
          Balance: <CreditAmount units={balance} />
        </p>
      </ActionForm>
    </Card>
  );
}
