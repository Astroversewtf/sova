"use client";

import { usePrivyTransaction } from "@/lib/privy";
import { usePlayerStore } from "@/stores/playerStore";
import { useWallets } from "@privy-io/react-auth";
import { useState } from "react";

const ENTRY_KEY_PRICE = 0.25;

/*
  STORE TAB — placeholder wireframe matching sketch (page 5).
  Layout: [PROMOTION] box + buy, then [key] [orbs] [skin] row with buy buttons.
  Replace border boxes with themed art when ready.
*/
export function ShopTab() {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { sendTransactionBuyKeys } = usePrivyTransaction();
  const wallets = (useWallets().wallets as Array<{ address?: string }>) ?? [];
  const playerStore = usePlayerStore();
  const totalPrice = (ENTRY_KEY_PRICE * quantity).toFixed(4);

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      const txHash = await sendTransactionBuyKeys(totalPrice);

      const res = await fetch("/api/keys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, address: wallets[0]?.address }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Verification failed");
      }

      const { keysAdded } = await res.json();
      playerStore.addKeys(keysAdded);
    } catch (err) {
      console.error("Transaction failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-2">
      <div className="w-full max-w-[500px] flex flex-col items-center gap-4 sm:gap-6">
        {/* Promotion box */}
        <div className="w-full border-2 border-white/30 py-6 sm:py-8 flex flex-col items-center gap-3">
          <span className="font-press-start text-[clamp(10px,2.5vw,18px)] text-white/60">PROMOTION</span>
          <button
            type="button"
            onClick={handleBuy}
            disabled={isLoading}
            className="border-2 border-white/30 px-6 py-2 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <span className="font-press-start text-[clamp(7px,1.6vw,11px)] text-white/50">buy</span>
          </button>
        </div>

        {/* 3 item boxes: key, orbs, skin */}
        <div className="w-full flex gap-2 sm:gap-3">
          {[
            { label: "key", enabled: true },
            { label: "orbs", enabled: false },
            { label: "skin", enabled: false },
          ].map((item) => (
            <div key={item.label} className="flex-1 flex flex-col gap-2">
              <div className="border-2 border-white/30 py-6 sm:py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border border-white/20 flex items-center justify-center">
                  <span className="font-press-start text-[6px] text-white/30">img</span>
                </div>
                <span className="font-press-start text-[clamp(8px,2vw,14px)] text-white/60">{item.label}</span>
              </div>
              <button
                type="button"
                onClick={item.enabled ? handleBuy : undefined}
                disabled={!item.enabled || isLoading}
                className="w-full border-2 border-white/30 py-2 hover:bg-white/10 transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                <span className="font-press-start text-[clamp(6px,1.4vw,10px)] text-white/50">buy</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
