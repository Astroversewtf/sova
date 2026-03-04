"use client";

import { usePrivyTransaction } from "@/lib/privy";
import { send } from "@avalanche-sdk/client/methods/wallet";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

const WALLET =  process.env.NEXT_WALLET_HASH as `0x${string}`

const PRICES = {
  goldenTicket: 0.5,
  key: 0.1
}

function QuantitySelector({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (q: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[10px] w-6 h-6 rounded hover:bg-white/20"
      >
        -
      </button>
      <span className="font-pixel text-xs text-white w-8 text-center">
        {quantity}
      </span>
      <button
        onClick={() => setQuantity(quantity + 1)}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[10px] w-6 h-6 rounded hover:bg-white/20"
      >
        +
      </button>
      <button
        onClick={() => setQuantity(quantity + 5)}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[9px] px-1.5 h-6 rounded hover:bg-white/20 ml-1"
      >
        +5
      </button>
      <button
        onClick={() => setQuantity(quantity + 10)}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[9px] px-1.5 h-6 rounded hover:bg-white/20"
      >
        +10
      </button>
    </div>
  );
}

function PackageSlot({ icon, label, unitPrice }: { icon: string; label: string; unitPrice: number }) {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { sendTransactionBuy } = usePrivyTransaction();

  const totalPrice = (unitPrice * quantity).toFixed(4);

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      const receipt = await sendTransactionBuy(WALLET, totalPrice);
      console.log("Transaction success", receipt);
      //TODO credit in game items
    } catch (err) {
      console.error("Transaction failed", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-4 text-center backdrop-blur-sm">
      <span className="text-2xl">{icon}</span>
      <div className="font-pixel text-sm text-white mt-2 text-outline">{label}</div>
      <div className="font-pixel text-xs text-gray-400 mt-1 text-outline">{unitPrice} AVAX</div>
      <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
      <button className="w-full mt-3 bg-[#b8e550] hover:bg-[#c5ed65] text-white font-pixel text-[10px] py-2 rounded transition-all text-outline" 
      disabled={isLoading}
      onClick={handleBuy}
      >
        BUY NOW {totalPrice}
      </button>
    </div>
  );
}

export function ShopTab() {
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-8">
        <h3 className="font-pixel text-sm text-amber-400 mb-4 uppercase text-outline">
          Golden Tickets
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <PackageSlot icon="🎫" label="1x Golden Ticket" unitPrice={PRICES.goldenTicket} />
          <PackageSlot icon="🎫" label="5x Golden Tickets" unitPrice={PRICES.goldenTicket} />
          <PackageSlot icon="🎫" label="10x Golden Tickets" unitPrice={PRICES.goldenTicket} />
        </div>
      </div>

      <div>
        <h3 className="font-pixel text-sm text-blue-400 mb-4 uppercase text-outline">
          Dungeon Keys
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <PackageSlot icon="🗝️" label="10x Keys" unitPrice={PRICES.key}/>
          <PackageSlot icon="🗝️" label="20x Keys" unitPrice={PRICES.key}/>
          <PackageSlot icon="🗝️" label="50x Keys" unitPrice={PRICES.key}/>
        </div>
      </div>
    </div>
  );
}
