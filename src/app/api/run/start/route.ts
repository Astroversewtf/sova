import { NextRequest, NextResponse } from "next/server";
import { getUser, updateUser } from "@/lib/firestore";

export async function POST(req: NextRequest) {
    const { address, keysUsed = 1 } = (await req.json()) as {
        address: string;
        keysUsed?: number;
    };

    const addr = address?.toLowerCase();
    if (!addr) {
        return NextResponse.json({ error: "missing address" }, { status: 400 });
    }

    const keys = Math.min(Math.max(Math.floor(keysUsed), 1), 5);

    const user = await getUser(addr);
    if (!user) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    if (user.keys < keys) {
        return NextResponse.json({ error: "not enough keys", keys: user.keys }, { status: 403 });
    }

    await updateUser(addr, { keys: user.keys - keys });

    return NextResponse.json({
        ok: true,
        keysUsed: keys,
        keysRemaining: user.keys - keys,
    });
}
