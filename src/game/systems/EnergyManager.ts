import type { GameScene } from "../scenes/GameScene";
import { ENERGY_PER_MOVE, MAX_ENERGY_BASE, getVisionRadius } from "../constants";
import { useGameStore } from "@/stores/gameStore";

export class EnergyManager {
  energy: number;
  maxEnergy: number;
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.energy = MAX_ENERGY_BASE;
    this.maxEnergy = MAX_ENERGY_BASE;
  }

  reset(maxEnergy: number) {
    this.maxEnergy = maxEnergy;
    this.energy = maxEnergy;
    this.sync();
  }

  spendMove(): boolean {
    const store = useGameStore.getState();
    if (store.consumeFreeMove()) {
      this.scene.events.emit("energy:free-move");
      return false; // No energy spent
    }

    this.energy = Math.max(0, this.energy - ENERGY_PER_MOVE);
    this.sync();
    return true;
  }

  takeDamage(amount: number): number {
    const store = useGameStore.getState();
    const dodgeChance = store.getDodgeChance();
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      return 0;
    }

    const reduced = Math.max(0, amount - store.getDamageReduction());
    const resolved = this.resolveFractionalDamage(reduced);
    const finalDamage = Math.max(1, resolved);
    this.energy = Math.max(0, this.energy - finalDamage);
    store.recordDamageTaken(finalDamage);
    this.sync();
    return finalDamage;
  }

  /** Apply already-final damage amount (no extra mitigation), then sync store. */
  takeRawDamage(amount: number): number {
    const finalDamage = Math.max(0, Math.round(amount));
    this.energy = Math.max(0, this.energy - finalDamage);
    if (finalDamage > 0) {
      useGameStore.getState().recordDamageTaken(finalDamage);
    }
    this.sync();
    return finalDamage;
  }

  heal(amount: number) {
    this.energy = Math.min(this.energy + amount, this.maxEnergy);
    this.sync();
  }

  addMaxEnergy(amount: number) {
    this.maxEnergy += amount;
    this.energy = Math.min(this.energy + amount, this.maxEnergy);
    this.sync();
  }

  isDead(): boolean {
    return this.energy <= 0;
  }

  getVisionRadius(): number {
    return getVisionRadius(this.energy);
  }

  private sync() {
    const store = useGameStore.getState();
    store.setEnergy(this.energy);
    store.setMaxEnergy(this.maxEnergy);
  }

  private resolveFractionalDamage(amount: number): number {
    if (amount <= 0) return 0;
    const whole = Math.floor(amount);
    const fractional = amount - whole;
    return whole + (Math.random() < fractional ? 1 : 0);
  }
}
