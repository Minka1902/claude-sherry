export const UNITS_PER_CREDIT = 100;
export const CREDITS_PER_DOLLAR = 2;
export const TOKENS_PER_RATE = 10_000;

export const creditsToUnits = (credits: number) => Math.round(credits * UNITS_PER_CREDIT);

export const unitsToCredits = (units: number) => units / UNITS_PER_CREDIT;

export const dollarsToUnits = (dollars: number) => Math.round(dollars * CREDITS_PER_DOLLAR * UNITS_PER_CREDIT);

export const unitsToCents = (units: number) => Math.floor((units * 100) / (CREDITS_PER_DOLLAR * UNITS_PER_CREDIT));

export const tokenPrice = (tokens: number, ratePer10k: number) => Math.ceil((tokens * ratePer10k) / TOKENS_PER_RATE);

export function formatCredits(units: number) {
  return `${unitsToCredits(units).toLocaleString("en-US", { maximumFractionDigits: 2 })} cr`;
}

export function formatDollars(units: number) {
  return (unitsToCents(units) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Seller is paid for min(tokens, cap); the rest of the hold goes back to the buyer. */
export function splitHold(held: number, tokens: number, tokenCap: number, ratePer10k: number) {
  const charged = Math.min(tokenPrice(Math.min(tokens, tokenCap), ratePer10k), held);
  return { charged, refund: held - charged };
}
