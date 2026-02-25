import Phaser from "phaser";

interface GameOverData {
  score: number;
  floor: number;
  energy: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(data: GameOverData) {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0a0a1a");

    // Title
    this.add
      .text(width / 2, height / 2 - 100, "RUN OVER", {
        fontSize: "24px",
        color: "#ef4444",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    // Divider
    this.add.rectangle(width / 2, height / 2 - 70, 180, 1, 0x333355);

    // Stats
    const stats = [
      { label: "SCORE", value: data.score.toLocaleString() },
      { label: "FLOOR", value: String(data.floor) },
      { label: "ENERGY USED", value: String(data.energy) },
    ];

    stats.forEach((s, i) => {
      const y = height / 2 - 40 + i * 30;

      this.add
        .text(width / 2 - 100, y, s.label, {
          fontSize: "8px",
          color: "#666688",
          fontFamily: "'Press Start 2P', monospace",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(width / 2 + 100, y, s.value, {
          fontSize: "10px",
          color: "#ffffff",
          fontFamily: "'Press Start 2P', monospace",
        })
        .setOrigin(1, 0.5);
    });

    // Play Again button
    const playBtn = this.add
      .rectangle(width / 2, height / 2 + 60, 200, 36, 0x22c55e)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height / 2 + 60, "PLAY AGAIN", {
        fontSize: "10px",
        color: "#0a0a1a",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    playBtn.on("pointerover", () => playBtn.setFillStyle(0x16a34a));
    playBtn.on("pointerout", () => playBtn.setFillStyle(0x22c55e));
    playBtn.on("pointerdown", () => this.scene.start("LoadingScene"));

    // Lobby button
    const lobbyBtn = this.add
      .rectangle(width / 2, height / 2 + 110, 200, 36, 0x1a1a2e)
      .setStrokeStyle(1, 0x333355)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height / 2 + 110, "LOBBY", {
        fontSize: "10px",
        color: "#666688",
        fontFamily: "'Press Start 2P', monospace",
      })
      .setOrigin(0.5);

    lobbyBtn.on("pointerover", () => lobbyBtn.setFillStyle(0x222244));
    lobbyBtn.on("pointerout", () => lobbyBtn.setFillStyle(0x1a1a2e));
    lobbyBtn.on("pointerdown", () => this.game.events.emit("go-to-lobby"));
  }
}
