import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, C } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { UpgradeScene } from "./scenes/UpgradeScene";
import { RunEndScene } from "./scenes/RunEndScene";
import { BossResultScene } from "./scenes/BossResultScene";

export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    backgroundColor: 0x000000,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene, UpgradeScene, RunEndScene, BossResultScene],
    audio: { noAudio: true },
  };
}
