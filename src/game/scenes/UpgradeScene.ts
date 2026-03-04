import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, UPGRADES, C } from "../constants";
import type { UpgradeDef, UpgradeId } from "../types";
import { useGameStore } from "@/stores/gameStore";

interface UpgradeSceneData {
  floor: number;
  onComplete: (id: UpgradeId) => void;
}

/**
 * Upgrade selection screen matching Maze of Gains style:
 * - "FLOOR X COMPLETE!" title
 * - "+10 ENERGY" bonus indicator
 * - "CHOOSE AN UPGRADE" subtitle
 * - 3 upgrade cards with rarity badges and descriptions
 * - Reroll button (-10 energy)
 */
export class UpgradeScene extends Phaser.Scene {
  private onComplete!: (id: UpgradeId) => void;
  private choices: UpgradeDef[] = [];
  private cardObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: "UpgradeScene" });
  }

  create(data: UpgradeSceneData) {
    const { floor, onComplete } = data;
    this.onComplete = onComplete;

    // Apply +10 energy bonus
    const store = useGameStore.getState();
    const energyBonus = 10;
    store.setEnergy(Math.min(store.energy + energyBonus, store.maxEnergy));

    // Dim overlay
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.8,
    );

    // ── Title: "FLOOR X COMPLETE!" ──
    this.add
      .text(GAME_WIDTH / 2, 50, `FLOOR ${floor} COMPLETE!`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "14px",
        color: "#4ade80",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // ── "+10 ENERGY" bonus ──
    const bonusBg = this.add.graphics();
    bonusBg.fillStyle(0x16a34a, 0.8);
    bonusBg.fillRoundedRect(GAME_WIDTH / 2 - 50, 72, 100, 20, 4);

    this.add
      .text(GAME_WIDTH / 2, 82, `+${energyBonus} ENERGY`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#bbf7d0",
      })
      .setOrigin(0.5);

    // ── "CHOOSE AN UPGRADE" subtitle ──
    this.add
      .text(GAME_WIDTH / 2, 108, "CHOOSE AN UPGRADE", {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    // Roll 3 choices
    this.choices = this.rollChoices();
    this.renderCards();

    // ── Reroll button ──
    const rerollY = GAME_HEIGHT - 50;
    const rerollBg = this.add
      .rectangle(GAME_WIDTH / 2, rerollY, 120, 28, 0x854d0e, 0.9)
      .setStrokeStyle(1, 0xfbbf24)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, rerollY, "REROLL  -10", {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#fbbf24",
      })
      .setOrigin(0.5);

    rerollBg.on("pointerover", () => rerollBg.setStrokeStyle(2, 0xfde68a));
    rerollBg.on("pointerout", () => rerollBg.setStrokeStyle(1, 0xfbbf24));
    rerollBg.on("pointerdown", () => {
      const s = useGameStore.getState();
      if (s.energy <= 10) return; // Can't afford
      s.setEnergy(s.energy - 10);
      this.choices = this.rollChoices();
      this.clearCards();
      this.renderCards();
    });
  }

  private rollChoices(): UpgradeDef[] {
    const store = useGameStore.getState();
    const available = UPGRADES.filter((u) => {
      if (!u.stackable && (store.upgrades[u.id] ?? 0) > 0) return false;
      return true;
    });
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  private clearCards() {
    for (const obj of this.cardObjects) obj.destroy();
    this.cardObjects = [];
  }

  private renderCards() {
    const cardW = 170;
    const cardH = 230;
    const cardY = GAME_HEIGHT / 2 + 20;

    this.choices.forEach((upgrade, i) => {
      const cardX = GAME_WIDTH / 2 + (i - 1) * (cardW + 16);
      this.createCard(cardX, cardY, cardW, cardH, upgrade, i);
    });
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    upgrade: UpgradeDef,
    index: number,
  ) {
    const store = useGameStore.getState();
    const stacks = store.upgrades[upgrade.id] ?? 0;

    // Determine rarity
    const rarity = this.getRarity(upgrade);
    const rarityColor = rarity === "Epic" ? C.RARITY_EPIC : rarity === "Rare" ? C.RARITY_RARE : C.RARITY_COMMON;
    const rarityLabel = rarity.toUpperCase();

    // Card background
    const cardG = this.add.graphics();
    // Outer glow
    cardG.fillStyle(rarityColor, 0.15);
    cardG.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 8);
    // Card body
    cardG.fillStyle(C.CARD_BG, 0.95);
    cardG.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    // Border
    cardG.lineStyle(2, rarityColor, 0.8);
    cardG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    this.cardObjects.push(cardG);

    // Rarity badge (top of card)
    const badgeG = this.add.graphics();
    badgeG.fillStyle(rarityColor, 0.9);
    badgeG.fillRoundedRect(x - 30, y - h / 2 + 8, 60, 16, 3);
    this.cardObjects.push(badgeG);

    const badgeText = this.add
      .text(x, y - h / 2 + 16, rarityLabel, {
        fontFamily: '"8bit Wonder"',
        fontSize: "6px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.cardObjects.push(badgeText);

    // Icon area (colored rectangle as placeholder)
    const iconG = this.add.graphics();
    iconG.fillStyle(rarityColor, 0.3);
    iconG.fillRoundedRect(x - 24, y - h / 2 + 36, 48, 48, 4);
    // Simple icon symbol
    iconG.fillStyle(rarityColor, 0.8);
    const iconSymbol = this.getUpgradeSymbol(upgrade.id);
    this.cardObjects.push(iconG);

    // Icon symbol text
    const iconText = this.add
      .text(x, y - h / 2 + 60, iconSymbol, {
        fontFamily: '"8bit Wonder"',
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.cardObjects.push(iconText);

    // Name
    const nameText = this.add
      .text(x, y + 10, upgrade.name, {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#f1f5f9",
        align: "center",
        wordWrap: { width: w - 20 },
      })
      .setOrigin(0.5);
    this.cardObjects.push(nameText);

    // Description
    const descText = this.add
      .text(x, y + 38, upgrade.description, {
        fontFamily: '"8bit Wonder"',
        fontSize: "6px",
        color: "#94a3b8",
        align: "center",
        wordWrap: { width: w - 24 },
      })
      .setOrigin(0.5);
    this.cardObjects.push(descText);

    // Stack count
    if (stacks > 0) {
      const stackText = this.add
        .text(x, y + 60, `OWNED: x${stacks}`, {
          fontFamily: '"8bit Wonder"',
          fontSize: "6px",
          color: "#64748b",
        })
        .setOrigin(0.5);
      this.cardObjects.push(stackText);
    }

    // Interactive hit area
    const hitArea = this.add
      .rectangle(x, y, w, h)
      .setAlpha(0.001)
      .setInteractive({ useHandCursor: true });
    this.cardObjects.push(hitArea);

    hitArea.on("pointerover", () => {
      cardG.clear();
      cardG.fillStyle(rarityColor, 0.25);
      cardG.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 8);
      cardG.fillStyle(C.CARD_BG, 1);
      cardG.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      cardG.lineStyle(2, rarityColor, 1);
      cardG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    });

    hitArea.on("pointerout", () => {
      cardG.clear();
      cardG.fillStyle(rarityColor, 0.15);
      cardG.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 8);
      cardG.fillStyle(C.CARD_BG, 0.95);
      cardG.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      cardG.lineStyle(2, rarityColor, 0.8);
      cardG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    });

    hitArea.on("pointerdown", () => {
      this.onComplete(upgrade.id);
      this.scene.stop();
    });
  }

  private getRarity(upgrade: UpgradeDef): "Common" | "Rare" | "Epic" {
    // Assign rarities based on power level
    const epicIds = ["life_steal", "second_wind", "treasure_magnet"];
    const rareIds = ["sharp_blade", "vitality_surge", "eagle_eye"];
    if (epicIds.includes(upgrade.id)) return "Epic";
    if (rareIds.includes(upgrade.id)) return "Rare";
    return "Common";
  }

  private getUpgradeSymbol(id: string): string {
    const symbols: Record<string, string> = {
      sharp_blade: "/\\",
      vitality_surge: "+",
      life_steal: "<3",
      eagle_eye: "(o)",
      thick_skin: "[]",
      treasure_magnet: "@",
      swift_feet: ">>",
      second_wind: "~",
    };
    return symbols[id] ?? "?";
  }
}
