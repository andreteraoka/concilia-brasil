import { apiOk } from "@/src/lib/apiResponse";

export async function POST() {
  const response = apiOk({ message: "Logout realizado" });
  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
