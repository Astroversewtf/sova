"use client";

import { usePrivyTransaction } from "@/lib/privy";
import { usePlayerStore } from "@/stores/playerStore";
import { useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { OverlayFrame } from "@/components/OverlayFrame";

const ENTRY_KEY_PRICE = 0.25;

export function ShopTab() {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { sendTransactionBuyKeys } = usePrivyTransaction();
  const { wallets } = useWallets();
  const playerStore = usePlayerStore();
  const totalPrice = (ENTRY_KEY_PRICE * quantity).toFixed(4);

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      const txHash = await sendTransactionBuyKeys(totalPrice);
      console.log("Transaction success", txHash);

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
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="font-pixel text-xs text-white text-outline uppercase">
            BUY ENTRY KEYS
          </span>

          <img
            src="/sprites/items/key/key_02.png"
            alt="Entry key"
            className="w-10 h-10"
            style={{ imageRendering: "pixelated" }}
          />

          {/* +5  +10  MAX */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity(quantity + 5)}>
              <img
                src="/sprites/ui/buttons/buttons_five_01.png"
                alt="+5"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
            <button type="button" onClick={() => setQuantity(quantity + 10)}>
              <img
                src="/sprites/ui/buttons/buttons_ten_01.png"
                alt="+10"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
            <button type="button" onClick={() => setQuantity(99)}>
              <img
                src="/sprites/ui/buttons/buttons_max_01.png"
                alt="MAX"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
          </div>

          {/* -  [key + count]  + */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <img
                src="/sprites/ui/buttons/buttons_minus_02.png"
                alt="-"
                className="h-12 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>

            <OverlayFrame
              className="h-12 min-w-[180px]"
              contentClassName="flex items-center justify-center gap-3 !p-0"
              namePrefix="square"
              edge={16}
              innerEdge={16}
            >
              <img
                src="/sprites/items/key/key_02.png"
                alt=""
                className="w-6 h-6"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start text-xl text-white text-outline">{quantity}</span>
            </OverlayFrame>

            <button type="button" onClick={() => setQuantity(quantity + 1)}>
              <img
                src="/sprites/ui/buttons/buttons_plus_02.png"
                alt="+"
                className="h-12 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
          </div>

          <span className="font-press-start text-[10px] text-[#b4c0cf] text-outline">
            TOTAL: {totalPrice} AVAX
          </span>

          <button
            type="button"
            onClick={handleBuy}
            disabled={isLoading}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="/sprites/ui/buttons/buttons_buy_01.png"
              alt="BUY"
              className="h-12 w-auto"
              style={{ imageRendering: "pixelated" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
