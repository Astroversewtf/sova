import Phaser from "phaser";
import { EnemyType, type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H, ENEMY_MOVE_MS, getEnemyHP, getDetectionRange } from "../constants";

type Facing = "front" | "back" | "side";

export class Enemy {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  pos: TilePos;
  type: EnemyType;
  hp: number;
  maxHp: number;
  detectionRange: number;
  active: boolean;
  id: string;
  private scene: Phaser.Scene;
  private hearts: Phaser.GameObjects.Image[] = [];
  private hitFlashTimer: Phaser.Time.TimerEvent | null = null;
  private animatedRock = false;
  private animatedGhost = false;
  private animatedSova = false;
  private facing: Facing = "front";

  constructor(scene: Phaser.Scene, pos: TilePos, type: EnemyType, floor: number, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.type = type;
    this.id = id;
    this.hp = getEnemyHP(type, floor);
    this.maxHp = this.hp;
    this.detectionRange = getDetectionRange(type);
    this.active = type === EnemyType.BOSS;

    const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = pos.y * TILE_FULL_H + TILE_SIZE / 2;

    const canUseRock =
      type === EnemyType.BASIC &&
      scene.textures.exists("enemy-rock-idle-front-1") &&
      scene.anims.exists("enemy-rock-idle-front");
    const canUseGhost =
      type === EnemyType.TANKY &&
      scene.textures.exists("enemy-ghost-idle-1") &&
      scene.anims.exists("enemy-ghost-idle");
    const canUseSova =
      type === EnemyType.BOSS &&
      scene.textures.exists("enemy-sova-idle-1") &&
      scene.anims.exists("enemy-sova-idle");

    if (canUseRock) {
      const spr = scene.add.sprite(px, py, "enemy-rock-idle-front-1");
      spr.play("enemy-rock-idle-front");
      this.sprite = spr;
      this.animatedRock = true;
    } else if (canUseSova) {
      const spr = scene.add.sprite(px, py, "enemy-sova-idle-1");
      spr.play("enemy-sova-idle");
      this.sprite = spr;
      this.animatedSova = true;
    } else if (canUseGhost) {
      const spr = scene.add.sprite(px, py, "enemy-ghost-idle-1");
      spr.play("enemy-ghost-idle");
      this.sprite = spr;
      this.animatedGhost = true;
    } else {
      const textureKey =
        type === EnemyType.BASIC
          ? "enemy-basic"
          : type === EnemyType.TANKY
            ? "enemy-tanky"
            : "enemy-boss";
      this.sprite = scene.add.image(px, py, textureKey);
    }

    this.sprite.setDepth(400);
    this.sprite.setOrigin(0.5, 0.5);

    // Heart icons above enemy
    this.createHearts();
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHearts();

    // Subtle white impact flash
    if (this.sprite.active) {
      this.sprite.setTintFill(0xffffff);
      this.hitFlashTimer?.remove(false);
      this.hitFlashTimer = this.scene.time.delayedCall(85, () => {
        if (this.sprite.active) this.sprite.clearTint();
        this.hitFlashTimer = null;
      });
    }
  }

  private clearHitFlash() {
    this.hitFlashTimer?.remove(false);
    this.hitFlashTimer = null;
    if (this.sprite.active) {
      this.sprite.clearTint();
    }
  }

  moveTo(target: TilePos, onComplete: () => void) {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    this.pos = { ...target };

    if (this.animatedRock) {
      this.updateFacingFromDir(dx, dy);
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play(`enemy-rock-walk-${this.facing}`, true);
    } else if (this.animatedSova) {
      // Sova has idle-only frames for now.
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play("enemy-sova-idle", true);
    } else if (this.animatedGhost) {
      // Ghost has only idle frames; keep idle loop while moving.
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play("enemy-ghost-idle", true);
    }

    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_FULL_H + TILE_SIZE / 2,
      duration: ENEMY_MOVE_MS,
      ease: "Power2",
      onComplete: () => {
        if (this.animatedRock && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`enemy-rock-idle-${this.facing}`);
        } else if (this.animatedSova && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play("enemy-sova-idle");
        } else if (this.animatedGhost && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play("enemy-ghost-idle");
        }
        this.positionHearts();
        onComplete();
      },
    });
  }

  playAttack(onComplete?: () => void) {
    if (!this.animatedRock || !this.sprite.active) {
      onComplete?.();
      return;
    }

    const spr = this.sprite as Phaser.GameObjects.Sprite;
    spr.play(`enemy-rock-attack-${this.facing}`);
    spr.once("animationcomplete", () => {
      if (this.sprite.active) {
        spr.play(`enemy-rock-idle-${this.facing}`);
      }
      onComplete?.();
    });
  }

  private updateFacingFromDir(dx: number, dy: number) {
    if (!this.animatedRock) return;

    if (dy > 0) this.facing = "front";
    else if (dy < 0) this.facing = "back";
    else if (dx !== 0) this.facing = "side";

    const spr = this.sprite as Phaser.GameObjects.Sprite;
    spr.setFlipX(this.facing === "side" && dx < 0);
  }

  private createHearts() {
    const heartW = 7;
    const gap = 1;
    const totalW = this.maxHp * heartW + (this.maxHp - 1) * gap;
    const startX = this.sprite.x - totalW / 2 + heartW / 2;
    const y = this.sprite.y - TILE_SIZE / 2 - 5;

    for (let i = 0; i < this.maxHp; i++) {
      const hx = startX + i * (heartW + gap);
      const heart = this.scene.add.image(hx, y, "heart-full");
      heart.setDepth(410);
      heart.setOrigin(0.5, 0.5);
      this.hearts.push(heart);
    }
  }

  private updateHearts() {
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setTexture(i < this.hp ? "heart-full" : "heart-empty");
    }
  }

  private positionHearts() {
    const heartW = 7;
    const gap = 1;
    const totalW = this.maxHp * heartW + (this.maxHp - 1) * gap;
    const startX = this.sprite.x - totalW / 2 + heartW / 2;
    const y = this.sprite.y - TILE_SIZE / 2 - 5;

    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setPosition(startX + i * (heartW + gap), y);
    }
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
    for (const h of this.hearts) h.setVisible(v);
  }

  die() {
    this.clearHitFlash();
    this.scene.tweens.add({
      targets: [this.sprite, ...this.hearts],
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
      onComplete: () => {
        this.sprite.destroy();
        for (const h of this.hearts) h.destroy();
        this.hearts = [];
      },
    });
  }

  destroy() {
    this.clearHitFlash();
    this.sprite.destroy();
    for (const h of this.hearts) h.destroy();
    this.hearts = [];
  }
}
