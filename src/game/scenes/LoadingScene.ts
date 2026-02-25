import Phaser from "phaser";

/** All tile assets to preload */
const TILES = [
  "stone",
  "stoneUneven",
  "stoneSide",
  "stoneSideUneven",
  "stoneLeft",
  "stoneRight",
  "stoneCorner",
  "stoneInset",
  "stoneMissing",
  "stoneTile",
  "dirt",
  "planks",
  "planksBroken",
  "stoneWall",
  "stoneWallDoor",
  "stoneWallDoorOpen",
  "stoneWallBroken",
  "stoneWallHalf",
  "stoneWallArchway",
  "stoneStep",
  "stoneSteps",
  "dirtTiles",
];

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
  }

  preload() {
    for (const tile of TILES) {
      this.load.image(tile, `/tiles/${tile}.png`);
    }
  }

  create() {
    // Set LINEAR filtering on tile textures for smooth scaling
    for (const tile of TILES) {
      const tex = this.textures.get(tile);
      if (tex.key !== "__MISSING") {
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    this.scene.start("GameScene");
  }
}
