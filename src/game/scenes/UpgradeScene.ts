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
// Fibonacci reroll costs
const REROLL_COSTS = [10, 20, 30, 50, 80, 130];

export class UpgradeScene extends Phaser.Scene {
  private onComplete!: (id: UpgradeId) => void;
  private choices: UpgradeDef[] = [];
  private cardObjects: Phaser.GameObjects.GameObject[] = [];
  private rerollCount = 0;
  private rerollCostText!: Phaser.GameObjects.Text;
  private isSpinning = false;

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

    // Roll 3 choices and show with slot-machine animation
    this.rerollCount = 0;
    this.choices = this.rollChoices();
    this.spinAndRevealCards();

    // ── Reroll button with fibonacci cost ──
    const rerollY = GAME_HEIGHT - 50;
    const rerollBg = this.add
      .rectangle(GAME_WIDTH / 2, rerollY, 140, 28, 0x854d0e, 0.9)
      .setStrokeStyle(1, 0xfbbf24)
      .setInteractive({ useHandCursor: true });

    const cost = REROLL_COSTS[Math.min(this.rerollCount, REROLL_COSTS.length - 1)];
    this.rerollCostText = this.add
      .text(GAME_WIDTH / 2, rerollY, `REROLL  -${cost}`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#fbbf24",
      })
      .setOrigin(0.5);

    rerollBg.on("pointerover", () => rerollBg.setStrokeStyle(2, 0xfde68a));
    rerollBg.on("pointerout", () => rerollBg.setStrokeStyle(1, 0xfbbf24));
    rerollBg.on("pointerdown", () => {
      if (this.isSpinning) return;
      const s = useGameStore.getState();
      const rerollCost = REROLL_COSTS[Math.min(this.rerollCount, REROLL_COSTS.length - 1)];
      if (s.energy <= rerollCost) return; // Can't afford
      s.setEnergy(s.energy - rerollCost);
      this.rerollCount++;
      // Update cost text for next reroll
      const nextCost = REROLL_COSTS[Math.min(this.rerollCount, REROLL_COSTS.length - 1)];
      this.rerollCostText.setText(`REROLL  -${nextCost}`);
      this.choices = this.rollChoices();
      this.clearCards();
      this.spinAndRevealCards();
    });
  }

  /**
   * Slot-machine animation: staggered card reveals with random spinning
   */
  private spinAndRevealCards() {
    this.isSpinning = true;
    const delays = [0, 150, 300]; // Staggered start per card
    const spinCount = 10; // Number of fake spins before reveal
    const spinInterval = 120; // ms per spin frame
    let revealed = 0;

    this.choices.forEach((realUpgrade, i) => {
      this.time.delayedCall(delays[i], () => {
        let tick = 0;
        const timer = this.time.addEvent({
          delay: spinInterval,
          repeat: spinCount - 1,
          callback: () => {
            tick++;
            // Show random upgrade during spin
            const fakeUpgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
            this.clearCardAt(i);
            this.renderSingleCard(i, fakeUpgrade, false);

            // On final tick, show real card
            if (tick >= spinCount) {
              timer.destroy();
              this.clearCardAt(i);
              this.renderSingleCard(i, realUpgrade, true);
              revealed++;
              if (revealed >= this.choices.length) {
                this.isSpinning = false;
              }
            }
          },
        });
      });
    });
  }

  // Per-card object tracking for slot-machine
  private cardSlots: Phaser.GameObjects.GameObject[][] = [[], [], []];

  private clearCardAt(index: number) {
    for (const obj of this.cardSlots[index]) obj.destroy();
    this.cardSlots[index] = [];
  }

  private renderSingleCard(index: number, upgrade: UpgradeDef, interactive: boolean) {
    const cardW = 170;
    const cardH = 230;
    const cardY = GAME_HEIGHT / 2 + 20;
    const cardX = GAME_WIDTH / 2 + (index - 1) * (cardW + 16);
    this.createCard(cardX, cardY, cardW, cardH, upgrade, index, interactive);
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
    for (let i = 0; i < 3; i++) this.clearCardAt(i);
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    upgrade: UpgradeDef,
    index: number,
    interactive = true,
  ) {
    const store = useGameStore.getState();
    const stacks = store.upgrades[upgrade.id] ?? 0;

    // Determine rarity
    const rarity = this.getRarity(upgrade);
    const rarityColor = rarity === "Epic" ? C.RARITY_EPIC : rarity === "Rare" ? C.RARITY_RARE : C.RARITY_COMMON;
    const rarityLabel = rarity.toUpperCase();

    const slot = this.cardSlots[index];

    // Card background
    const cardG = this.add.graphics();
    cardG.fillStyle(rarityColor, 0.15);
    cardG.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 8);
    cardG.fillStyle(C.CARD_BG, 0.95);
    cardG.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    cardG.lineStyle(2, rarityColor, 0.8);
    cardG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    slot.push(cardG);

    // Rarity badge
    const badgeG = this.add.graphics();
    badgeG.fillStyle(rarityColor, 0.9);
    badgeG.fillRoundedRect(x - 30, y - h / 2 + 8, 60, 16, 3);
    slot.push(badgeG);

    const badgeText = this.add
      .text(x, y - h / 2 + 16, rarityLabel, {
        fontFamily: '"8bit Wonder"', fontSize: "6px", color: "#ffffff",
      }).setOrigin(0.5);
    slot.push(badgeText);

    // Icon area
    const iconG = this.add.graphics();
    iconG.fillStyle(rarityColor, 0.3);
    iconG.fillRoundedRect(x - 24, y - h / 2 + 36, 48, 48, 4);
    iconG.fillStyle(rarityColor, 0.8);
    slot.push(iconG);

    const iconText = this.add
      .text(x, y - h / 2 + 60, this.getUpgradeSymbol(upgrade.id), {
        fontFamily: '"8bit Wonder"', fontSize: "16px", color: "#ffffff",
      }).setOrigin(0.5);
    slot.push(iconText);

    // Name
    const nameText = this.add
      .text(x, y + 10, upgrade.name, {
        fontFamily: '"8bit Wonder"', fontSize: "8px", color: "#f1f5f9",
        align: "center", wordWrap: { width: w - 20 },
      }).setOrigin(0.5);
    slot.push(nameText);

    // Description
    const descText = this.add
      .text(x, y + 38, upgrade.description, {
        fontFamily: '"8bit Wonder"', fontSize: "6px", color: "#94a3b8",
        align: "center", wordWrap: { width: w - 24 },
      }).setOrigin(0.5);
    slot.push(descText);

    // Stack count
    if (stacks > 0) {
      const stackText = this.add
        .text(x, y + 60, `OWNED: x${stacks}`, {
          fontFamily: '"8bit Wonder"', fontSize: "6px", color: "#64748b",
        }).setOrigin(0.5);
      slot.push(stackText);
    }

    // Interactive hit area (only on final reveal)
    if (interactive) {
      const hitArea = this.add
        .rectangle(x, y, w, h)
        .setAlpha(0.001)
        .setInteractive({ useHandCursor: true });
      slot.push(hitArea);

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
