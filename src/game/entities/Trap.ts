import Phaser from "phaser";
import { type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";
import type { GameScene } from "../scenes/GameScene";

export class Trap {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  pos: TilePos;
  id: string;
  private scene: GameScene;
  private floor: number;
  private baseScale: number = 1;
  private animated = false;
  private hidden = false;
  private revealed = false;

  constructor(scene: GameScene, pos: TilePos, id: string, floor: number, hidden = false) {
    this.scene = scene;
    this.pos = { ...pos };
    this.id = id;
    this.floor = floor;
    this.hidden = hidden;
    this.revealed = !hidden;

    const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = pos.y * TILE_FULL_H + TILE_SIZE / 2;

    const canAnimate =
      scene.textures.exists("trap-spike-1") &&
      scene.anims.exists("trap-spike-idle");

    if (canAnimate) {
      const spr = scene.add.sprite(px, py, "trap-spike-1");
      spr.play("trap-spike-idle");
      this.sprite = spr;
      this.animated = true;

      const frame = spr.frame;
      const scale = TILE_SIZE / Math.max(frame.width, frame.height);
      spr.setScale(scale);
      this.baseScale = scale;
    } else if (scene.textures.exists("trap-spike-1")) {
      this.sprite = scene.add.image(px, py, "trap-spike-1");
      const frame = this.sprite.frame;
      const scale = TILE_SIZE / Math.max(frame.width, frame.height);
      this.sprite.setScale(scale);
      this.baseScale = scale;
    } else {
      this.sprite = scene.add.image(px, py, "trap-spike");
    }

    this.sprite.setDepth(150);
    this.sprite.setOrigin(0.5, 0.5);
    if (this.hidden) {
      this.sprite.setVisible(false);
    }
  }

  getBaseDamage(): number {
    if (this.floor <= 3) return 4;
    if (this.floor <= 5) return 5;
    if (this.floor <= 7) return 6;
    return 7;
  }

  /** Trigger the trap. Always active — deals damage every step. */
  trigger(): number {
    const base = this.getBaseDamage();
    this.revealed = true;
    this.sprite.setVisible(true);

    // Play jab animation (4 frames: retracted → full → retracting)
    if (this.animated) {
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play("trap-spike-jab");
      spr.once("animationcomplete", () => {
        if (spr.active) spr.play("trap-spike-idle");
      });
    } else {
      // Fallback: squash & stretch tween
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
    }

    return base;
  }

  isHidden(): boolean {
    return this.hidden;
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
