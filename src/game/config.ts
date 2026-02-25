import Phaser from "phaser";
import { LoadingScene } from "./scenes/LoadingScene";
import { GameScene } from "./scenes/GameScene";

export function createGameConfig(
  parent: string | HTMLElement,
  width: number,
  height: number
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: Math.floor(width),
    height: Math.floor(height),
    backgroundColor: "#2a2a2a",
    scene: [LoadingScene, GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
  };
}
