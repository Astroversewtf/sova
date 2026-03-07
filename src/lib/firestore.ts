import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { RunStats } from "@/game/types";


export interface UserDoc {
  coins: number;
  gems: number;
  keys: number;
  goldenTickets: number;
  totalEarnings: number;
  weeklyEarnings: number;
  jackpotEarnings: number;
  bestScore: number;
  weeklyScore: number;
  createdAt: unknown;
  lastLoginAt: unknown;
}

export interface PurchaseDoc {
  item: "golden_ticket" | "key";
  quantity: number;
  priceAVAX: number;
  txHash: string;
  purchasedAt: unknown;
}


export interface LeaderboardDoc {
  player: string;
  score: number;
  coins: number;
  gems: number;
  keys: number;
  updatedAt: unknown;
}

export interface QuestDoc {
  title: string;
  description: string;
  category: "daily" | "weekly" | "event";
  target: number;
  reward: { type: string; amount: number };
  active: boolean;
}

export interface ChatDoc {
  sender: string;
  senderColor: string;
  message: string;
  isSystem: boolean;
  timestamp: unknown;
}


export async function createUser(walletAddress: string) {
  const ref = doc(db, "users", walletAddress);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, { lastLoginAt: serverTimestamp() });
    return snap.data() as UserDoc;
  }

  const newUser: UserDoc = {
    coins: 0,
    gems: 0,
    keys: 0,
    goldenTickets: 0,
    totalEarnings: 0,
    weeklyEarnings: 0,
    jackpotEarnings: 0,
    bestScore: 0,
    weeklyScore: 0,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(ref, newUser);
  return newUser;
}

export async function getUser(walletAddress: string) {
  const snap = await getDoc(doc(db, "users", walletAddress));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function updateUser(
  walletAddress: string,
  data: Partial<Omit<UserDoc, "createdAt">>
) {
  await updateDoc(doc(db, "users", walletAddress), data);
}

export async function addCoins(walletAddress: string, amount: number) {
  await updateDoc(doc(db, "users", walletAddress), {
    coins: increment(amount),
  });
}

export async function addGems(walletAddress: string, amount: number) {
  await updateDoc(doc(db, "users", walletAddress), {
    gems: increment(amount),
  });
}

export async function addKeys(walletAddress: string, amount: number) {
  await updateDoc(doc(db, "users", walletAddress), {
    keys: increment(amount),
  });
}

export async function addTickets(walletAddress: string, amount: number) {
  await updateDoc(doc(db, "users", walletAddress), {
    goldenTickets: increment(amount),
  });
}


export async function saveRun(walletAddress: string, stats: RunStats) {
  await addDoc(collection(db, "users", walletAddress, "runs"), {
    ...stats,
    completedAt: serverTimestamp(),
  });
}

export async function getUserRuns(walletAddress: string, max = 20) {
  const q = query(
    collection(db, "users", walletAddress, "runs"),
    orderBy("completedAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}


export async function savePurchase(
  walletAddress: string,
  purchase: Omit<PurchaseDoc, "purchasedAt">
) {
  await addDoc(collection(db, "users", walletAddress, "purchases"), {
    ...purchase,
    purchasedAt: serverTimestamp(),
  });
}


export async function updateLeaderboard(
  type: "weekly" | "best",
  walletAddress: string,
  data: Omit<LeaderboardDoc, "updatedAt">
) {
  const collName = type === "weekly" ? "leaderboard_weekly" : "leaderboard_best";
  await setDoc(doc(db, collName, walletAddress), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getLeaderboard(type: "weekly" | "best", max = 100) {
  const collName = type === "weekly" ? "leaderboard_weekly" : "leaderboard_best";
  const q = query(
    collection(db, collName),
    orderBy("score", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => {
    const data = d.data() as Omit<LeaderboardDoc, "updatedAt">;
    return {
      rank: i + 1,
      ...data,
      player: data.player || d.id,
    };
  });
}


export async function getActiveQuests() {
  const q = query(collection(db, "quests"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as QuestDoc) }))
    .filter((q) => q.active);
}


export async function sendChatMessage(
  data: Omit<ChatDoc, "timestamp">
) {
  await addDoc(collection(db, "chat"), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

export function onChatMessages(
  callback: (messages: (ChatDoc & { id: string })[]) => void,
  max = 50
): Unsubscribe {
  const q = query(
    collection(db, "chat"),
    orderBy("timestamp", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as ChatDoc) }))
      .reverse();
    callback(messages);
  });
}