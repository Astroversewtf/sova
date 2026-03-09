"use client";

import { usePrivyTransaction } from "@/lib/privy";
import { usePlayerStore } from "@/stores/playerStore";
import { useWallets } from "@privy-io/react-auth";
import { useState } from "react";

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
      const receipt = await sendTransactionBuyKeys(quantity, totalPrice);
      console.log("Transaction success", receipt);

      const address = wallets[0]?.address;
      const res = await fetch("/api/keys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: receipt.hash, address }),
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
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-[760px] space-y-4">
        <h3 className="font-pixel text-sm text-white uppercase text-outline">ENTRY KEYS</h3>

        <div className="rounded-md border border-[#3b4652] bg-[#0f1722] p-5">
          <div className="flex justify-center">
            <img
              src="/sprites/items/key/key_02.png"
              alt="Entry key"
              className="w-12 h-12"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-14 w-14 rounded-md border border-[#313e4f] bg-[#1a2431] font-press-start text-2xl leading-none text-white text-outline"
              aria-label="Decrease quantity"
            >
              -
            </button>

            <div className="h-14 min-w-[200px] rounded-md border border-[#32506f] bg-[#0e1c2b] px-4 flex items-center justify-center gap-3">
              <img
                src="/sprites/items/key/key_02.png"
                alt=""
                className="w-6 h-6"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start text-2xl text-white text-outline">{quantity}</span>
            </div>

            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="h-14 w-14 rounded-md border border-[#313e4f] bg-[#1a2431] font-press-start text-2xl leading-none text-white text-outline"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(quantity + 5)}
              className="h-9 min-w-[90px] rounded-md border border-[#313e4f] bg-[#1a2431] px-4 font-press-start text-[10px] text-white text-outline"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 10)}
              className="h-9 min-w-[90px] rounded-md border border-[#313e4f] bg-[#1a2431] px-4 font-press-start text-[10px] text-white text-outline"
            >
              +10
            </button>
          </div>

          <div className="mt-4 text-center font-press-start text-xs text-[#b4c0cf] text-outline">
            TOTAL: {totalPrice} AVAX
          </div>

          <button
            type="button"
            onClick={handleBuy}
            disabled={isLoading}
            className="mt-4 w-full rounded-md bg-[#6fb6ff] py-3 font-pixel text-sm text-white text-outline hover:bg-[#87c4ff] transition-colors disabled:cursor-not-allowed"
          >
            BUY
          </button>
        </div>
      </div>
    </div>
  );
}
