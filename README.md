# SOVA - Technical Documentation

A blockchain-integrated turn-based roguelike dungeon crawler built with Next.js, Phaser 3, and Avalanche. Players explore procedurally generated floors, fight enemies in a turn-based system, collect loot, and compete on global leaderboards.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Game Engine | Phaser 3 + GridEngine |
| UI | React 19, Tailwind CSS 4 |
| State Management | Zustand 5 |
| Authentication | Privy (email + wallet login) |
| Blockchain | Avalanche Fuji Testnet (viem, @avalanche-sdk/client) |
| Database | Firebase / Firestore |
| Data Fetching | TanStack React Query |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Privy provider
│   ├── page.tsx                # Main view router (connect → lobby → game)
│   ├── globals.css             # Tailwind + global styles
│   └── api/
│       ├── beta/route.ts       # Beta access code validation
│       └── user/route.ts       # User CRUD (GET/POST/PATCH)
├── components/
│   ├── PhaserGame.tsx          # Phaser instance lifecycle manager
│   ├── GameHUD.tsx             # In-game energy bar, loot display, PASS button
│   ├── GameOverOverlay.tsx     # End-of-run stats and navigation
│   ├── LootRevealOverlay.tsx   # Animated loot reveal (coins → orbs → summary)
│   ├── UpgradeOverlay.tsx      # Post-floor upgrade selection (slot machine UI)
│   ├── TopBar.tsx              # Lobby header: prize pools, inventory, wallet
│   ├── BottomNav.tsx           # Lobby tab navigator
│   ├── ChatSidebar.tsx         # Real-time chat (desktop sidebar / mobile floating)
│   └── lobby/
│       ├── HomeTab.tsx         # Play + guide buttons
│       ├── ShopTab.tsx         # Purchase keys/tickets with AVAX
│       ├── QuestsTab.tsx       # Daily/weekly/event quests
│       ├── RankingsTab.tsx     # Weekly & best-run leaderboards
│       └── StashTab.tsx        # Earnings, skins, items inventory
├── game/
│   ├── config.ts               # Phaser game configuration
│   ├── constants.ts            # Game balance: tiers, enemies, upgrades
│   ├── types.ts                # TypeScript interfaces for game data
│   ├── scenes/
│   │   ├── BootScene.ts        # Asset preloading and animation setup
│   │   ├── GameScene.ts        # Main gameplay loop and floor orchestration
│   │   ├── HUDScene.ts         # Parallel scene: energy bar, resource badges
│   │   ├── RunEndScene.ts      # Game over sequence: death anim → chest open
│   │   ├── BossResultScene.ts  # Boss defeat celebration screen
│   │   └── UpgradeScene.ts     # Upgrade selection scene bridge
│   ├── entities/
│   │   ├── Player.ts           # Player sprite, movement, animation
│   │   ├── Enemy.ts            # Enemy types: rock, golem, ghost, boss
│   │   ├── Chest.ts            # Breakable loot containers
│   │   ├── Fountain.ts         # One-time energy healing
│   │   ├── Treasure.ts         # Collectible items (coins, energy, orbs)
│   │   ├── Trap.ts             # Spike traps with scaling damage
│   │   └── Stairs.ts           # Floor exit trigger
│   └── systems/
│       ├── TurnManager.ts      # Turn phase state machine
│       ├── CombatSystem.ts     # Damage calculation, loot drops
│       ├── EnemyAI.ts          # BFS pathfinding, detection ranges
│       ├── RoomGenerator.ts    # Procedural floor generation (BSP)
│       ├── FogOfWar.ts         # Bresenham raycasted line-of-sight
│       ├── EnergyManager.ts    # Energy as health + movement fuel
│       ├── UpgradeManager.ts   # Upgrade application and stacking
│       ├── TreasureManager.ts  # Loot spawning and collection
│       ├── PopupManager.ts     # Floating damage/pickup numbers
│       └── VFXManager.ts       # Particle effects and visual feedback
├── stores/
│   ├── walletStore.ts          # Wallet connection state + view routing
│   ├── playerStore.ts          # Persistent player inventory (synced to Firestore)
│   ├── gameStore.ts            # Ephemeral run state (energy, loot, upgrades)
│   └── lobbyStore.ts           # Lobby tab navigation + chat message buffer
└── lib/
    ├── providers.tsx           # Privy provider configuration
    ├── privy.ts                # Transaction hooks (AVAX + USDT transfers)
    ├── firebase.ts             # Firebase app initialization
    ├── firestore.ts            # Firestore CRUD: users, leaderboards, chat, quests
    └── avax.ts                 # Avalanche SDK: balance checks, tx receipts
```

## Architecture

### View System

The app uses a state-driven view router controlled by `walletStore.view`:

```
Connect → Lobby → Game
   ↑         ↓       ↓
   └─────────┴───────┘  (logout / home)
```

- **Connect**: Beta code validation + Privy authentication (email or wallet)
- **Lobby**: 5-tab hub (Home, Shop, Quests, Rankings, Stash) with chat sidebar
- **Game**: Phaser canvas with React overlay system for HUD, upgrades, and loot reveal

### State Management

Four Zustand stores with clear separation of concerns:

| Store | Scope | Persistence |
|---|---|---|
| `walletStore` | Connection state, view routing | Session only |
| `playerStore` | Coins, orbs, keys, gems, tickets, scores | Firestore (via API routes) |
| `gameStore` | Energy, floor, upgrades, loot, combat stats | Ephemeral (per run) |
| `lobbyStore` | Active tab, chat messages | Session only |

`playerStore` syncs every mutation to Firestore through `PATCH /api/user`.

### React-Phaser Communication

The two frameworks communicate via custom DOM events, avoiding tight coupling:

| Direction | Event | Purpose |
|---|---|---|
| Phaser → React | `game.events.emit("go-to-lobby")` | Return to lobby |
| React → Phaser | `sova:upgrade-chosen` | Apply selected upgrade |
| React → Phaser | `sova:skip-turn` | PASS button in HUD |
| React → Phaser | `sova:run-end-action` | Play again or go home |
| React → Phaser | `sova:chat-focus` / `sova:chat-blur` | Toggle keyboard capture |

## Game Engine

### Turn System

Strict phase-based turn management:

```
PLAYER_INPUT → PLAYER_MOVE → ENEMY_MOVE → CHECK_CONDITIONS → PLAYER_INPUT
```

1. Player presses a direction key
2. Target tile resolved: wall (cancel), enemy (attack), chest (break), empty (move)
3. Post-move: spend 1 energy, collect treasure, check traps/fountains/stairs
4. All enemies act: BFS pathfinding within detection range, collision resolution by proximity
5. Fog of war and visibility updated, return to input phase

### Procedural Generation

Floors are generated using a BSP-based room algorithm:

- **Room count**: 5-6 (floors 1-4) scaling to 15+ (floor 11+)
- **Floor dimensions**: 34x22 tiles (early) to 56x38 tiles (late)
- **Room sizes**: 3x3 to 7x7, connected by 2-tile corridors
- **Safe spawning**: Player gets a 3-tile safety radius; stairs placed at minimum 60% distance
- **Entity distribution**: Enemies, treasures, traps, chests, and fountains scaled by floor tier

### Combat

Bump-to-attack system with simultaneous damage exchange:

- Moving into an enemy triggers mutual damage
- Player ATK boosted by Sharp Blade upgrade (+1 per stack)
- Enemy damage scaled by floor tier multipliers
- Thick Skin upgrade reduces incoming damage (-1 per stack, min 1)
- Life Steal restores 2 energy per kill per stack

### Enemy Types

| Type | HP | DMG | Behavior |
|---|---|---|---|
| Rock | 1 | 2 | Stationary until detected (5-tile range) |
| Golem | 1 | 2 | Slow (moves every 3 turns), 5-tile detection |
| Ghost | 3 | 3 | Aggressive (4-tile base + 6-tile aggro range) |
| Boss (SOVA) | 7 | 7 | Always active (infinite range), spawns floor 7+ |

All stats scale by floor tier (1.0x at floor 1 up to 1.5x HP / 1.45x DMG at floor 11+).

### Upgrade System

After each floor, players choose 1 of 3 randomly offered upgrades:

| Upgrade | Rarity | Effect |
|---|---|---|
| Sharp Blade | Common (60%) | +1 ATK per stack |
| Vitality Surge | Common (60%) | +10 max energy |
| Swift Feet | Common (60%) | 10% chance of free move (no energy cost) |
| Life Steal | Rare (30%) | +2 energy per kill per stack |
| Thick Skin | Rare (30%) | -1 incoming damage per stack |
| Second Wind | Epic (10%) | Instantly recover 15 energy (one-time) |

Rerolls available at Fibonacci-scaled cost (10, 20, 30, 50, 80...).

### Vision and Fog of War

Bresenham raycasted line-of-sight with dynamic vision radius based on energy:

| Energy | Vision Radius |
|---|---|
| 76-100 | 7 tiles |
| 51-75 | 6 tiles |
| 26-50 | 5 tiles |
| 11-25 | 4 tiles |
| 1-10 | 3 tiles |

### Scene Flow

```
BootScene (preload assets)
    ↓
GameScene (main loop)
    ├── Floor complete → BossResultScene (if boss killed) → UpgradeOverlay → next floor
    ├── Floor complete → UpgradeOverlay → next floor
    └── Energy depleted / Exit → RunEndScene → LootRevealOverlay → GameOverOverlay
```

## Blockchain Integration

### Authentication (Privy)

- Supports email and wallet-based login
- Embedded wallets created automatically for email users
- Configured for Avalanche Fuji testnet (chain ID 43113)
- Beta-gated access via Firestore codes

### Transactions

- **AVAX transfers**: Direct native token transfers for shop purchases
- **ERC20 transfers**: Encoded `transfer()` calls for USDT payments
- Transaction hooks via `@privy-io/react-auth` SDK

### Shop

Items purchasable with AVAX (testnet):
- Keys: 0.25 AVAX each
