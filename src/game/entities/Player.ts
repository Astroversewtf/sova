import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H, PLAYER_MOVE_MS } from "../constants";
import { emitSfxEvent } from "@/lib/audioEvents";

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
    // Keep walk loop continuous across chained moves (avoid restarting every tile).
    (this.sprite as Phaser.GameObjects.Sprite).play(`player-walk-${this.facing}`, true);
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

  /** Flash blue on heal */
  flashHeal() {
    if (!this.sprite.active) return;
    this.sprite.setTintFill(0x6fb6ff);
    this.hitFlashTimer?.remove(false);
    this.hitFlashTimer = this.scene.time.delayedCall(120, () => {
      if (this.sprite.active) this.sprite.clearTint();
      this.hitFlashTimer = null;
    });
  }

  playDeath(onComplete?: () => void) {
    emitSfxEvent("death");
    this.hitFlashTimer?.remove(false);
    this.hitFlashTimer = null;
    const sx = this.sprite.x;
    const sy = this.sprite.y;

    // Stop any current animation
    if (this.animated) {
      (this.sprite as Phaser.GameObjects.Sprite).stop();
    }

    // 1. Flash white
    this.sprite.setTintFill(0xffffff);

    const purples = [0x9b59b6, 0x8e44ad, 0xbb6bd9, 0x7d3c98];
    for (let i = 0; i < 14; i++) {
      const size = 4 + 5 * Math.random();
      const color = purples[Math.floor(Math.random() * purples.length)];
      const pg = this.scene.add.graphics();
      pg.fillStyle(color, 1);
      pg.fillCircle(0, 0, size / 2);
      pg.setPosition(sx, sy);
      pg.setDepth(550);
      const angle = (i / 14) * Math.PI * 2 + 0.5 * Math.random();
      const radius = 30 + 35 * Math.random();
      this.scene.tweens.add({
        targets: pg,
        x: sx + Math.cos(angle) * radius,
        y: sy + Math.sin(angle) * radius - 10,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.5, to: 0.3 },
        duration: 700 + 350 * Math.random(),
        ease: "Quad.easeOut",
        onComplete: () => pg.destroy(),
      });
    }

    // 3. After 100ms flash, clear tint → death anim → float up 200px + fade
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();

      const hasSoulAnim = this.scene.anims.exists("death-soul");
      if (hasSoulAnim) {
        this.sprite.setVisible(false);
        const soul = this.scene.add.sprite(sx, sy, "death-1");
        soul.setDepth(550);
        soul.setOrigin(0.5, 0.5);
        const frame = soul.frame;
        const scale = TILE_SIZE / Math.max(frame.width, frame.height);
        soul.setScale(scale);
        soul.play("death-soul");

        this.scene.tweens.add({
          targets: soul,
          alpha: 0,
          y: sy - 200,
          scaleX: scale * 0.3,
          scaleY: scale * 0.3,
          duration: 1400,
          ease: "Power2.easeOut",
          onComplete: () => {
            soul.destroy();
            onComplete?.();
          },
        });
      } else {
        // Fallback: sprite floats up + fades (MoG style — 200px rise, 1400ms)
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          y: sy - 200,
          scaleX: 0.3,
          scaleY: 0.3,
          duration: 1400,
          ease: "Power2.easeOut",
          onComplete: () => onComplete?.(),
        });
      }
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
