import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Slipway reads task folders and job logs that can hold private code and
 * keys, and promises they never leave the browser. The policy makes that a
 * rule the browser enforces, not just something the code happens to do:
 * connect-src, img-src and form-action allow only this origin (plus local
 * blob/data URLs), so no script — ours, a dependency's or an injected one —
 * can send imported files elsewhere.
 *
 * No nonces: Partial Prerendering serves a static shell, which cannot carry
 * a per-request nonce (see node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md, "Without Nonces").
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
