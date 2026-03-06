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
  private animatedGolem = false;
  private animatedGhost = false;
  private animatedSova = false;
  private facing: Facing = "front";

  constructor(scene: Phaser.Scene, pos: TilePos, type: EnemyType, floor: number, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.type = type;
    this.id = id;
    this.hp = getEnemyHP(type);
    this.maxHp = this.hp;
    this.detectionRange = getDetectionRange(type);
    this.active = type === EnemyType.BOSS;

    const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = pos.y * TILE_FULL_H + TILE_SIZE / 2;

    const canUseRock =
      type === EnemyType.ROCK &&
      scene.textures.exists("enemy-rock-idle-front-1") &&
      scene.anims.exists("enemy-rock-idle-front");
    const canUseGolem =
      type === EnemyType.GOLEM &&
      scene.textures.exists("enemy-golem-idle-front-1") &&
      scene.anims.exists("enemy-golem-idle-front");
    const canUseGhost =
      type === EnemyType.GHOST &&
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
    } else if (canUseGolem) {
      const spr = scene.add.sprite(px, py, "enemy-golem-idle-front-1");
      spr.play("enemy-golem-idle-front");
      this.sprite = spr;
      this.animatedGolem = true;
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
        type === EnemyType.ROCK
          ? "enemy-rock-fb"
          : type === EnemyType.GOLEM
            ? "enemy-golem-fb"
            : type === EnemyType.GHOST
              ? "enemy-ghost-fb"
              : "enemy-boss";
      this.sprite = scene.add.image(px, py, textureKey);
    }

    this.sprite.setDepth(400);
    // Boss sprite is 64x64 and visually taller than a tile.
    // Raise it so feet align around the lower 3/4 of the tile.
    const originY = type === EnemyType.BOSS ? 0.7 : 0.5;
    this.sprite.setOrigin(0.5, originY);

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
    } else if (this.animatedGolem) {
      this.updateFacingFromDir(dx, dy);
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play(`enemy-golem-walk-${this.facing}`, true);
    } else if (this.animatedSova) {
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play("enemy-sova-idle", true);
    } else if (this.animatedGhost) {
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
        } else if (this.animatedGolem && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`enemy-golem-idle-${this.facing}`);
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
    if (!this.sprite.active) {
      onComplete?.();
      return;
    }

    const spr = this.sprite as Phaser.GameObjects.Sprite;

    if (this.animatedRock) {
      spr.play(`enemy-rock-attack-${this.facing}`);
      spr.once("animationcomplete", () => {
        if (this.sprite.active) spr.play(`enemy-rock-idle-${this.facing}`);
        onComplete?.();
      });
    } else if (this.animatedGolem) {
      spr.play(`enemy-golem-attack-${this.facing}`);
      spr.once("animationcomplete", () => {
        if (this.sprite.active) spr.play(`enemy-golem-idle-${this.facing}`);
        onComplete?.();
      });
    } else {
      onComplete?.();
    }
  }

  private updateFacingFromDir(dx: number, dy: number) {
    if (!this.animatedRock && !this.animatedGolem) return;

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

  /** MoG-style death: white flash → particle burst → soul rises + fades */
  die() {
    this.clearHitFlash();
    const sx = this.sprite.x;
    const sy = this.sprite.y;

    // 1. Flash white
    this.sprite.setTintFill(0xffffff);

    // 2. White particle burst (8 particles)
    for (let i = 0; i < 8; i++) {
      const size = 3 + 4 * Math.random();
      const pg = this.scene.add.graphics();
      pg.fillStyle(0xffffff, 1);
      pg.fillCircle(0, 0, size / 2);
      pg.setPosition(sx, sy);
      pg.setDepth(550);
      const angle = (i / 8) * Math.PI * 2 + 0.5 * Math.random();
      const radius = 20 + 25 * Math.random();
      this.scene.tweens.add({
        targets: pg,
        x: sx + Math.cos(angle) * radius,
        y: sy + Math.sin(angle) * radius - 10,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.2, to: 0.2 },
        duration: 530 + 260 * Math.random(),
        ease: "Quad.easeOut",
        onComplete: () => pg.destroy(),
      });
    }

    // 3. Hearts float up + fade
    for (const h of this.hearts) {
      this.scene.tweens.add({
        targets: h,
        alpha: 0,
        y: h.y - 20,
        duration: 460,
        ease: "Power2.easeOut",
        onComplete: () => h.destroy(),
      });
    }
    this.hearts = [];

    // 4. After 80ms flash, hide sprite → spawn soul → float up + shrink + fade
    this.scene.time.delayedCall(80, () => {
      this.sprite.setVisible(false);

      const hasSoulAnim = this.scene.anims.exists("death-soul");
      if (hasSoulAnim) {
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
          y: sy - 50,
          scaleX: scale * 0.3,
          scaleY: scale * 0.3,
          duration: 920,
          ease: "Power2.easeOut",
          onComplete: () => {
            soul.destroy();
            this.sprite.destroy();
          },
        });
      } else {
        this.sprite.setVisible(true);
        this.sprite.clearTint();
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          y: sy - 50,
          scaleX: 0.3,
          scaleY: 0.3,
          duration: 920,
          ease: "Power2.easeOut",
          onComplete: () => this.sprite.destroy(),
        });
      }
    });
  }

  destroy() {
    this.clearHitFlash();
    this.sprite.destroy();
    for (const h of this.hearts) h.destroy();
    this.hearts = [];
  }
}
