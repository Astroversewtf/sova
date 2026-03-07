import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const snap = await getDoc(doc(db, "betaCodes", code));
  if (snap.exists() && snap.data().active) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
