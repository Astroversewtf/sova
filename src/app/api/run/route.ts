import { NextRequest, NextResponse } from "next/server";
import type { RunStats } from "@/game/types"
import { getUser, saveRun, updateLeaderboard, updateUser } from "@/lib/firestore";

export async function POST(req: NextRequest) {
    const { address, stats, floor, keysUsed = 1 } = (await req.json()) as {
        address: string;
        stats: RunStats;
        floor: number;
        keysUsed?: number;
    };

    const addr = address?.toLowerCase();
    if(!addr || !stats) {
        return NextResponse.json({ error: "missing address or stats"}, { status: 400 });
    }

    const user = await getUser(addr);
    if(!user) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    await saveRun(addr, stats);

    const multiplier = Math.min(Math.max(keysUsed, 1), 15);

    const newCoins = user.coins + stats.coinsCollected;
    const newGems = user.gems + stats.orbsCollected;
    const newTickets = user.goldenTickets + stats.goldenTicketsCollected;

    const score = stats.coinsCollected;
    const newBestScore = Math.max(user.bestScore, score);
    const newWeeklyScore = Math.max(user.weeklyScore, score);

    await updateUser(addr, {
        coins: newCoins,
        gems: newGems,
        goldenTickets: newTickets,
        bestScore: newBestScore,
        weeklyScore: newWeeklyScore,
    });

    const leaderboardData = {
        player: addr,
        score: score,
        coins: newCoins,
        gems: newGems,
        keys: user.keys
    }

    await updateLeaderboard("best", addr, { ...leaderboardData, score: newBestScore });
    await updateLeaderboard("weekly", addr, { ...leaderboardData, score: newWeeklyScore });

    return NextResponse.json({
        coins: newCoins,
        gems: newGems,
        goldenTickets: newTickets,
        bestScore: newBestScore,
        weeklyScore: newWeeklyScore,
        runScore: score
    });
}
