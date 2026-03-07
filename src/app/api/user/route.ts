import { NextRequest, NextResponse } from "next/server";
import { createUser, getUser, updateUser } from "@/lib/firestore";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "missing address" }, { status: 400 });
  const user = await getUser(address);
  return NextResponse.json(user);
}

export async function POST(req: NextRequest) {
  const { address } = await req.json();
  const user = await createUser(address);
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const { address, ...data } = await req.json();
  await updateUser(address, data);
  return NextResponse.json({ ok: true });
}
