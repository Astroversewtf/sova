import Phaser from "phaser";
import { EnemyType, type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H, ENEMY_MOVE_MS, getEnemyHP, getDetectionRange } from "../constants";

export class Enemy {
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  pos: TilePos;
  type: EnemyType;
  hp: number;
  maxHp: number;
  detectionRange: number;
  active: boolean;
  id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pos: TilePos, type: EnemyType, floor: number, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.type = type;
    this.id = id;
    this.hp = getEnemyHP(type, floor);
    this.maxHp = this.hp;
    this.detectionRange = getDetectionRange(type);
    this.active = type === EnemyType.BOSS;

    const textureKey =
      type === EnemyType.BASIC
        ? "enemy-basic"
        : type === EnemyType.TANKY
          ? "enemy-tanky"
          : "enemy-boss";

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      textureKey,
    );
    this.sprite.setDepth(400);
    this.sprite.setOrigin(0.5, 0.5);

    // HP bar (only for multi-HP enemies)
    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(410);
    this.updateHpBar();
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHpBar();

    // Flash
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(150, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  moveTo(target: TilePos, onComplete: () => void) {
    this.pos = { ...target };
    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_FULL_H + TILE_SIZE / 2,
      duration: ENEMY_MOVE_MS,
      ease: "Power2",
      onComplete: () => {
        this.updateHpBar();
        onComplete();
      },
    });
  }

  private updateHpBar() {
    this.hpBar.clear();
    if (this.maxHp <= 1) return; // No bar for 1HP enemies

    const barW = 24;
    const barH = 3;
    const x = this.sprite.x - barW / 2;
    const y = this.sprite.y - TILE_SIZE / 2 - 6;

    // Background
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRect(x, y, barW, barH);

    // Fill
    const pct = this.hp / this.maxHp;
    const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xeab308 : 0xef4444;
    this.hpBar.fillStyle(color);
    this.hpBar.fillRect(x, y, barW * pct, barH);
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
    this.hpBar.setVisible(v);
  }

  die() {
    // Fade out
    this.scene.tweens.add({
      targets: [this.sprite],
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
      onComplete: () => {
        this.sprite.destroy();
        this.hpBar.destroy();
      },
    });
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
  }
}
