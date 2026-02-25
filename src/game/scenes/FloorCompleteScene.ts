import Phaser from "phaser";

type Rarity = "COMMON" | "RARE" | "EPIC";

interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string;
}

interface FloorCompleteData {
  floor: number;
  marbles: number;
  onComplete: (chosenUpgrade: string, marblesLeft: number) => void;
}

const RARITY_COLORS: Record<Rarity, number> = {
  COMMON: 0x6b7280,
  RARE: 0x3b82f6,
  EPIC: 0xa855f7,
};

const RARITY_BG: Record<Rarity, number> = {
  COMMON: 0x1f2937,
  RARE: 0x1e293b,
  EPIC: 0x1e1b2e,
};

const UPGRADES: Upgrade[] = [
  { id: "extra_energy", name: "ENERGY BOOST", description: "Restore 20 energy", rarity: "COMMON", icon: "E" },
  { id: "coin_magnet", name: "COIN MAGNET", description: "Gain 10 coins", rarity: "COMMON", icon: "$" },
  { id: "thick_skin", name: "THICK SKIN", description: "Reduce damage by 1", rarity: "COMMON", icon: "S" },
  { id: "swift_feet", name: "SWIFT FEET", description: "Move costs 0 energy for 10 turns", rarity: "RARE", icon: "F" },
  { id: "sharp_blade", name: "SHARP BLADE", description: "One-hit kill enemies", rarity: "RARE", icon: "B" },
  { id: "treasure_sense", name: "TREASURE SENSE", description: "Reveal all chests on map", rarity: "RARE", icon: "T" },
  { id: "vampiric", name: "VAMPIRIC", description: "Heal 5 energy per enemy kill", rarity: "EPIC", icon: "V" },
  { id: "phase_walk", name: "PHASE WALK", description: "Walk through walls for 5 turns", rarity: "EPIC", icon: "P" },
  { id: "double_loot", name: "DOUBLE LOOT", description: "All pickups give 2x value", rarity: "EPIC", icon: "2" },
];

export class FloorCompleteScene extends Phaser.Scene {
  private sceneData!: FloorCompleteData;
  private marbles = 0;
  private marblesText!: Phaser.GameObjects.Text;
  private cardElements: Phaser.GameObjects.GameObject[] = [];
  private selectedUpgrades: Upgrade[] = [];

  constructor() {
    super({ key: "FloorCompleteScene" });
  }

  init(data: FloorCompleteData) {
    this.sceneData = data;
    this.marbles = data.marbles;
    this.cardElements = [];
    this.selectedUpgrades = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    // Semi-transparent overlay
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.85);

    // Floor complete title
    this.add
      .text(width / 2, 60, `FLOOR ${this.sceneData.floor} COMPLETE`, {
        fontSize: "18px",
        color: "#f5c542",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    // Marble reward
    this.add
      .text(width / 2, 95, "+10 MARBLES", {
        fontSize: "10px",
        color: "#22c55e",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    // Choose upgrade text
    this.add
      .text(width / 2, 130, "CHOOSE AN UPGRADE", {
        fontSize: "10px",
        color: "#ffffff",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    // Roll 3 random upgrades
    this.rollUpgrades();
    this.drawCards();

    // Reroll button
    const rerollY = height - 80;
    const rerollBtn = this.add
      .rectangle(width / 2, rerollY, 140, 32, 0xf59e0b)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, rerollY, "REROLL -10", {
        fontSize: "8px",
        color: "#0a0a1a",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    rerollBtn.on("pointerover", () => rerollBtn.setFillStyle(0xd97706));
    rerollBtn.on("pointerout", () => rerollBtn.setFillStyle(0xf59e0b));
    rerollBtn.on("pointerdown", () => {
      if (this.marbles >= 10) {
        this.marbles -= 10;
        this.marblesText.setText(`YOU HAVE ${this.marbles} MARBLES`);
        this.clearCards();
        this.rollUpgrades();
        this.drawCards();
      }
    });

    // Marble counter
    this.marblesText = this.add
      .text(width / 2, height - 40, `YOU HAVE ${this.marbles} MARBLES`, {
        fontSize: "8px",
        color: "#22c55e",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);
  }

  private rollUpgrades() {
    // Pick 3 random unique upgrades with rarity weighting
    const pool = [...UPGRADES];
    this.selectedUpgrades = [];

    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      this.selectedUpgrades.push(pool[idx]);
      pool.splice(idx, 1);
    }
  }

  private drawCards() {
    const { width, height } = this.scale;
    const cardW = 150;
    const cardH = 180;
    const gap = 20;
    const totalW = cardW * 3 + gap * 2;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height / 2 + 10;

    this.selectedUpgrades.forEach((upgrade, i) => {
      const cx = startX + i * (cardW + gap);
      const rarityColor = RARITY_COLORS[upgrade.rarity];
      const bgColor = RARITY_BG[upgrade.rarity];

      // Card background
      const card = this.add
        .rectangle(cx, cardY, cardW, cardH, bgColor)
        .setStrokeStyle(2, rarityColor)
        .setInteractive({ useHandCursor: true });
      this.cardElements.push(card);

      // Rarity badge
      const badge = this.add
        .text(cx, cardY - cardH / 2 + 16, upgrade.rarity, {
          fontSize: "6px",
          color: "#" + rarityColor.toString(16).padStart(6, "0"),
          fontFamily: "'Press Start 2P', monospace",
        })
        .setOrigin(0.5);
      this.cardElements.push(badge);

      // Icon
      const icon = this.add
        .text(cx, cardY - 20, upgrade.icon, {
          fontSize: "24px",
          color: "#" + rarityColor.toString(16).padStart(6, "0"),
          fontFamily: "'Press Start 2P', monospace",
        })
        .setOrigin(0.5);
      this.cardElements.push(icon);

      // Name
      const name = this.add
        .text(cx, cardY + 30, upgrade.name, {
          fontSize: "7px",
          color: "#ffffff",
          fontFamily: "'Press Start 2P', monospace",
          wordWrap: { width: cardW - 20 },
          align: "center",
        })
        .setOrigin(0.5);
      this.cardElements.push(name);

      // Description
      const desc = this.add
        .text(cx, cardY + 55, upgrade.description, {
          fontSize: "6px",
          color: "#999999",
          fontFamily: "'Press Start 2P', monospace",
          wordWrap: { width: cardW - 20 },
          align: "center",
        })
        .setOrigin(0.5);
      this.cardElements.push(desc);

      // Card interactions
      card.on("pointerover", () => {
        card.setStrokeStyle(3, 0xf5c542);
        this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 100 });
      });

      card.on("pointerout", () => {
        card.setStrokeStyle(2, rarityColor);
        this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 100 });
      });

      card.on("pointerdown", () => {
        this.selectUpgrade(upgrade);
      });
    });
  }

  private clearCards() {
    for (const el of this.cardElements) {
      el.destroy();
    }
    this.cardElements = [];
  }

  private selectUpgrade(upgrade: Upgrade) {
    // Resume game scene and pass the upgrade
    this.scene.resume("GameScene");
    this.sceneData.onComplete(upgrade.id, this.marbles);
    this.scene.stop();
  }
}
