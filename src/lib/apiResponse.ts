import { NextResponse } from "next/server";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function apiCreated<T>(data: T) {
  return apiOk(data, 201);
}

export function apiError(error: string, status = 400) {
  return NextResponse.json<ApiFailure>({ success: false, error }, { status });
}

export function apiUnauthorized(error = "Unauthorized") {
  return apiError(error, 401);
}

export function apiInternalError(error = "Internal server error") {
  return apiError(error, 500);
}
