import type { GameScene } from "../scenes/GameScene";
import type { Player } from "../entities/Player";
import type { Enemy } from "../entities/Enemy";
import { EnemyType, TreasureType, CellType } from "../types";
import { TILE_SIZE, TILE_FULL_H, C, TREASURE_VALUES } from "../constants";
import { Treasure } from "../entities/Treasure";
import { useGameStore } from "@/stores/gameStore";

export class CombatSystem {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  /**
   * Player bumps into enemy.
   * Both take damage simultaneously.
   * Returns true if the enemy died.
   */
  resolveBump(player: Player, enemy: Enemy): boolean {
    const store = useGameStore.getState();
    const atk = store.atk;

    // Player attacks enemy
    const damageTaken = enemy.hp; // Enemy damage = its current HP
    enemy.takeDamage(atk);

    // Enemy attacks player
    this.scene.energyManager.takeDamage(damageTaken);
    player.flashDamage();

    // Combat text popup
    this.showCombatText(enemy.pos.x, enemy.pos.y, "SMASH!");

    this.scene.events.emit("combat:hit", { damage: damageTaken });

    if (!enemy.isAlive()) {
      enemy.die();
      this.scene.events.emit("combat:kill", enemy);

      // Track kill
      if (enemy.type === EnemyType.BOSS) {
        store.incrementBossKills();
      } else {
        store.incrementKills();
      }

      // Life Steal
      const lifeStealStacks = store.getUpgradeStacks("life_steal");
      if (lifeStealStacks > 0) {
        this.scene.energyManager.heal(lifeStealStacks * 2);
        this.scene.events.emit("energy:heal", lifeStealStacks * 2);
      }

      // Drop loot at enemy position
      this.dropLoot(enemy.pos.x, enemy.pos.y, enemy.type);

      return true;
    }

    return false;
  }

  /**
   * Enemy bumps into player (enemy moves onto player tile).
   * Only the player takes damage.
   */
  resolveEnemyBump(enemy: Enemy, player: Player) {
    const damageTaken = enemy.hp;
    this.scene.energyManager.takeDamage(damageTaken);
    player.flashDamage();

    // Combat text
    this.showCombatText(player.pos.x, player.pos.y, `-${damageTaken}`);

    this.scene.events.emit("combat:hit", { damage: damageTaken });
  }

  /**
   * Drop 1-3 loot items around a killed enemy's position.
   * Boss drops more and rarer loot.
   */
  private dropLoot(tileX: number, tileY: number, enemyType: EnemyType) {
    const map = this.scene.floorMap;
    const dirs = [
      { x: 0, y: 0 },
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
    ];

    // Find empty floor tiles at/around kill position
    const spots: { x: number; y: number }[] = [];
    for (const d of dirs) {
      const nx = tileX + d.x;
      const ny = tileY + d.y;
      if (
        nx >= 0 && ny >= 0 && nx < map.width && ny < map.height &&
        map.cells[ny][nx] === CellType.FLOOR
      ) {
        spots.push({ x: nx, y: ny });
      }
    }
    if (spots.length === 0) return;

    const isBoss = enemyType === EnemyType.BOSS;
    const count = isBoss ? Math.min(3, spots.length) : Math.min(1 + Math.floor(Math.random() * 2), spots.length);

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let type: TreasureType;
      if (isBoss) {
        if (roll < 0.3) type = TreasureType.COIN;
        else if (roll < 0.7) type = TreasureType.GEM;
        else type = TreasureType.GOLDEN_TICKET;
      } else {
        if (roll < 0.6) type = TreasureType.COIN;
        else if (roll < 0.9) type = TreasureType.GEM;
        else type = TreasureType.GOLDEN_TICKET;
      }

      const pos = spots[i];
      const id = `enemy-loot-${Date.now()}-${i}`;
      const t = new Treasure(this.scene, pos, type, TREASURE_VALUES[type], id);
      this.scene.treasures.push(t);
      t.setVisible(this.scene.fogOfWar.isVisible(pos));
    }
  }

  /**
   * Animated "SMASH!" or damage text popup at a tile position
   */
  private showCombatText(tileX: number, tileY: number, label: string) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H;

    const isSmash = label === "SMASH!";
    const color = isSmash ? "#fbbf24" : "#ef4444";
    const fontSize = isSmash ? "11px" : "9px";

    const text = this.scene.add
      .text(worldX, worldY, label, {
        fontFamily: '"8bit Wonder"',
        fontSize,
        color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1500)
      .setAlpha(0);

    // Pop in + float up + fade out
    this.scene.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.5, to: 1.2 },
      scaleY: { from: 0.5, to: 1.2 },
      duration: 150,
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          y: text.y - 28,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 500,
          ease: "Power2",
          onComplete: () => text.destroy(),
        });
      },
    });
  }
}
