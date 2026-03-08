import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/firestore";

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type") === "weekly" ? "weekly" : "best";
    const entries = await getLeaderboard(type);
    return NextResponse.json(entries);
}
