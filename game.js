(function () {
'use strict';

// ===================== CONSTANTS =====================
const TILE = 4;
const CHAR_W = 8, CHAR_H = 10;
const SPRITE_W = CHAR_W * TILE, SPRITE_H = CHAR_H * TILE;
const PLAYER_RADIUS = 16;
const BULLET_RADIUS = 6;
const PLAYER_SPEED = 220;
const BULLET_SPEED = 480;
const SHOOT_COOLDOWN = 320;
const INVINCIBLE_TIME = 1500;
const MAX_LIVES = 3;
const STATE_RATE = 45;
const MAP_W = 2000, MAP_H = 1500;

// ===================== CHARACTER PIXEL ART =====================
// 0=transparent 1=black 2=white 3=accent
const CHAR_DEFS = [
  { name:'Frosty', accent:'#4CAF50', pixels:[
    [0,0,1,1,1,1,0,0],[0,0,1,1,1,1,0,0],[0,3,3,3,3,3,3,0],
    [1,1,1,1,1,1,1,1],[1,2,2,2,2,2,2,1],[1,2,1,2,2,1,2,1],
    [1,2,2,2,2,2,2,1],[1,2,2,1,1,2,2,1],[0,2,2,2,2,2,2,0],
    [0,0,1,0,0,1,0,0]]},
  { name:'Shadow', accent:'#444444', pixels:[
    [0,0,1,1,1,1,0,0],[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],[1,2,2,2,2,2,2,1],[1,2,1,2,2,1,2,1],
    [1,2,2,2,2,2,2,1],[1,2,2,1,1,2,2,1],[0,2,2,2,2,2,2,0],
    [0,0,1,0,0,1,0,0]]},
  { name:'Goldie', accent:'#FFD700', pixels:[
    [0,0,0,1,1,0,0,0],[0,0,1,1,1,1,0,0],[0,0,1,1,1,1,0,0],
    [0,3,3,3,3,3,0,0],[3,3,3,3,3,3,3,0],[3,3,1,3,1,3,3,3],
    [3,3,3,3,3,3,3,0],[0,3,1,1,1,3,0,0],[0,3,3,3,3,3,0,0],
    [0,0,3,3,3,0,0,0]]},
  { name:'Glacier', accent:'#2196F3', pixels:[
    [0,0,1,1,1,1,0,0],[0,0,1,1,1,1,0,0],[0,3,3,3,3,3,3,0],
    [1,1,1,1,1,1,1,1],[1,2,2,2,2,2,2,1],[1,2,1,2,2,1,2,1],
    [1,2,2,2,2,2,2,1],[1,2,2,1,1,2,2,1],[0,2,2,2,2,2,2,0],
    [0,0,1,0,0,1,0,0]]},
  { name:'Blaze', accent:'#F44336', pixels:[
    [0,0,1,1,1,1,0,0],[0,0,1,1,1,1,0,0],[0,3,3,3,3,3,3,0],
    [1,1,1,1,1,1,1,1],[1,2,2,2,2,2,2,1],[1,2,1,2,2,1,2,1],
    [1,2,2,2,2,2,2,1],[1,2,2,1,1,2,2,1],[0,2,2,2,2,2,2,0],
    [0,0,1,0,0,1,0,0]]},
];

// ===================== MAP DEFINITIONS =====================
const MAPS = [
  { name:'Warehouse', bg:'#2d2d1e', wall:'#8B7355', border:'#5C4A32', walls:[
    {x:300,y:200,w:100,h:100},{x:600,y:400,w:80,h:160},{x:1000,y:200,w:120,h:80},
    {x:1400,y:300,w:100,h:100},{x:400,y:700,w:160,h:80},{x:800,y:600,w:100,h:100},
    {x:1200,y:700,w:80,h:160},{x:200,y:1000,w:120,h:80},{x:700,y:1000,w:100,h:100},
    {x:1100,y:1050,w:160,h:80},{x:1500,y:900,w:100,h:120},
    {x:850,y:620,w:300,h:20},{x:850,y:860,w:300,h:20},
    {x:850,y:620,w:20,h:260},{x:1130,y:620,w:20,h:260}],
    spawns:[{x:100,y:100},{x:1900,y:100},{x:100,y:1400},{x:1900,y:1400},
            {x:1000,y:100},{x:1000,y:1400},{x:100,y:750},{x:1900,y:750}]},
  { name:'Bunkers', bg:'#1e2d1e', wall:'#556B55', border:'#3A4D3A', walls:[
    {x:200,y:200,w:200,h:20},{x:200,y:200,w:20,h:200},{x:200,y:380,w:200,h:20},{x:380,y:280,w:20,h:120},
    {x:1400,y:200,w:200,h:20},{x:1580,y:200,w:20,h:200},{x:1400,y:380,w:200,h:20},{x:1400,y:280,w:20,h:120},
    {x:200,y:1000,w:200,h:20},{x:200,y:1000,w:20,h:200},{x:200,y:1180,w:200,h:20},{x:380,y:1000,w:20,h:120},
    {x:1400,y:1000,w:200,h:20},{x:1580,y:1000,w:20,h:200},{x:1400,y:1180,w:200,h:20},{x:1400,y:1000,w:20,h:120},
    {x:900,y:620,w:200,h:20},{x:990,y:520,w:20,h:260},
    {x:620,y:500,w:20,h:300},{x:1360,y:500,w:20,h:300},
    {x:700,y:420,w:600,h:20},{x:700,y:900,w:600,h:20}],
    spawns:[{x:280,y:280},{x:1500,y:280},{x:280,y:1080},{x:1500,y:1080},
            {x:1000,y:750},{x:100,y:700},{x:1900,y:700},{x:1000,y:150}]},
  { name:'Arena', bg:'#1e1e2d', wall:'#6B5570', border:'#4A3A50', walls:[
    {x:400,y:300,w:120,h:40},{x:1480,y:300,w:120,h:40},
    {x:400,y:1100,w:120,h:40},{x:1480,y:1100,w:120,h:40},
    {x:200,y:500,w:40,h:120},{x:200,y:880,w:40,h:120},
    {x:1760,y:500,w:40,h:120},{x:1760,y:880,w:40,h:120},
    {x:700,y:500,w:80,h:80},{x:1220,y:500,w:80,h:80},
    {x:700,y:920,w:80,h:80},{x:1220,y:920,w:80,h:80},
    {x:950,y:700,w:100,h:100},
    {x:500,y:660,w:60,h:60},{x:1440,y:660,w:60,h:60},
    {x:500,y:800,w:60,h:60},{x:1440,y:800,w:60,h:60},
    {x:880,y:380,w:240,h:20},{x:880,y:1100,w:240,h:20}],
    spawns:[{x:100,y:100},{x:1900,y:100},{x:100,y:1400},{x:1900,y:1400},
            {x:1000,y:100},{x:1000,y:1400},{x:100,y:750},{x:1900,y:750}]},
];

// ===================== STATE =====================
let myId = '', myName = '', myChar = 0;
let isHost = false;
let peer = null;
let connections = [];
let hostConn = null;
let players = {};
let bullets = [];
let bulletIdCounter = 0;
let currentMapIdx = 0;
let roundNum = 0;
let gameActive = false;
let roundOver = false;
let mapAnnounce = 0;
let spriteCache = {};
let leaderboard = {};
let lastNetUpdate = 0;

// ===================== INPUT =====================
let keys = {};
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let facingAngle = 0;
let joyTouchId = null, joyStartX = 0, joyStartY = 0, joyDx = 0, joyDy = 0;
let shootTouchActive = false;
let isMobile = false;

// ===================== CAMERA =====================
let camera = { x: 0, y: 0 };

// ===================== DOM =====================
const $ = id => document.getElementById(id);
let canvas, ctx;

// ===================== SPRITES =====================
function renderSprite(charIdx, scale) {
    const def = CHAR_DEFS[charIdx];
    const s = scale || TILE;
    const c = document.createElement('canvas');
    c.width = CHAR_W * s;
    c.height = CHAR_H * s;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    const colorMap = { 1: '#000000', 2: '#ffffff', 3: def.accent };
    for (let y = 0; y < CHAR_H; y++) {
        for (let x = 0; x < CHAR_W; x++) {
            const v = def.pixels[y][x];
            if (v === 0) continue;
            cx.fillStyle = colorMap[v];
            cx.fillRect(x * s, y * s, s, s);
        }
    }
    return c;
}

function getSprite(charIdx) {
    if (!spriteCache[charIdx]) spriteCache[charIdx] = renderSprite(charIdx, TILE);
    return spriteCache[charIdx];
}

function renderCharacterPreviews() {
    const options = document.querySelectorAll('.char-option');
    options.forEach(opt => {
        const idx = parseInt(opt.dataset.char);
        const c = opt.querySelector('canvas');
        const cx = c.getContext('2d');
        cx.imageSmoothingEnabled = false;
        const sprite = renderSprite(idx, 7);
        const ox = (64 - sprite.width) / 2;
        const oy = (64 - sprite.height) / 2;
        cx.drawImage(sprite, ox, oy);
    });
}

// ===================== LEADERBOARD =====================
function loadLeaderboard() {
    try { leaderboard = JSON.parse(localStorage.getItem('pb_leaderboard') || '{}'); } catch { leaderboard = {}; }
}

function saveLeaderboard() {
    localStorage.setItem('pb_leaderboard', JSON.stringify(leaderboard));
}

function addWin(name) {
    leaderboard[name] = (leaderboard[name] || 0) + 1;
    saveLeaderboard();
}

function showRoundEnd(winnerName) {
    roundOver = true;
    $('roundWinner').textContent = winnerName ? winnerName + ' WINS!' : 'DRAW!';
    $('roundEnd').classList.remove('hidden');
    const list = $('leaderboardList');
    list.innerHTML = '';
    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([name, wins], i) => {
        const div = document.createElement('div');
        div.className = 'lb-entry' + (i === 0 ? ' first' : '');
        div.innerHTML = '<span class="rank">#' + (i + 1) + '</span><span class="name">' +
            esc(name) + '</span><span class="wins">' + wins + ' wins</span>';
        list.appendChild(div);
    });
    if (isHost) {
        $('nextRoundBtn').classList.remove('hidden');
        $('waitingNext').classList.add('hidden');
    } else {
        $('nextRoundBtn').classList.add('hidden');
        $('waitingNext').classList.remove('hidden');
    }
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ===================== ROOM CODE =====================
function genCode() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
}

// ===================== NETWORKING =====================
function createRoom() {
    const name = $('nameInput').value.trim();
    if (!name) { $('lobbyStatus').textContent = 'Enter a name!'; return; }
    myName = name;
    isHost = true;
    const code = genCode();
    $('lobbyStatus').textContent = 'Connecting...';

    peer = new Peer('pb-' + code);
    peer.on('open', () => {
        myId = peer.id;
        showWaiting(code);
        players[myId] = makePlayer(myId, myName, myChar);
        updatePlayerList();
    });
    peer.on('error', e => { $('lobbyStatus').textContent = 'Error: ' + e.type; });
    peer.on('connection', conn => {
        conn.on('open', () => {
            connections.push(conn);
        });
        conn.on('data', data => handleHostReceive(data, conn));
        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
            if (players[conn.metadata?.id]) {
                delete players[conn.metadata.id];
                updatePlayerList();
                if (gameActive) checkRoundEnd();
            }
        });
    });
}

function joinRoom() {
    const name = $('nameInput').value.trim();
    const code = $('roomInput').value.trim().toUpperCase();
    if (!name) { $('lobbyStatus').textContent = 'Enter a name!'; return; }
    if (!code) { $('lobbyStatus').textContent = 'Enter a room code!'; return; }
    myName = name;
    isHost = false;
    $('lobbyStatus').textContent = 'Connecting...';

    peer = new Peer();
    peer.on('open', () => {
        myId = peer.id;
        hostConn = peer.connect('pb-' + code, { reliable: true, metadata: { id: myId } });
        hostConn.on('open', () => {
            hostConn.send({ type: 'join', id: myId, name: myName, char: myChar });
        });
        hostConn.on('data', data => handleClientReceive(data));
        hostConn.on('close', () => {
            if (gameActive) { alert('Host disconnected!'); location.reload(); }
        });
        hostConn.on('error', () => { $('lobbyStatus').textContent = 'Could not connect!'; });
    });
    peer.on('error', e => { $('lobbyStatus').textContent = 'Error: ' + e.type; });
}

function broadcast(msg) {
    connections.forEach(c => { try { c.send(msg); } catch {} });
}

function handleHostReceive(data, conn) {
    if (data.type === 'join') {
        conn.metadata = { id: data.id };
        players[data.id] = makePlayer(data.id, data.name, data.char);
        updatePlayerList();
        broadcast({ type: 'playerList', players: serializePlayers() });
        conn.send({ type: 'playerList', players: serializePlayers() });
        conn.send({ type: 'yourId', id: data.id });
    }
    if (data.type === 'input' && players[data.id]) {
        const p = players[data.id];
        p.x = data.x;
        p.y = data.y;
        p.angle = data.angle;
    }
    if (data.type === 'shoot' && players[data.id]) {
        const p = players[data.id];
        if (p.alive) createBullet(data.id, p.x, p.y, data.angle);
    }
}

function handleClientReceive(data) {
    if (data.type === 'yourId') { /* already have myId */ }
    if (data.type === 'playerList') {
        for (const [id, info] of Object.entries(data.players)) {
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            else { players[id].name = info.name; players[id].charIndex = info.char; }
        }
        if (!gameActive) updatePlayerList();
    }
    if (data.type === 'gameStart') {
        currentMapIdx = data.mapIndex;
        roundNum = data.roundNum;
        for (const [id, info] of Object.entries(data.players)) {
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            players[id].x = info.x; players[id].y = info.y;
            players[id].lives = MAX_LIVES; players[id].alive = true;
            players[id].charIndex = info.char; players[id].name = info.name;
        }
        beginGame();
    }
    if (data.type === 'state') {
        for (const [id, info] of Object.entries(data.players)) {
            if (id === myId) {
                players[id].lives = info.lives;
                players[id].alive = info.alive;
                if (info.invincibleUntil) players[id].invincibleUntil = info.invincibleUntil;
                continue;
            }
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            Object.assign(players[id], info);
        }
        bullets = data.bullets || [];
    }
    if (data.type === 'roundEnd') {
        gameActive = false;
        if (data.winnerName) addWin(data.winnerName);
        showRoundEnd(data.winnerName);
    }
    if (data.type === 'newRound') {
        currentMapIdx = data.mapIndex;
        roundNum = data.roundNum;
        for (const [id, info] of Object.entries(data.players)) {
            if (players[id]) { players[id].x = info.x; players[id].y = info.y; players[id].lives = MAX_LIVES; players[id].alive = true; players[id].invincibleUntil = 0; }
        }
        bullets = [];
        $('roundEnd').classList.add('hidden');
        roundOver = false;
        gameActive = true;
        mapAnnounce = Date.now();
    }
}

function serializePlayers() {
    const out = {};
    for (const [id, p] of Object.entries(players)) {
        out[id] = { name: p.name, char: p.charIndex, x: p.x, y: p.y, lives: p.lives, alive: p.alive, angle: p.angle, invincibleUntil: p.invincibleUntil };
    }
    return out;
}

// ===================== PLAYER =====================
function makePlayer(id, name, charIdx) {
    return { id, name, charIndex: charIdx, x: 100, y: 100, lives: MAX_LIVES, alive: true,
             angle: 0, lastShot: 0, invincibleUntil: 0 };
}

// ===================== LOBBY UI =====================
function showWaiting(code) {
    $('lobby').classList.add('hidden');
    $('waitingRoom').classList.remove('hidden');
    $('roomCode').textContent = code;
    if (!isHost) { $('startGameBtn').classList.add('hidden'); }
}

function updatePlayerList() {
    const list = $('playerList');
    list.innerHTML = '';
    for (const p of Object.values(players)) {
        const div = document.createElement('div');
        div.className = 'player-tag' + (p.id === (isHost ? myId : '') ? ' host' : '');
        div.textContent = p.name + (p.id === myId ? ' (you)' : '');
        list.appendChild(div);
    }
}

function setupLobbyEvents() {
    document.querySelectorAll('.char-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.char-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            myChar = parseInt(opt.dataset.char);
        });
    });
    $('createBtn').addEventListener('click', createRoom);
    $('joinBtn').addEventListener('click', joinRoom);
    $('startGameBtn').addEventListener('click', hostStartGame);
    $('nextRoundBtn').addEventListener('click', hostNextRound);
    $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('createBtn').click(); });
    $('roomInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
}

// ===================== GAME START =====================
function hostStartGame() {
    if (Object.keys(players).length < 1) return;
    currentMapIdx = Math.floor(Math.random() * MAPS.length);
    roundNum = 1;
    assignSpawns();
    broadcast({ type: 'gameStart', mapIndex: currentMapIdx, roundNum, players: serializePlayers() });
    beginGame();
}

function hostNextRound() {
    let next;
    do { next = Math.floor(Math.random() * MAPS.length); } while (next === currentMapIdx && MAPS.length > 1);
    currentMapIdx = next;
    roundNum++;
    for (const p of Object.values(players)) { p.lives = MAX_LIVES; p.alive = true; p.invincibleUntil = 0; }
    assignSpawns();
    bullets = [];
    broadcast({ type: 'newRound', mapIndex: currentMapIdx, roundNum, players: serializePlayers() });
    $('roundEnd').classList.add('hidden');
    roundOver = false;
    gameActive = true;
    mapAnnounce = Date.now();
}

function assignSpawns() {
    const spawns = [...MAPS[currentMapIdx].spawns];
    for (let i = spawns.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spawns[i], spawns[j]] = [spawns[j], spawns[i]]; }
    let si = 0;
    for (const p of Object.values(players)) {
        const sp = spawns[si % spawns.length];
        p.x = sp.x; p.y = sp.y;
        si++;
    }
}

function beginGame() {
    $('waitingRoom').classList.add('hidden');
    $('lobby').classList.add('hidden');
    $('roundEnd').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    gameActive = true;
    roundOver = false;
    mapAnnounce = Date.now();
    canvas = $('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    setupInputEvents();
}

// ===================== CANVAS =====================
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ===================== INPUT EVENTS =====================
let inputBound = false;
function setupInputEvents() {
    if (inputBound) return;
    inputBound = true;
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    window.addEventListener('resize', () => { if (canvas) resizeCanvas(); });

    window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    window.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
    window.addEventListener('contextmenu', e => { if (gameActive) e.preventDefault(); });

    // Mobile joystick
    const jz = $('joystickZone');
    if (jz) {
        jz.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.changedTouches[0];
            joyTouchId = t.identifier;
            const rect = jz.getBoundingClientRect();
            joyStartX = rect.left + rect.width / 2;
            joyStartY = rect.top + rect.height / 2;
            joyDx = 0; joyDy = 0;
        }, { passive: false });
        jz.addEventListener('touchmove', e => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === joyTouchId) {
                    const maxR = 55;
                    let dx = t.clientX - joyStartX;
                    let dy = t.clientY - joyStartY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
                    joyDx = dx / maxR;
                    joyDy = dy / maxR;
                }
            }
        }, { passive: false });
        const endJoy = e => {
            for (const t of e.changedTouches) {
                if (t.identifier === joyTouchId) { joyTouchId = null; joyDx = 0; joyDy = 0; }
            }
        };
        jz.addEventListener('touchend', endJoy);
        jz.addEventListener('touchcancel', endJoy);
    }

    // Mobile shoot
    const sb = $('shootBtn');
    if (sb) {
        sb.addEventListener('touchstart', e => { e.preventDefault(); shootTouchActive = true; }, { passive: false });
        sb.addEventListener('touchend', e => { e.preventDefault(); shootTouchActive = false; }, { passive: false });
        sb.addEventListener('touchcancel', e => { shootTouchActive = false; });
    }
}

function getMovement() {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (joyDx !== 0 || joyDy !== 0) { dx = joyDx; dy = joyDy; }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { dx, dy };
}

function getAimAngle() {
    if (!canvas) return facingAngle;
    const me = players[myId];
    if (!me) return facingAngle;
    const sx = me.x - camera.x;
    const sy = me.y - camera.y;
    return Math.atan2(mouseY - sy, mouseX - sx);
}

function wantsShoot() {
    return mouseDown || shootTouchActive;
}

// ===================== BULLETS =====================
function createBullet(ownerId, x, y, angle) {
    bullets.push({
        id: bulletIdCounter++,
        ownerId,
        x, y,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
    });
}

// ===================== COLLISION =====================
function rectContains(r, px, py, pr) {
    return px + pr > r.x && px - pr < r.x + r.w && py + pr > r.y && py - pr < r.y + r.h;
}

function clampToMap(x, y, r) {
    return { x: Math.max(r, Math.min(MAP_W - r, x)), y: Math.max(r, Math.min(MAP_H - r, y)) };
}

function resolveWalls(ox, oy, nx, ny, r) {
    const walls = MAPS[currentMapIdx].walls;
    let rx = nx, ry = ny;
    // Try X first
    let blocked = false;
    for (const w of walls) {
        if (rectContains(w, rx, oy, r)) { rx = ox; blocked = true; break; }
    }
    for (const w of walls) {
        if (rectContains(w, rx, ry, r)) { ry = oy; break; }
    }
    return { x: rx, y: ry };
}

function circlesOverlap(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

// ===================== UPDATE =====================
function update(dt) {
    const me = players[myId];
    if (!me || !me.alive) { updateCamera(); return; }

    // Movement
    const mov = getMovement();
    if (mov.dx !== 0 || mov.dy !== 0) {
        facingAngle = Math.atan2(mov.dy, mov.dx);
    }
    const nx = me.x + mov.dx * PLAYER_SPEED * dt;
    const ny = me.y + mov.dy * PLAYER_SPEED * dt;
    const resolved = resolveWalls(me.x, me.y, nx, ny, PLAYER_RADIUS);
    const clamped = clampToMap(resolved.x, resolved.y, PLAYER_RADIUS);
    me.x = clamped.x;
    me.y = clamped.y;

    if (!isMobile) {
        me.angle = getAimAngle();
    } else {
        me.angle = facingAngle;
    }

    // Shooting
    const now = Date.now();
    if (wantsShoot() && now - me.lastShot > SHOOT_COOLDOWN) {
        me.lastShot = now;
        const shootAngle = isMobile ? facingAngle : getAimAngle();
        if (isHost) {
            createBullet(myId, me.x, me.y, shootAngle);
        } else {
            hostConn.send({ type: 'shoot', id: myId, angle: shootAngle });
        }
    }

    // Send position to host
    if (!isHost && hostConn) {
        const now2 = Date.now();
        if (now2 - lastNetUpdate > STATE_RATE) {
            hostConn.send({ type: 'input', id: myId, x: me.x, y: me.y, angle: me.angle });
            lastNetUpdate = now2;
        }
    }

    // Host: update bullets, collisions, broadcast
    if (isHost) {
        updateBullets(dt);
        checkCollisions();
        const now3 = Date.now();
        if (now3 - lastNetUpdate > STATE_RATE) {
            broadcast({ type: 'state', players: serializePlayers(), bullets: bullets.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId })) });
            lastNetUpdate = now3;
        }
        checkRoundEnd();
    }

    updateCamera();
}

function updateBullets(dt) {
    const walls = MAPS[currentMapIdx].walls;
    bullets = bullets.filter(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) return false;
        for (const w of walls) {
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) return false;
        }
        return true;
    });
}

function checkCollisions() {
    const now = Date.now();
    bullets = bullets.filter(b => {
        for (const p of Object.values(players)) {
            if (!p.alive || p.id === b.ownerId) continue;
            if (now < p.invincibleUntil) continue;
            if (circlesOverlap(b.x, b.y, BULLET_RADIUS, p.x, p.y, PLAYER_RADIUS)) {
                p.lives--;
                if (p.lives <= 0) {
                    p.alive = false;
                } else {
                    p.invincibleUntil = now + INVINCIBLE_TIME;
                }
                return false;
            }
        }
        return true;
    });
}

function checkRoundEnd() {
    if (!gameActive || roundOver) return;
    const alive = Object.values(players).filter(p => p.alive);
    const total = Object.values(players).length;
    if (total <= 1) return;
    if (alive.length <= 1) {
        gameActive = false;
        roundOver = true;
        const winner = alive[0];
        const winnerName = winner ? winner.name : null;
        if (winnerName) addWin(winnerName);
        showRoundEnd(winnerName);
        broadcast({ type: 'roundEnd', winnerId: winner?.id, winnerName });
    }
}

// ===================== CAMERA =====================
function updateCamera() {
    if (!canvas) return;
    const me = players[myId];
    if (!me) return;
    const tx = me.x - canvas.width / 2;
    const ty = me.y - canvas.height / 2;
    camera.x += (tx - camera.x) * 0.12;
    camera.y += (ty - camera.y) * 0.12;
    camera.x = Math.max(0, Math.min(MAP_W - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(MAP_H - canvas.height, camera.y));
}

// ===================== RENDER =====================
function render() {
    if (!ctx || !canvas) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const map = MAPS[currentMapIdx];

    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    // Background
    ctx.fillStyle = map.bg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gs = 80;
    const sx = Math.floor(camera.x / gs) * gs;
    const sy = Math.floor(camera.y / gs) * gs;
    for (let x = sx; x < camera.x + canvas.width + gs; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke();
    }
    for (let y = sy; y < camera.y + canvas.height + gs; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
    }

    // Map border
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_W, MAP_H);

    // Walls
    for (const w of map.walls) {
        ctx.fillStyle = map.wall;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = map.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // Bullets
    for (const b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Players
    const now = Date.now();
    for (const p of Object.values(players)) {
        if (!p.alive) continue;
        const invincible = now < p.invincibleUntil;
        if (invincible && Math.floor(now / 80) % 2 === 0) continue;

        const sprite = getSprite(p.charIndex);
        ctx.drawImage(sprite, Math.round(p.x - SPRITE_W / 2), Math.round(p.y - SPRITE_H / 2));

        // Aim indicator
        if (p.id === myId) {
            const aimLen = 28;
            const ax = p.x + Math.cos(p.angle) * aimLen;
            const ay = p.y + Math.sin(p.angle) * aimLen;
            ctx.beginPath();
            ctx.arc(ax, ay, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
        }

        // Name tag
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = invincible ? '#ff6666' : '#ffffff';
        ctx.fillText(p.name, p.x, p.y - SPRITE_H / 2 - 14);

        // Lives dots
        const dotY = p.y - SPRITE_H / 2 - 6;
        const totalW = p.lives * 10 + (MAX_LIVES - p.lives) * 10;
        let dotX = p.x - totalW / 2 + 5;
        for (let i = 0; i < MAX_LIVES; i++) {
            ctx.beginPath();
            ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
            ctx.fillStyle = i < p.lives ? '#e94560' : 'rgba(255,255,255,0.15)';
            ctx.fill();
            dotX += 10;
        }
    }

    ctx.restore();

    // HUD
    const me = players[myId];
    if (me) {
        const hud = $('livesDisplay');
        let hearts = '';
        for (let i = 0; i < MAX_LIVES; i++) hearts += i < me.lives ? '❤️ ' : '🖤 ';
        hud.textContent = hearts;
        $('roundDisplay').textContent = 'ROUND ' + roundNum + ' • ' + MAPS[currentMapIdx].name.toUpperCase();
    }

    // Map announce
    if (mapAnnounce && now - mapAnnounce < 2500) {
        const alpha = Math.min(1, (2500 - (now - mapAnnounce)) / 800);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e94560';
        ctx.fillText(MAPS[currentMapIdx].name.toUpperCase(), canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '20px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('ROUND ' + roundNum, canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
    }

    // Death message
    if (me && !me.alive && gameActive) {
        ctx.save();
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(233,69,96,0.8)';
        ctx.fillText('ELIMINATED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Spectating...', canvas.width / 2, canvas.height / 2 + 30);
        ctx.restore();
    }

    // Player count alive
    if (gameActive) {
        const aliveCount = Object.values(players).filter(p => p.alive).length;
        const totalCount = Object.values(players).length;
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#888';
        ctx.fillText(aliveCount + '/' + totalCount + ' alive', canvas.width - 16, canvas.height - 16);
    }
}

// ===================== SPECTATE CAMERA =====================
function spectateTarget() {
    const me = players[myId];
    if (me && me.alive) return me;
    const alive = Object.values(players).filter(p => p.alive);
    return alive[0] || me;
}

// ===================== GAME LOOP =====================
let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    if (gameActive) {
        update(dt);
        render();
    }
    requestAnimationFrame(gameLoop);
}

// ===================== INIT =====================
function init() {
    loadLeaderboard();
    renderCharacterPreviews();
    setupLobbyEvents();
    requestAnimationFrame(gameLoop);
}

init();

})();
