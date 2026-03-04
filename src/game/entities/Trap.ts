import Phaser from "phaser";
import { TrapType, type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Trap {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  type: TrapType;
  triggered: boolean = false;
  id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pos: TilePos, type: TrapType, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.type = type;
    this.id = id;

    const textureKey = type === TrapType.SPIKE ? "trap-spike" : "trap-poison";

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      textureKey,
    );
    this.sprite.setDepth(150); // below entities, above floor
    this.sprite.setOrigin(0.5, 0.5);
  }

  /** Trigger the trap. Returns energy damage dealt. */
  trigger(thickSkinStacks: number): number {
    if (this.triggered && this.type === TrapType.SPIKE) return 0;

    let dmg: number;
    if (this.type === TrapType.SPIKE) {
      dmg = Math.max(1, 4 - thickSkinStacks); // 4 base, reduced by thick skin
      this.triggered = true;

      // Spike retract animation
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.3,
        scaleY: 0.5,
        duration: 200,
        ease: "Power2",
      });
    } else {
      // Poison: 1 dmg now + sets 3 turns of DoT (handled by store)
      dmg = 1;
      // Poison puddle stays — can be re-triggered
    }

    // Damage popup
    const text = this.scene.add
      .text(this.sprite.x, this.sprite.y - 8, `-${dmg}`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "9px",
        color: this.type === TrapType.SPIKE ? "#ef4444" : "#22c55e",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy(),
    });

    return dmg;
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
