import { auth } from "@/lib/auth/server";

// Proxies Neon Auth (Better Auth) API requests: sign-in cookies, session refresh, password reset links.
export const { GET, POST, PUT, PATCH, DELETE } = auth.handler();
