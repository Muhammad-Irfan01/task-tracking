import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_COOKIE, SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

const isPlatformPath = (pathname: string) =>
  pathname === "/platform" || pathname.startsWith("/platform/") || pathname.startsWith("/api/platform/") || pathname === "/api/platform";

/**
 * Cheap optimistic gate: bounce requests without the right session cookie —
 * the platform console needs a super-admin session, everything else an agent
 * session. Signatures are verified properly by the layouts and every API route.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const cookie = isPlatformPath(pathname) ? PLATFORM_COOKIE : SESSION_COOKIE;
  if (request.cookies.has(cookie)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "You need to sign in" }, { status: 401 });
  }

  // A super admin opening the desk, or an agent opening the console, lands on their own home.
  const otherHome = isPlatformPath(pathname) ? "/" : "/platform";
  if (request.cookies.has(isPlatformPath(pathname) ? SESSION_COOKIE : PLATFORM_COOKIE)) {
    return NextResponse.redirect(new URL(otherHome, request.url));
  }

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
