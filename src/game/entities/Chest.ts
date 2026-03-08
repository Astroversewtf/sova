import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Chest {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  opened: boolean = false;
  id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pos: TilePos, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.id = id;

    // Pick random loot box variant, fallback to procedural
    const usePng = scene.textures.exists("loot-box-1");
    const textureKey = usePng
      ? (Math.random() < 0.5 ? "loot-box-1" : "loot-box-2")
      : "chest-closed";

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      textureKey,
    );
    this.sprite.setDepth(300);
    this.sprite.setOrigin(0.5, 0.5);
  }

  open() {
    if (this.opened) return;
    this.opened = true;

    const baseX = this.sprite.x;
    const baseY = this.sprite.y;

    // Phase 1: quick hit reaction (micro shake)
    this.scene.tweens.add({
      targets: this.sprite,
      x: baseX + 2,
      duration: 30,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.sprite.setPosition(baseX, baseY);

        // Phase 2: small squash/stretch before break
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: 1.16,
          scaleY: 0.86,
          duration: 58,
          yoyo: true,
          ease: "Quad.easeOut",
          onComplete: () => {
            // Phase 3: quick break fade with tiny lift
            this.spawnBreakDebris(baseX, baseY);
            this.scene.tweens.add({
              targets: this.sprite,
              alpha: 0,
              scaleX: 0.72,
              scaleY: 0.58,
              y: baseY - 6,
              angle: 8,
              duration: 105,
              ease: "Cubic.easeOut",
              onComplete: () => this.sprite.setVisible(false),
            });
          },
        });
      },
    });
  }

  private spawnBreakDebris(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const piece = this.scene.add.rectangle(x, y, 2, 2, 0xcdb89a, 0.9).setDepth(305);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(8, 16);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - Phaser.Math.FloatBetween(1, 3);

      this.scene.tweens.add({
        targets: piece,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.7, 1.2),
        scaleY: Phaser.Math.FloatBetween(0.7, 1.2),
        duration: Phaser.Math.Between(110, 170),
        ease: "Quad.easeOut",
        onComplete: () => piece.destroy(),
      });
    }
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
