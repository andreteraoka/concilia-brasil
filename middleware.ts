import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

type TokenPayload = {
  userId?: string;
  companyId?: string;
  role?: string;
};

function apiError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function getToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return request.cookies.get("token")?.value || null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedApi = pathname.startsWith("/api/protected/");

  if (!isProtectedApi) {
    return NextResponse.next();
  }

  const token = getToken(request);
  if (!token) {
    return apiError("Token ausente", 401);
  }

  try {
    const payload = verifyToken(token) as TokenPayload;

    if (!payload.userId || !payload.companyId || !payload.role) {
      return apiError("Token inválido", 401);
    }

    const headers = new Headers(request.headers);
    headers.set("x-user-id", payload.userId);
    headers.set("x-company-id", payload.companyId);
    headers.set("x-user-role", payload.role);

    return NextResponse.next({
      request: {
        headers,
      },
    });
  } catch {
    return apiError("Token inválido", 401);
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
