import Phaser from "phaser";
import { type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";
import type { GameScene } from "../scenes/GameScene";

export class Trap {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  id: string;
  private scene: GameScene;
  private floor: number;
  private baseScale: number = 1;

  constructor(scene: GameScene, pos: TilePos, id: string, floor: number) {
    this.scene = scene;
    this.pos = { ...pos };
    this.id = id;
    this.floor = floor;

    // Use spike sprite if available, fallback to procedural
    const textureKey = scene.textures.exists("trap-spike-1")
      ? "trap-spike-1"
      : "trap-spike";

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      textureKey,
    );
    this.sprite.setDepth(150);
    this.sprite.setOrigin(0.5, 0.5);

    // Scale sprite to fill tile
    if (scene.textures.exists("trap-spike-1")) {
      const frame = this.sprite.frame;
      const scale = TILE_SIZE / Math.max(frame.width, frame.height);
      this.sprite.setScale(scale);
      this.baseScale = scale;
    }
  }

  /** Base 6 damage at floor 3, +1 per floor after. Reduced by thick skin. */
  getBaseDamage(): number {
    return 6 + Math.max(0, this.floor - 3);
  }

  /** Trigger the trap. Always active — deals damage every step. */
  trigger(thickSkinStacks: number): number {
    const base = this.getBaseDamage();
    const dmg = Math.max(1, base - thickSkinStacks);

    // Brief spike jab animation (squash & stretch)
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(this.baseScale, this.baseScale);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * 1.3,
      scaleX: this.baseScale * 0.85,
      duration: 80,
      yoyo: true,
      ease: "Power2",
    });

    // Damage popup via PopupManager
    this.scene.popupManager.showPlayerDamageNumber(this.pos.x, this.pos.y, dmg);

    return dmg;
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
