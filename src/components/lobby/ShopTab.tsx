"use client";

import { useState } from "react";

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

function PackageSlot({ icon, label }: { icon: string; label: string }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-4 text-center backdrop-blur-sm">
      <span className="text-2xl">{icon}</span>
      <div className="font-pixel text-sm text-white mt-2">{label}</div>
      <div className="font-pixel text-xs text-gray-400 mt-1">-- AVAX</div>
      <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
      <button className="w-full mt-3 bg-[#b8e550] hover:bg-[#c5ed65] text-gray-900 font-pixel text-[10px] py-2 rounded transition-all">
        BUY NOW
      </button>
    </div>
  );
}

export function ShopTab() {
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-8">
        <h3 className="font-pixel text-sm text-amber-400 mb-4 uppercase">
          Golden Tickets
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <PackageSlot icon="🎫" label="1x Golden Ticket" />
          <PackageSlot icon="🎫" label="5x Golden Tickets" />
          <PackageSlot icon="🎫" label="10x Golden Tickets" />
        </div>
      </div>

      <div>
        <h3 className="font-pixel text-sm text-blue-400 mb-4 uppercase">
          Dungeon Keys
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <PackageSlot icon="🗝️" label="10x Keys" />
          <PackageSlot icon="🗝️" label="20x Keys" />
          <PackageSlot icon="🗝️" label="50x Keys" />
        </div>
      </div>
    </div>
  );
}
