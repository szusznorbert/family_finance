import type { BackendStatusResponse } from "@household-finance/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const response: BackendStatusResponse = {
    status: "ok",
    service: "household-finance-api",
  };

  return NextResponse.json(response);
}
