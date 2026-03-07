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
    // Check Swift Feet
    const swiftStacks = useGameStore.getState().getUpgradeStacks("swift_feet");
    if (swiftStacks > 0 && Math.random() < swiftStacks * 0.1) {
      this.scene.events.emit("energy:free-move");
      return false; // No energy spent
    }

    this.energy = Math.max(0, this.energy - ENERGY_PER_MOVE);
    this.sync();
    return true;
  }

  takeDamage(amount: number) {
    // Apply Thick Skin
    const thickStacks = useGameStore.getState().getUpgradeStacks("thick_skin");
    const reduced = Math.max(1, amount - thickStacks);
    this.energy = Math.max(0, this.energy - reduced);
    this.sync();
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
}
