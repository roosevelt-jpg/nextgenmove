/**
 * Live FX via Frankfurter (ECB rates). Base amounts in the product are EUR;
 * convert for display or alternate charge currencies when needed.
 */

export type FxQuote = {
  from: string;
  to: string;
  rate: number;
  date: string;
  fetchedAt: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { quote: FxQuote; expiresAt: number }>();

function normalizeCode(code: string): string {
  return code.trim().toUpperCase() || "EUR";
}

/**
 * Fetch EUR→target (or any pair) rate from Frankfurter.
 * Same-currency pairs short-circuit to rate 1.
 */
export async function getFxRate(
  from: string,
  to: string,
): Promise<FxQuote> {
  const fromCode = normalizeCode(from);
  const toCode = normalizeCode(to);
  const cacheKey = `${fromCode}:${toCode}`;

  if (fromCode === toCode) {
    return {
      from: fromCode,
      to: toCode,
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      fetchedAt: new Date().toISOString(),
    };
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const url = new URL("https://api.frankfurter.app/latest");
  url.searchParams.set("from", fromCode);
  url.searchParams.set("to", toCode);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`fx_fetch_failed:${response.status}`);
  }

  const data = (await response.json()) as {
    amount?: number;
    base?: string;
    date?: string;
    rates?: Record<string, number>;
  };

  const rate = data.rates?.[toCode];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("fx_rate_missing");
  }

  const quote: FxQuote = {
    from: fromCode,
    to: toCode,
    rate,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
  return quote;
}

/** Convert a major-unit amount (e.g. euros) using a live Frankfurter rate. */
export async function convertAmount(
  amount: number,
  from: string,
  to: string,
): Promise<{ amount: number; quote: FxQuote }> {
  const quote = await getFxRate(from, to);
  return {
    amount: Math.round(amount * quote.rate * 100) / 100,
    quote,
  };
}

/**
 * Convert major units to Stripe minor units after FX.
 * Falls back to the source amount (no conversion) if Frankfurter is unreachable.
 */
export async function convertToMinorUnitsSafe(
  amountMajor: number,
  from: string,
  to: string,
): Promise<{
  amountMinor: number;
  currency: string;
  fxRate: number | null;
  fxDate: string | null;
}> {
  const fromCode = normalizeCode(from);
  const toCode = normalizeCode(to);

  try {
    const { amount, quote } = await convertAmount(amountMajor, fromCode, toCode);
    return {
      amountMinor: Math.round(amount * 100),
      currency: toCode.toLowerCase(),
      fxRate: quote.rate,
      fxDate: quote.date,
    };
  } catch {
    return {
      amountMinor: Math.round(amountMajor * 100),
      currency: fromCode.toLowerCase(),
      fxRate: null,
      fxDate: null,
    };
  }
}
