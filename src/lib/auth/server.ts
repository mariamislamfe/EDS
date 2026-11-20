import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";

/** Neon Auth (managed Better Auth). One instance for handler, proxy and session reads. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? "https://not-configured.invalid",
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET ?? "development-only-cookie-secret-change-me-32+" },
  logLevel: "warn",
});
