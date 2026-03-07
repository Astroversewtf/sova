"use client";

import { usePrivyTransaction } from "@/lib/privy";
import { usePlayerStore } from "@/stores/playerStore";
import { useState } from "react";


const SHOP_ITEMS = {
  golden_ticket: { icon: "🎫", label: "Golden Ticket", price: 0.5, action: "addTickets" },
  key:           { icon: "🗝️", label: "Keys",          price: 0.25, action: "addKeys" },
} as const;

type ShopItemKey = keyof typeof SHOP_ITEMS;
type StoreAction = "addTickets" | "addKeys";


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
        onClick={() => setQuantity(Math.max(1, quantity - 10))}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[10px] w-6 h-6 rounded hover:bg-white/20"
      >
        -10
      </button>
      <button
        onClick={() => setQuantity(Math.max(1, quantity - 5))}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[10px] w-6 h-6 rounded hover:bg-white/20"
      >
        -5
      </button>
      <button
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[10px] w-6 h-6 rounded hover:bg-white/20"
      >
        -1
      </button>
      <span className="font-pixel text-xs text-white w-8 text-center">
        {quantity}
      </span>
      <button
        onClick={() => setQuantity(quantity + 1)}
        className="bg-white/10 border border-white/10 text-gray-300 font-pixel text-[10px] w-6 h-6 rounded hover:bg-white/20"
      >
        +1
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

function PackageSlot({ itemKey }: { itemKey: ShopItemKey}) {
  const item = SHOP_ITEMS[itemKey];
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { sendTransactionBuyAVAX } = usePrivyTransaction();
  const playerStore = usePlayerStore();

  const totalPrice = (item.price * quantity).toFixed(4);

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      const receipt = await sendTransactionBuyAVAX(totalPrice);
      console.log("Transaction success", receipt);
      //TODO CHECK IN CHAIN TRANSACTION
      const action = item.action as StoreAction;
      playerStore[action](quantity);
    } catch (err) {
      console.error("Transaction failed", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-4 text-center backdrop-blur-sm">
      <span className="text-2xl">{item.icon}</span>
      <div className="font-pixel text-sm text-white mt-2 text-outline">{item.label}</div>
      <div className="font-pixel text-xs text-gray-400 mt-1 text-outline">{item.price} AVAX</div>
      <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
      <button className="w-full mt-3 bg-[#b8e550] hover:bg-[#c5ed65] text-white font-pixel text-[10px] py-2 rounded transition-all text-outline" 
      disabled={isLoading}
      onClick={handleBuy}
      >
        BUY NOW {totalPrice} AVAX
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
        <div className="grid grid-cols-1 gap-4">
          <PackageSlot itemKey="golden_ticket" />
        </div>
      </div>

      <div>
        <h3 className="font-pixel text-sm text-blue-400 mb-4 uppercase text-outline">
          Dungeon Keys
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <PackageSlot itemKey="key"/>
        </div>
      </div>
    </div>
  );
}
