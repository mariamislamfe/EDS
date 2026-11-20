import { auth } from "@/lib/auth/server";

/**
 * Next.js 16 proxy (formerly middleware). Only the account and dashboard areas
 * require a session; the storefront stays fully public and does no auth work.
 * Staff/admin role checks happen server-side in src/app/admin/layout.tsx and
 * again in every admin server action.
 */
export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
