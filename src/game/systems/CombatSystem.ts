import type { GameScene } from "../scenes/GameScene";
import type { Player } from "../entities/Player";
import type { Enemy } from "../entities/Enemy";
import { EnemyType, TreasureType } from "../types";
import { getTier, getEnemyDMG } from "../constants";
import { Treasure } from "../entities/Treasure";
import { useGameStore } from "@/stores/gameStore";
import { emitSfxEvent } from "@/lib/audioEvents";

/** Golden Ticket multiplier — diminishing returns: keys^0.25 */
function jackpotMultiplier(keys: number): number {
  return Math.pow(Math.max(keys, 1), 0.25);
}

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

    // Enemy damage = base DMG × tier dmgMult
    const tier = getTier(this.scene.currentFloor);
    const baseDMG = getEnemyDMG(enemy.type);
    const damageTaken = enemy.type === EnemyType.BOSS
      ? 7
      : Math.ceil(baseDMG * tier.dmgMult);

    // Player attacks enemy
    if (enemy.type === EnemyType.BOSS) {
      this.scene.enemyAI.registerBossHit(enemy);
    }
    emitSfxEvent("user-attack");
    enemy.takeDamage(atk);

    // Enemy attacks player
    this.scene.energyManager.takeDamage(damageTaken);
    player.flashDamage();
    this.scene.vfxManager.flashDamageOverlay();
    emitSfxEvent("user-get-hit");

    // Popup: damage dealt to enemy
    this.scene.popupManager.showDamageNumber(enemy.pos.x, enemy.pos.y, atk);

    // Popup: damage received by player
    this.scene.popupManager.showPlayerDamageNumber(player.pos.x, player.pos.y, damageTaken);

    this.scene.events.emit("combat:hit", { damage: damageTaken });

    if (!enemy.isAlive()) {
      enemy.die();
      if (enemy.type === EnemyType.BOSS) {
        emitSfxEvent("boss-intro-stop");
      }
      this.scene.events.emit("combat:kill", enemy);
      this.scene.vfxManager.playKillImpact(enemy.type === EnemyType.BOSS);

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
    enemy.playAttack(player.pos);

    const tier = getTier(this.scene.currentFloor);
    const baseDMG = getEnemyDMG(enemy.type);
    const damageTaken = enemy.type === EnemyType.BOSS
      ? 7
      : Math.ceil(baseDMG * tier.dmgMult);
    this.scene.energyManager.takeDamage(damageTaken);
    player.flashDamage();
    this.scene.vfxManager.flashDamageOverlay();
    emitSfxEvent("user-get-hit");

    // Popup: damage received by player
    this.scene.popupManager.showPlayerDamageNumber(player.pos.x, player.pos.y, damageTaken);

    this.scene.events.emit("combat:hit", { damage: damageTaken });
  }

  /**
   * Drop 1 loot item at the killed enemy's position.
   * Each enemy type has its own drop table and base values.
   * Boss drop table is separate (Golden Ticket chance by floor).
   */
  private dropLoot(tileX: number, tileY: number, enemyType: EnemyType) {
    const pos = { x: tileX, y: tileY };
    const roll = Math.random();

    // Boss — always drops something
    if (enemyType === EnemyType.BOSS) {
      const floor = Math.max(7, this.scene.currentFloor);
      const goldenChance = Math.min(0.08 + (floor - 7) * 0.01, 0.12);
      const coinChance = 0.55;
      // Orb = remaining (1 - golden - coin)

      let type: TreasureType;
      if (roll < goldenChance) type = TreasureType.GOLDEN_TICKET;
      else if (roll < goldenChance + coinChance) type = TreasureType.COIN;
      else type = TreasureType.ORB;
      const keys = useGameStore.getState().keysUsed;
      const baseBossValue = type === TreasureType.ORB ? 1 : type === TreasureType.COIN ? 150 : 1;
      const keyMult = type === TreasureType.GOLDEN_TICKET ? jackpotMultiplier(keys) : keys;
      const bossValue = Math.floor(baseBossValue * keyMult);
      const id = `enemy-loot-${Date.now()}`;
      const t = new Treasure(this.scene, pos, type, bossValue, id);
      this.scene.treasures.push(t);
      t.setVisible(this.scene.fogOfWar.isVisible(pos));
      return;
    }

    // Normal enemies — per-type drop tables
    const isGhost = enemyType === EnemyType.GHOST;
    const energyChance = isGhost ? 0.45 : 0.50;
    const coinsChance = isGhost ? 0.25 : 0.27;
    const orbsChance = isGhost ? 0.15 : 0.08;
    // Nada = 15% for all

    let type: TreasureType | null;
    if (roll < energyChance) type = TreasureType.ENERGY;
    else if (roll < energyChance + coinsChance) type = TreasureType.COIN;
    else if (roll < energyChance + coinsChance + orbsChance) type = TreasureType.ORB;
    else type = null; // 15% nothing

    if (!type) return;

    // Base values per enemy type, scaled by tier lootMult (orbs always 1)
    const tier = getTier(this.scene.currentFloor);
    const keys = useGameStore.getState().keysUsed;
    let value: number;
    if (type === TreasureType.ORB) {
      value = 1 * keys; // Linear key multiplier
    } else if (type === TreasureType.ENERGY) {
      const base = enemyType === EnemyType.GOLEM ? 10 : isGhost ? 7 : 5;
      value = Math.floor(base * tier.lootMult); // Energy NOT multiplied by keys
    } else {
      // COIN
      const base = enemyType === EnemyType.GOLEM ? 30 : isGhost ? 25 : 15;
      value = Math.floor(base * tier.lootMult * keys); // Linear key multiplier
    }

    const id = `enemy-loot-${Date.now()}`;
    const t = new Treasure(this.scene, pos, type, value, id);
    this.scene.treasures.push(t);
    t.setVisible(this.scene.fogOfWar.isVisible(pos));
  }
}
