/** Only allow same-site relative redirects (blocks `//evil.com` and absolute URLs). */
export function safeNext(next: string | string[] | undefined, fallback = "/") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
