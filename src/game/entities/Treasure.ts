import Phaser from "phaser";
import { TreasureType, type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Treasure {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  type: TreasureType;
  value: number;
  collected: boolean = false;
  id: string;
  private scene: Phaser.Scene;
  private sparkle: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    pos: TilePos,
    type: TreasureType,
    value: number,
    id: string,
  ) {
    this.scene = scene;
    this.pos = { ...pos };
    this.type = type;
    this.value = value;
    this.id = id;

    const textureKey =
      type === TreasureType.COIN
        ? "treasure-coin"
        : type === TreasureType.GEM
          ? "treasure-gem"
          : "treasure-golden-ticket";

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      textureKey,
    );
    this.sprite.setDepth(300);
    this.sprite.setOrigin(0.5, 0.5);

    // Gentle slow vertical bounce
    const baseY = this.sprite.y;
    this.sparkle = scene.tweens.add({
      targets: this.sprite,
      y: baseY - 3,
      duration: 1200 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.sparkle?.destroy();

    // Pop animation
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      y: this.sprite.y - 16,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.sprite.destroy();
      },
    });

    // Floating text
    const label = this.type === TreasureType.COIN ? "+1" : this.type === TreasureType.GEM ? "+5" : "+20";
    const color = this.type === TreasureType.COIN ? "#fbbf24" : this.type === TreasureType.GEM ? "#a78bfa" : "#fbbf24";
    const text = this.scene.add
      .text(this.sprite.x, this.sprite.y - 8, label, {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sparkle?.destroy();
    this.sprite.destroy();
  }
}
