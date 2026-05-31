# Pixel Blasters

A browser-based, peer-to-peer multiplayer **top-down free-for-all shooter**. No install, no build step — just open the page, pick a fighter, and battle your friends.

**Play it:** once GitHub Pages is enabled, visit
`https://randomprojects1234.github.io/shooter-game-2/`

## How to play

1. Type a name and pick one of the 5 fighters.
2. **Create Room** to host — you'll get a 5-letter code. Share it with friends.
3. Friends type the code and **Join**. The host presses **Start**.
4. Last fighter standing wins the round. Maps are random each round and the leaderboard tracks total wins.

### Controls
- **Move:** `WASD` or arrow keys (mobile: left joystick)
- **Aim & shoot:** mouse aim + click to fire (mobile: FIRE button)
- You have **3 lives**; each bullet hit costs one.

## Match features

- **8 maps with pre-round voting** — Warehouse, Bunkers, Arena, Maze, Crossfire, Pillars, Fortress, and Lanes. Before every round players vote on three candidate maps (with minimap previews); most votes wins.
- **Walls break at 1 minute** — all cover is destroyed 60 seconds into a round, opening the map up.
- **Closing storm** — a Brawl-Stars / Fortnite-style safe zone shrinks toward the center. Get caught outside and you lose a life every few seconds. Combined with the walls breaking, it forces a showdown.
- **Leaderboard** — total wins, saved locally per device.

## Tech

Vanilla JavaScript + HTML5 canvas, no framework or build. Multiplayer is peer-to-peer via [PeerJS](https://peerjs.com/) — one player hosts (authoritative for movement, bullets, collisions, storm) and others connect by room code. Works best on the same network; some strict/corporate NATs may block the direct peer connection.

### Files
- `index.html`, `style.css`, `game.js` — the whole game
- `chars/char0–4.png` — the five player sprites
- `bullet.png` — the projectile
