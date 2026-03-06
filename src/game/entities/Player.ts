import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H, PLAYER_MOVE_MS } from "../constants";

type Facing = "front" | "back" | "side";

export class Player {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  /** Invisible sprite that GridEngine controls for position tracking */
  dummySprite: Phaser.GameObjects.Sprite;
  pos: TilePos;
  private scene: Phaser.Scene;
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hitFlashTimer: Phaser.Time.TimerEvent | null = null;
  private animated: boolean;
  private facing: Facing = "front";

  constructor(scene: Phaser.Scene, pos: TilePos) {
    this.scene = scene;
    this.pos = { ...pos };

    const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = pos.y * TILE_FULL_H + TILE_SIZE / 2;

    // Invisible dummy sprite for GridEngine
    this.dummySprite = scene.add.sprite(px, py, "player");
    this.dummySprite.setVisible(false);
    this.dummySprite.setDepth(-1);

    // Use animated sprite if animations exist, else static fallback
    this.animated = !!scene.anims.exists("player-idle-front");

    if (this.animated) {
      const spr = scene.add.sprite(px, py, "player-idle-front-1");
      spr.play("player-idle-front");
      this.sprite = spr;
    } else {
      this.sprite = scene.add.image(px, py, "player");
    }

    this.sprite.setDepth(500);
    this.sprite.setOrigin(0.5, 0.75);

    // Dust particle emitter
    if (scene.textures.exists("particle-dust")) {
      this.dustEmitter = scene.add.particles(0, 0, "particle-dust", {
        speed: { min: 15, max: 40 },
        alpha: { start: 0.5, end: 0 },
        scale: { start: 0.8, end: 0.2 },
        lifespan: 300,
        quantity: 4,
        emitting: false,
      });
      this.dustEmitter.setDepth(450);
    }
  }

  /** Sync visual sprite position with GridEngine-controlled dummy sprite */
  syncWithGridEngine() {
    this.sprite.setPosition(this.dummySprite.x, this.dummySprite.y);
  }

  moveTo(target: TilePos, onComplete: () => void) {
    const prevX = this.sprite.x;
    const prevY = this.sprite.y;
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    this.pos = { ...target };

    // Update facing and play walk animation
    this.updateFacingFromDir(dx, dy);
    if (this.animated) {
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play(`player-walk-${this.facing}`, true);
    }

    // Dust puff at previous position
    if (this.dustEmitter) {
      this.dustEmitter.emitParticleAt(prevX, prevY + 4, 4);
    }

    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_FULL_H + TILE_SIZE / 2,
      duration: PLAYER_MOVE_MS,
      ease: "Power2",
      onComplete: () => {
        // Return to idle after arriving
        if (this.animated) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`player-idle-${this.facing}`, true);
        }
        onComplete();
      },
    });
  }

  /** Start walk animation in current facing direction */
  playWalk() {
    if (!this.animated) return;
    (this.sprite as Phaser.GameObjects.Sprite).play(`player-walk-${this.facing}`);
  }

  /** Return to idle animation */
  stopWalk() {
    if (!this.animated) return;
    (this.sprite as Phaser.GameObjects.Sprite).play(`player-idle-${this.facing}`);
  }

  /** Emit dust particles at current position */
  emitDust() {
    if (this.dustEmitter) {
      this.dustEmitter.emitParticleAt(this.sprite.x, this.sprite.y + 4, 4);
    }
  }

  /** Update facing direction + flipX (no animation change) */
  setFacing(dx: number, dy: number) {
    let newFacing: Facing = this.facing;
    if (dy > 0) newFacing = "front";
    else if (dy < 0) newFacing = "back";
    else if (dx !== 0) newFacing = "side";

    this.facing = newFacing;

    if (this.animated) {
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      if (this.facing === "side" && dx !== 0) {
        spr.setFlipX(dx < 0);
      } else {
        spr.setFlipX(false);
      }
    }
  }

  /** Update direction and play matching idle animation */
  updateFacingFromDir(dx: number, dy: number) {
    this.setFacing(dx, dy);
    if (!this.animated) return;
    (this.sprite as Phaser.GameObjects.Sprite).play(`player-idle-${this.facing}`, true);
  }

  /** Play attack animation in current facing direction, then return to idle */
  playAttack(onComplete?: () => void) {
    if (!this.animated) {
      onComplete?.();
      return;
    }
    const spr = this.sprite as Phaser.GameObjects.Sprite;
    spr.play(`player-attack-${this.facing}`);
    spr.once("animationcomplete", () => {
      spr.play(`player-idle-${this.facing}`);
      onComplete?.();
    });
  }

  /** Flash white on damage */
  flashDamage() {
    if (!this.sprite.active) return;
    this.sprite.setTintFill(0xffffff);
    this.hitFlashTimer?.remove(false);
    this.hitFlashTimer = this.scene.time.delayedCall(85, () => {
      if (this.sprite.active) this.sprite.clearTint();
      this.hitFlashTimer = null;
    });
  }

  /** Flash green on heal */
  flashHeal() {
    if (!this.sprite.active) return;
    this.sprite.setTintFill(0x4ade80);
    this.hitFlashTimer?.remove(false);
    this.hitFlashTimer = this.scene.time.delayedCall(120, () => {
      if (this.sprite.active) this.sprite.clearTint();
      this.hitFlashTimer = null;
    });
  }

  /** Snap position without tween */
  teleport(pos: TilePos) {
    this.pos = { ...pos };
    this.sprite.setPosition(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
    );
  }

  destroy() {
    this.hitFlashTimer?.remove(false);
    this.hitFlashTimer = null;
    this.sprite.clearTint();
    this.dustEmitter?.destroy();
    this.dummySprite.destroy();
    this.sprite.destroy();
  }
}
