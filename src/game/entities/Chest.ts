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

    // Break animation: shake → shrink → disappear
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 200,
          onComplete: () => this.sprite.setVisible(false),
        });
      },
    });
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
