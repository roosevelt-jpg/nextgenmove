/**
 * Central env access for server secrets.
 * Production injects these from a secrets manager into process.env.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getObservabilityConfig() {
  return {
    sentryDsn: optionalEnv("SENTRY_DSN"),
    environment:
      optionalEnv("VERCEL_ENV") ??
      optionalEnv("NODE_ENV") ??
      "development",
  };
}
