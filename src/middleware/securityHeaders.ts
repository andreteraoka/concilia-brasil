import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import securityConfig from "@/src/config/security";

// Security headers middleware
export function withSecurityHeaders(_req: NextRequest) {
  const response = NextResponse.next();

  if (!securityConfig.headers.enabled) {
    return response;
  }

  // Prevent clickjacking attacks
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (for older browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Content Security Policy
  const cspDirectives = Object.entries(securityConfig.headers.contentSecurityPolicy.directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  response.headers.set("Content-Security-Policy", cspDirectives);

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export default withSecurityHeaders;
