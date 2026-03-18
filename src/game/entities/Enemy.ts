import Phaser from "phaser";
import { EnemyType, type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H, ENEMY_MOVE_MS, getEnemyHP, getDetectionRange, getTier } from "../constants";
import { emitSfxEvent } from "@/lib/audioEvents";

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
  private animatedRock2 = false;
  private animatedGolem = false;
  private animatedGhost = false;
  private animatedFlyingRock = false;
  private animatedTree = false;
  private animatedSova = false;
  private facing: Facing = "front";

  constructor(scene: Phaser.Scene, pos: TilePos, type: EnemyType, floor: number, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.type = type;
    this.id = id;
    const baseHP = getEnemyHP(type);
    if (type === EnemyType.BOSS) {
      this.hp = 7; // Fixed, no scaling
    } else {
      const tier = getTier(floor);
      this.hp = Math.ceil(baseHP * tier.hpMult);
      if (type === EnemyType.ROCK || type === EnemyType.ROCK2 || type === EnemyType.GOLEM) {
        this.hp = Math.min(this.hp, 3); // base 1, max 3
      } else if (type === EnemyType.GHOST || type === EnemyType.FLYING_ROCK) {
        this.hp = Math.min(this.hp, 5); // base 3, max 5
      } else if (type === EnemyType.TREE) {
        this.hp = Math.min(this.hp, 8); // base 4, scales to late floors
      }
    }
    this.maxHp = this.hp;
    this.detectionRange = getDetectionRange(type);
    this.active = false;

    const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = pos.y * TILE_FULL_H + TILE_SIZE / 2;

    const canUseRock =
      type === EnemyType.ROCK &&
      scene.textures.exists("enemy-rock-idle-front-1") &&
      scene.anims.exists("enemy-rock-idle-front");
    const canUseRock2 =
      type === EnemyType.ROCK2 &&
      scene.textures.exists("enemy-rock2-idle-front-1") &&
      scene.anims.exists("enemy-rock2-idle-front");
    const canUseGolem =
      type === EnemyType.GOLEM &&
      scene.textures.exists("enemy-golem-idle-front-1") &&
      scene.anims.exists("enemy-golem-idle-front");
    const canUseGhost =
      type === EnemyType.GHOST &&
      scene.textures.exists("enemy-ghost-idle-1") &&
      scene.anims.exists("enemy-ghost-idle");
    const canUseFlyingRock =
      type === EnemyType.FLYING_ROCK &&
      scene.textures.exists("enemy-flying-rock-idle-1") &&
      scene.anims.exists("enemy-flying-rock-idle");
    const canUseTree =
      type === EnemyType.TREE &&
      scene.textures.exists("enemy-tree-idle-front-1") &&
      scene.anims.exists("enemy-tree-idle-front");
    const canUseSova =
      type === EnemyType.BOSS &&
      scene.textures.exists("enemy-sova-idle-1") &&
      scene.anims.exists("enemy-sova-idle");

    if (canUseRock) {
      const spr = scene.add.sprite(px, py, "enemy-rock-idle-front-1");
      spr.play("enemy-rock-idle-front");
      this.sprite = spr;
      this.animatedRock = true;
    } else if (canUseRock2) {
      const spr = scene.add.sprite(px, py, "enemy-rock2-idle-front-1");
      spr.play("enemy-rock2-idle-front");
      this.sprite = spr;
      this.animatedRock2 = true;
    } else if (canUseGolem) {
      const spr = scene.add.sprite(px, py, "enemy-golem-idle-front-1");
      spr.play("enemy-golem-idle-front");
      this.sprite = spr;
      this.animatedGolem = true;
    } else if (canUseTree) {
      const spr = scene.add.sprite(px, py, "enemy-tree-idle-front-1");
      spr.play("enemy-tree-idle-front");
      this.sprite = spr;
      this.animatedTree = true;
    } else if (canUseSova) {
      const spr = scene.add.sprite(px, py, "enemy-sova-idle-1");
      spr.play("enemy-sova-idle");
      this.sprite = spr;
      this.animatedSova = true;
    } else if (canUseFlyingRock) {
      const spr = scene.add.sprite(px, py, "enemy-flying-rock-idle-1");
      spr.play("enemy-flying-rock-idle");
      this.sprite = spr;
      this.animatedFlyingRock = true;
    } else if (canUseGhost) {
      const spr = scene.add.sprite(px, py, "enemy-ghost-idle-1");
      spr.play("enemy-ghost-idle");
      this.sprite = spr;
      this.animatedGhost = true;
    } else {
      const textureKey =
        type === EnemyType.ROCK
          ? "enemy-rock-fb"
          : type === EnemyType.ROCK2
            ? "enemy-rock2-fb"
          : type === EnemyType.GOLEM
            ? "enemy-golem-fb"
            : type === EnemyType.GHOST
              ? "enemy-ghost-fb"
              : type === EnemyType.FLYING_ROCK
                ? "enemy-flying-rock-fb"
                : type === EnemyType.TREE
                  ? "enemy-tree-fb"
              : "enemy-boss";
      this.sprite = scene.add.image(px, py, textureKey);
    }

    this.sprite.setDepth(400);
    // Boss sprite is 64x64 and visually taller than a tile.
    // Raise it so feet align around the lower 3/4 of the tile.
    const originY =
      type === EnemyType.BOSS
        ? 0.7
        : type === EnemyType.GOLEM || type === EnemyType.TREE
          ? 0.75
          : 0.6;
    this.sprite.setOrigin(0.5, originY);

    // Heart icons above enemy
    this.createHearts();
  }

  setTutorialBossOverride(hp: number, dmgDetectionRange?: number) {
    if (this.type !== EnemyType.BOSS) return;
    this.maxHp = Math.max(1, Math.floor(hp));
    this.hp = Math.min(this.maxHp, this.maxHp);
    if (typeof dmgDetectionRange === "number") {
      this.detectionRange = dmgDetectionRange;
    }
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    this.createHearts();
    this.updateHearts();
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
    } else if (this.animatedRock2) {
      this.updateFacingFromDir(dx, dy);
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play(`enemy-rock2-walk-${this.facing}`, true);
    } else if (this.animatedGolem) {
      this.updateFacingFromDir(dx, dy);
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play(`enemy-golem-walk-${this.facing}`, true);
    } else if (this.animatedTree) {
      this.updateFacingFromDir(dx, dy);
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play(`enemy-tree-walk-${this.facing}`, true);
    } else if (this.animatedSova) {
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      spr.play("enemy-sova-idle", true);
    } else if (this.animatedGhost || this.animatedFlyingRock) {
      const spr = this.sprite as Phaser.GameObjects.Sprite;
      if (dx !== 0) spr.setFlipX(dx < 0);
      spr.play(this.animatedGhost ? "enemy-ghost-idle" : "enemy-flying-rock-idle", true);
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
        } else if (this.animatedRock2 && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`enemy-rock2-idle-${this.facing}`);
        } else if (this.animatedGolem && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`enemy-golem-idle-${this.facing}`);
        } else if (this.animatedTree && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play(`enemy-tree-idle-${this.facing}`);
        } else if (this.animatedSova && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play("enemy-sova-idle");
        } else if ((this.animatedGhost || this.animatedFlyingRock) && this.sprite.active) {
          (this.sprite as Phaser.GameObjects.Sprite).play(
            this.animatedGhost ? "enemy-ghost-idle" : "enemy-flying-rock-idle",
          );
        }
        this.positionHearts();
        onComplete();
      },
    });
  }

  playAttack(targetPos?: TilePos, onComplete?: () => void) {
    if (!this.sprite.active) {
      onComplete?.();
      return;
    }

    // Face the target before attacking
    if (targetPos && (this.animatedRock || this.animatedRock2 || this.animatedGolem || this.animatedTree)) {
      const dx = targetPos.x - this.pos.x;
      const dy = targetPos.y - this.pos.y;
      this.updateFacingFromDir(dx, dy);
    }

    const spr = this.sprite as Phaser.GameObjects.Sprite;

    if (this.animatedRock) {
      spr.play(`enemy-rock-attack-${this.facing}`);
      spr.once("animationcomplete", () => {
        if (this.sprite.active) spr.play(`enemy-rock-idle-${this.facing}`);
        onComplete?.();
      });
    } else if (this.animatedRock2) {
      spr.play(`enemy-rock2-attack-${this.facing}`);
      spr.once("animationcomplete", () => {
        if (this.sprite.active) spr.play(`enemy-rock2-idle-${this.facing}`);
        onComplete?.();
      });
    } else if (this.animatedGolem) {
      spr.play(`enemy-golem-attack-${this.facing}`);
      spr.once("animationcomplete", () => {
        if (this.sprite.active) spr.play(`enemy-golem-idle-${this.facing}`);
        onComplete?.();
      });
    } else if (this.animatedTree) {
      spr.play(`enemy-tree-attack-${this.facing}`);
      spr.once("animationcomplete", () => {
        if (this.sprite.active) spr.play(`enemy-tree-idle-${this.facing}`);
        onComplete?.();
      });
    } else if (this.animatedGhost || this.animatedFlyingRock) {
      const dx = targetPos ? targetPos.x - this.pos.x : 0;
      const attackAnim = this.animatedGhost
        ? "enemy-ghost-attack-side"
        : "enemy-flying-rock-attack-side";
      const idleAnim = this.animatedGhost
        ? "enemy-ghost-idle"
        : "enemy-flying-rock-idle";
      if (dx !== 0 && this.scene.anims.exists(attackAnim)) {
        spr.setFlipX(dx < 0);
        spr.play(attackAnim);
        spr.once("animationcomplete", () => {
          if (this.sprite.active) spr.play(idleAnim);
          onComplete?.();
        });
      } else {
        // No dedicated front/back ghost attack.
        onComplete?.();
      }
    } else {
      onComplete?.();
    }
  }

  private updateFacingFromDir(dx: number, dy: number) {
    if (!this.animatedRock && !this.animatedRock2 && !this.animatedGolem && !this.animatedTree) return;

    if (dy > 0) this.facing = "front";
    else if (dy < 0) this.facing = "back";
    else if (dx !== 0) this.facing = "side";

    const spr = this.sprite as Phaser.GameObjects.Sprite;
    spr.setFlipX(this.facing === "side" && dx < 0);
  }

  private getHeartsY(): number {
    // Top of sprite accounting for originY and actual frame height
    const frameH = this.sprite.frame.height * this.sprite.scaleY;
    return this.sprite.y - this.sprite.originY * frameH - 5;
  }

  private createHearts() {
    const heartW = 7;
    const gap = 1;
    const totalW = this.maxHp * heartW + (this.maxHp - 1) * gap;
    const startX = this.sprite.x - totalW / 2 + heartW / 2;
    const y = this.getHeartsY();

    for (let i = 0; i < this.maxHp; i++) {
      const hx = startX + i * (heartW + gap);
      const heart = this.scene.add.image(hx, y, "heart-full");
      // Keep enemy hearts above both enemy (400) and player (500).
      heart.setDepth(510);
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
    const y = this.getHeartsY();

    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setPosition(startX + i * (heartW + gap), y);
    }
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
    for (const h of this.hearts) h.setVisible(v);
  }

  die() {
    emitSfxEvent("death");
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

      // If run-end death sequence has started, avoid spawning enemy soul.
      // This prevents a double death-soul stack when both enemy and player die
      // on the same bump turn.
      const sceneMaybe = this.scene as unknown as { isRunEnding?: () => boolean };
      if (sceneMaybe.isRunEnding?.()) {
        this.sprite.destroy();
        return;
      }

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
