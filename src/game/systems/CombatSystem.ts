import type { GameScene } from "../scenes/GameScene";
import type { Player } from "../entities/Player";
import type { Enemy } from "../entities/Enemy";
import { EnemyType, TreasureType } from "../types";
import { TREASURE_VALUES } from "../constants";
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

    // Enemy damage to player = its current HP
    const damageTaken = enemy.hp;

    // Player attacks enemy
    enemy.takeDamage(atk);

    // Enemy attacks player
    this.scene.energyManager.takeDamage(damageTaken);
    player.flashDamage();
    this.scene.vfxManager.flashDamageOverlay();

    // Popup: damage dealt to enemy
    this.scene.popupManager.showDamageNumber(enemy.pos.x, enemy.pos.y, atk);

    // Popup: damage received by player
    this.scene.popupManager.showPlayerDamageNumber(player.pos.x, player.pos.y, damageTaken);

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
    enemy.playAttack();

    const damageTaken = enemy.hp;
    this.scene.energyManager.takeDamage(damageTaken);
    player.flashDamage();
    this.scene.vfxManager.flashDamageOverlay();

    // Popup: damage received by player
    this.scene.popupManager.showPlayerDamageNumber(player.pos.x, player.pos.y, damageTaken);

    this.scene.events.emit("combat:hit", { damage: damageTaken });
  }

  /**
   * Drop 1 loot item at the killed enemy's position.
   * Normal: 65% Energy, 20% Coin, 10% Orb, 5% Nothing
   * Boss:   50% Nothing, Golden Ticket by floor (8%→12% cap), rest split Coin/Orb
   */
  private dropLoot(tileX: number, tileY: number, enemyType: EnemyType) {
    const pos = { x: tileX, y: tileY };
    const isBoss = enemyType === EnemyType.BOSS;
    const roll = Math.random();

    let type: TreasureType | null;
    if (isBoss) {
      const floor = Math.max(7, this.scene.currentFloor);
      const nothingChance = 0.5;
      const goldenChance = Math.min(0.08 + (floor - 7) * 0.01, 0.12);
      const coinChance = (1 - nothingChance - goldenChance) / 2;
      const orbChance = coinChance;

      if (roll < nothingChance) type = null;
      else if (roll < nothingChance + goldenChance) type = TreasureType.GOLDEN_TICKET;
      else if (roll < nothingChance + goldenChance + coinChance) type = TreasureType.COIN;
      else if (roll < nothingChance + goldenChance + coinChance + orbChance) type = TreasureType.ORB;
      else type = TreasureType.ORB; // float safety fallback
    } else {
      if (roll < 0.65) type = TreasureType.ENERGY;
      else if (roll < 0.85) type = TreasureType.COIN;
      else if (roll < 0.95) type = TreasureType.ORB;
      else type = null; // 5% nothing
    }

    if (!type) return;

    const id = `enemy-loot-${Date.now()}`;
    const t = new Treasure(this.scene, pos, type, TREASURE_VALUES[type], id);
    this.scene.treasures.push(t);
    t.setVisible(this.scene.fogOfWar.isVisible(pos));
  }
}
