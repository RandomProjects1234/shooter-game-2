(function () {
'use strict';

// ===================== CONSTANTS =====================
const PLAYER_RADIUS = 18;
const DRAW_SIZE = 50;            // on-screen size of a player sprite
const BULLET_RADIUS = 8;
const BULLET_DRAW = 20;          // smaller than player, but clearly visible
const PLAYER_SPEED = 220;
const BULLET_SPEED = 480;
const SHOOT_COOLDOWN = 320;
const INVINCIBLE_TIME = 1500;
const MAX_LIVES = 3;
const STATE_RATE = 40;
const MAP_W = 2000, MAP_H = 1500;

const CHAR_NAMES = ['Greenie', 'Shadow', 'Goldie', 'Blue', 'Red'];

// ===================== IMAGES =====================
const charImages = [];
let bulletImg = null;

function loadImages(cb) {
    const total = 6;
    let done = 0;
    const tick = () => { if (++done >= total) cb(); };
    for (let i = 0; i < 5; i++) {
        const img = new Image();
        img.onload = tick;
        img.onerror = tick;
        img.src = 'chars/char' + i + '.png';
        charImages[i] = img;
    }
    bulletImg = new Image();
    bulletImg.onload = tick;
    bulletImg.onerror = tick;
    bulletImg.src = 'bullet.png';
}

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
            {x:1000,y:120},{x:1000,y:1380},{x:120,y:750},{x:1880,y:750}]},
  { name:'Bunkers', bg:'#1e2d1e', wall:'#556B55', border:'#3A4D3A', walls:[
    {x:200,y:200,w:200,h:20},{x:200,y:200,w:20,h:200},{x:200,y:380,w:200,h:20},{x:380,y:280,w:20,h:120},
    {x:1400,y:200,w:200,h:20},{x:1580,y:200,w:20,h:200},{x:1400,y:380,w:200,h:20},{x:1400,y:280,w:20,h:120},
    {x:200,y:1000,w:200,h:20},{x:200,y:1000,w:20,h:200},{x:200,y:1180,w:200,h:20},{x:380,y:1000,w:20,h:120},
    {x:1400,y:1000,w:200,h:20},{x:1580,y:1000,w:20,h:200},{x:1400,y:1180,w:200,h:20},{x:1400,y:1000,w:20,h:120},
    {x:900,y:620,w:200,h:20},{x:990,y:520,w:20,h:260},
    {x:620,y:500,w:20,h:300},{x:1360,y:500,w:20,h:300},
    {x:700,y:420,w:600,h:20},{x:700,y:900,w:600,h:20}],
    spawns:[{x:300,y:600},{x:1700,y:600},{x:300,y:900},{x:1700,y:900},
            {x:1000,y:150},{x:1000,y:1350},{x:100,y:750},{x:1900,y:750}]},
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
            {x:1000,y:120},{x:1000,y:1380},{x:120,y:750},{x:1880,y:750}]},
];

// ===================== STATE =====================
let myId = '', myName = '', myChar = 0;
let isHost = false;
let hostId = '';
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
let leaderboard = {};
let lastNetUpdate = 0;

// connection guards
let connecting = false;
let joined = false;
let joinTimeout = null;

// ===================== INPUT =====================
let keys = {};
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let facingAngle = 0;
let joyTouchId = null, joyStartX = 0, joyStartY = 0, joyDx = 0, joyDy = 0;
let shootTouchActive = false;
let isMobile = false;

let camera = { x: 0, y: 0 };

const $ = id => document.getElementById(id);
let canvas, ctx;

// ===================== CHARACTER PREVIEWS =====================
function renderCharacterPreviews() {
    document.querySelectorAll('.char-option').forEach(opt => {
        const idx = parseInt(opt.dataset.char);
        const c = opt.querySelector('canvas');
        const cx = c.getContext('2d');
        cx.imageSmoothingEnabled = false;
        cx.clearRect(0, 0, 64, 64);
        const img = charImages[idx];
        if (img && img.complete && img.naturalWidth) {
            cx.drawImage(img, 4, 4, 56, 56);
        }
    });
}

// ===================== LEADERBOARD =====================
function loadLeaderboard() {
    try { leaderboard = JSON.parse(localStorage.getItem('pb_leaderboard') || '{}'); } catch { leaderboard = {}; }
}
function saveLeaderboard() { localStorage.setItem('pb_leaderboard', JSON.stringify(leaderboard)); }
function addWin(name) { leaderboard[name] = (leaderboard[name] || 0) + 1; saveLeaderboard(); }

function showRoundEnd(winnerName) {
    roundOver = true;
    $('roundWinner').textContent = winnerName ? winnerName + ' WINS!' : 'DRAW!';
    $('roundEnd').classList.remove('hidden');
    const list = $('leaderboardList');
    list.innerHTML = '';
    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) { list.innerHTML = '<div class="lb-entry"><span class="name">No wins yet</span></div>'; }
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

const PEER_OPTS = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    }
};

// ===================== NETWORKING: HOST =====================
function createRoom() {
    if (connecting) return;
    const name = $('nameInput').value.trim();
    if (!name) { $('lobbyStatus').textContent = 'Enter a name!'; return; }
    myName = name;
    isHost = true;
    connecting = true;
    setLobbyButtonsDisabled(true);
    $('lobbyStatus').textContent = 'Creating room...';
    tryCreate(0);
}

function tryCreate(attempt) {
    if (attempt > 4) { failConnect('Could not create room. Try again.'); return; }
    const code = genCode();
    if (peer) { try { peer.destroy(); } catch {} peer = null; }
    peer = new Peer('pb-' + code, PEER_OPTS);

    peer.on('open', () => {
        myId = peer.id;
        hostId = myId;
        players = {};
        players[myId] = makePlayer(myId, myName, myChar);
        connecting = false;
        showWaiting(code);
        updatePlayerList();
        $('waitingStatus').textContent = 'Connected ✓  Waiting for players...';
    });
    peer.on('connection', conn => {
        conn.on('open', () => {
            if (gameActive) { try { conn.close(); } catch {} return; } // no join mid-game
            if (!connections.includes(conn)) connections.push(conn);
        });
        conn.on('data', data => handleHostReceive(data, conn));
        conn.on('close', () => removeConnection(conn));
        conn.on('error', () => removeConnection(conn));
    });
    peer.on('error', e => {
        if (e.type === 'unavailable-id') { tryCreate(attempt + 1); }
        else { failConnect('Error: ' + e.type); }
    });
}

function removeConnection(conn) {
    connections = connections.filter(c => c !== conn);
    const pid = conn.metadata && conn.metadata.pid;
    if (pid && players[pid]) {
        delete players[pid];
        updatePlayerList();
        broadcast({ type: 'playerList', hostId, players: serializePlayers() });
        if (gameActive) checkRoundEnd();
    }
}

// ===================== NETWORKING: CLIENT =====================
function joinRoom() {
    if (connecting) return;
    const name = $('nameInput').value.trim();
    const code = $('roomInput').value.trim().toUpperCase();
    if (!name) { $('lobbyStatus').textContent = 'Enter a name!'; return; }
    if (code.length < 4) { $('lobbyStatus').textContent = 'Enter the room code!'; return; }
    myName = name;
    isHost = false;
    joined = false;
    connecting = true;
    setLobbyButtonsDisabled(true);
    $('lobbyStatus').textContent = 'Connecting...';

    if (peer) { try { peer.destroy(); } catch {} peer = null; }
    peer = new Peer(PEER_OPTS);

    peer.on('open', () => {
        myId = peer.id;
        hostConn = peer.connect('pb-' + code, { reliable: true, metadata: { pid: myId } });

        joinTimeout = setTimeout(() => {
            if (!joined) failConnect('Room "' + code + '" not found. Check the code.');
        }, 9000);

        hostConn.on('open', () => {
            $('lobbyStatus').textContent = 'Joining game...';
            hostConn.send({ type: 'join', id: myId, name: myName, char: myChar });
        });
        hostConn.on('data', data => handleClientReceive(data, code));
        hostConn.on('close', () => {
            if (gameActive) { alert('Host disconnected.'); location.reload(); }
            else if (!joined) failConnect('Connection closed.');
        });
        hostConn.on('error', () => { if (!joined) failConnect('Could not reach that room.'); });
    });
    peer.on('error', e => {
        if (e.type === 'peer-unavailable') { if (!joined) failConnect('Room not found. Check the code.'); }
        else if (!joined) failConnect('Error: ' + e.type);
    });
}

function failConnect(msg) {
    connecting = false;
    joined = false;
    if (joinTimeout) { clearTimeout(joinTimeout); joinTimeout = null; }
    if (peer) { try { peer.destroy(); } catch {} peer = null; }
    hostConn = null;
    connections = [];
    setLobbyButtonsDisabled(false);
    $('lobbyStatus').textContent = msg;
}

function setLobbyButtonsDisabled(d) {
    $('createBtn').disabled = d;
    $('joinBtn').disabled = d;
}

function broadcast(msg) { connections.forEach(c => { try { c.send(msg); } catch {} }); }

function handleHostReceive(data, conn) {
    if (data.type === 'join') {
        if (gameActive) return;
        conn.metadata = conn.metadata || {};
        conn.metadata.pid = data.id;
        // prevent clones: keyed by id, so re-join just refreshes
        players[data.id] = players[data.id] || makePlayer(data.id, data.name, data.char);
        players[data.id].name = data.name;
        players[data.id].charIndex = data.char;
        updatePlayerList();
        broadcast({ type: 'playerList', hostId, players: serializePlayers() });
        conn.send({ type: 'playerList', hostId, players: serializePlayers() });
    }
    if (data.type === 'input' && players[data.id]) {
        const p = players[data.id];
        p.x = data.x; p.y = data.y; p.angle = data.angle;
    }
    if (data.type === 'shoot' && players[data.id]) {
        const p = players[data.id];
        if (p.alive && gameActive) createBullet(data.id, p.x, p.y, data.angle);
    }
}

function handleClientReceive(data, code) {
    if (data.type === 'playerList') {
        if (!joined) {
            joined = true;
            connecting = false;
            if (joinTimeout) { clearTimeout(joinTimeout); joinTimeout = null; }
            showWaiting(code);
            $('waitingStatus').textContent = 'Connected ✓';
        }
        hostId = data.hostId || hostId;
        const incoming = data.players;
        for (const [id, info] of Object.entries(incoming)) {
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            else { players[id].name = info.name; players[id].charIndex = info.char; }
        }
        // drop players no longer present (someone left)
        for (const id of Object.keys(players)) {
            if (!incoming[id]) delete players[id];
        }
        if (!gameActive) updatePlayerList();
    }
    if (data.type === 'gameStart' || data.type === 'newRound') {
        currentMapIdx = data.mapIndex;
        roundNum = data.roundNum;
        hostId = data.hostId || hostId;
        for (const [id, info] of Object.entries(data.players)) {
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            players[id].x = info.x; players[id].y = info.y;
            players[id].lives = MAX_LIVES; players[id].alive = true;
            players[id].invincibleUntil = 0;
            players[id].charIndex = info.char; players[id].name = info.name;
        }
        for (const id of Object.keys(players)) { if (!data.players[id]) delete players[id]; }
        bullets = [];
        $('roundEnd').classList.add('hidden');
        beginGame();
    }
    if (data.type === 'state') {
        for (const [id, info] of Object.entries(data.players)) {
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            if (id === myId) {
                players[id].lives = info.lives;
                players[id].alive = info.alive;
                players[id].invincibleUntil = info.invincibleUntil;
            } else {
                Object.assign(players[id], info);
            }
        }
        for (const id of Object.keys(players)) { if (!data.players[id]) delete players[id]; }
        bullets = data.bullets || [];
    }
    if (data.type === 'roundEnd') {
        gameActive = false;
        if (data.winnerName) addWin(data.winnerName);
        showRoundEnd(data.winnerName);
    }
}

function serializePlayers() {
    const out = {};
    for (const [id, p] of Object.entries(players)) {
        out[id] = { name: p.name, char: p.charIndex, x: p.x, y: p.y,
                    lives: p.lives, alive: p.alive, angle: p.angle, invincibleUntil: p.invincibleUntil };
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
    if (isHost) { $('startGameBtn').classList.remove('hidden'); }
    else { $('startGameBtn').classList.add('hidden'); }
}

function updatePlayerList() {
    const list = $('playerList');
    list.innerHTML = '';
    for (const p of Object.values(players)) {
        const div = document.createElement('div');
        div.className = 'player-tag' + (p.id === hostId ? ' host' : '');
        div.textContent = p.name + (p.id === myId ? ' (you)' : '') + (p.id === hostId ? ' 👑' : '');
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
    $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') createRoom(); });
    $('roomInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
}

// ===================== GAME START =====================
function hostStartGame() {
    if (!isHost || gameActive) return;
    currentMapIdx = Math.floor(Math.random() * MAPS.length);
    roundNum = 1;
    assignSpawns();
    broadcast({ type: 'gameStart', mapIndex: currentMapIdx, roundNum, hostId, players: serializePlayers() });
    beginGame();
}

function hostNextRound() {
    if (!isHost) return;
    let next;
    do { next = Math.floor(Math.random() * MAPS.length); } while (next === currentMapIdx && MAPS.length > 1);
    currentMapIdx = next;
    roundNum++;
    for (const p of Object.values(players)) { p.lives = MAX_LIVES; p.alive = true; p.invincibleUntil = 0; }
    assignSpawns();
    bullets = [];
    broadcast({ type: 'newRound', mapIndex: currentMapIdx, roundNum, hostId, players: serializePlayers() });
    $('roundEnd').classList.add('hidden');
    beginGame();
}

// ----- spawn safety (no spawning inside walls) -----
function isClear(x, y) {
    if (x < PLAYER_RADIUS || y < PLAYER_RADIUS || x > MAP_W - PLAYER_RADIUS || y > MAP_H - PLAYER_RADIUS) return false;
    for (const w of MAPS[currentMapIdx].walls) {
        if (rectContains(w, x, y, PLAYER_RADIUS + 6)) return false;
    }
    return true;
}

function findClearSpawn(x, y) {
    if (isClear(x, y)) return { x, y };
    for (let r = 24; r <= 500; r += 24) {
        for (let a = 0; a < 360; a += 24) {
            const nx = x + Math.cos(a * Math.PI / 180) * r;
            const ny = y + Math.sin(a * Math.PI / 180) * r;
            const c = clampToMap(nx, ny, PLAYER_RADIUS);
            if (isClear(c.x, c.y)) return c;
        }
    }
    return clampToMap(x, y, PLAYER_RADIUS);
}

function assignSpawns() {
    const spawns = [...MAPS[currentMapIdx].spawns];
    for (let i = spawns.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [spawns[i], spawns[j]] = [spawns[j], spawns[i]];
    }
    let si = 0;
    const used = [];
    for (const p of Object.values(players)) {
        let base = spawns[si % spawns.length];
        let pos = findClearSpawn(base.x, base.y);
        // also avoid stacking on another freshly-placed player
        let tries = 0;
        while (tries < 20 && used.some(u => Math.hypot(u.x - pos.x, u.y - pos.y) < PLAYER_RADIUS * 2.2)) {
            const ang = Math.random() * Math.PI * 2;
            pos = findClearSpawn(base.x + Math.cos(ang) * 60, base.y + Math.sin(ang) * 60);
            tries++;
        }
        p.x = pos.x; p.y = pos.y;
        used.push({ x: pos.x, y: pos.y });
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
    // snap camera to me immediately
    const me = players[myId];
    if (me) { camera.x = me.x - canvas.width / 2; camera.y = me.y - canvas.height / 2; }
    setupInputEvents();
}

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
    window.addEventListener('blur', () => { keys = {}; mouseDown = false; });
    window.addEventListener('resize', () => { if (canvas) resizeCanvas(); });

    window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    window.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
    window.addEventListener('contextmenu', e => { if (gameActive) e.preventDefault(); });

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
                    let dx = t.clientX - joyStartX, dy = t.clientY - joyStartY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
                    joyDx = dx / maxR; joyDy = dy / maxR;
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

    const sb = $('shootBtn');
    if (sb) {
        sb.addEventListener('touchstart', e => { e.preventDefault(); shootTouchActive = true; }, { passive: false });
        sb.addEventListener('touchend', e => { e.preventDefault(); shootTouchActive = false; }, { passive: false });
        sb.addEventListener('touchcancel', () => { shootTouchActive = false; });
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
    const me = players[myId];
    if (!me) return facingAngle;
    return Math.atan2(mouseY - (me.y - camera.y), mouseX - (me.x - camera.x));
}

function wantsShoot() { return mouseDown || shootTouchActive; }

// ===================== BULLETS =====================
function createBullet(ownerId, x, y, angle) {
    const sx = x + Math.cos(angle) * (PLAYER_RADIUS + 6);
    const sy = y + Math.sin(angle) * (PLAYER_RADIUS + 6);
    bullets.push({
        id: bulletIdCounter++, ownerId, x: sx, y: sy,
        vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED,
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
    for (const w of walls) { if (rectContains(w, rx, oy, r)) { rx = ox; break; } }
    for (const w of walls) { if (rectContains(w, rx, ry, r)) { ry = oy; break; } }
    return { x: rx, y: ry };
}
function circlesOverlap(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

// ===================== UPDATE =====================
function update(dt) {
    const me = players[myId];
    if (!me) { return; }

    if (me.alive) {
        const mov = getMovement();
        if (mov.dx !== 0 || mov.dy !== 0) facingAngle = Math.atan2(mov.dy, mov.dx);
        const nx = me.x + mov.dx * PLAYER_SPEED * dt;
        const ny = me.y + mov.dy * PLAYER_SPEED * dt;
        const resolved = resolveWalls(me.x, me.y, nx, ny, PLAYER_RADIUS);
        const clamped = clampToMap(resolved.x, resolved.y, PLAYER_RADIUS);
        me.x = clamped.x; me.y = clamped.y;

        me.angle = isMobile ? facingAngle : getAimAngle();

        const now = Date.now();
        if (wantsShoot() && now - me.lastShot > SHOOT_COOLDOWN) {
            me.lastShot = now;
            const shootAngle = me.angle;
            if (isHost) createBullet(myId, me.x, me.y, shootAngle);
            else if (hostConn) hostConn.send({ type: 'shoot', id: myId, angle: shootAngle });
        }

        if (!isHost && hostConn) {
            const t = Date.now();
            if (t - lastNetUpdate > STATE_RATE) {
                hostConn.send({ type: 'input', id: myId, x: me.x, y: me.y, angle: me.angle });
                lastNetUpdate = t;
            }
        }
    }

    if (isHost) {
        updateBullets(dt);
        checkCollisions();
        const t = Date.now();
        if (t - lastNetUpdate > STATE_RATE) {
            broadcast({ type: 'state', players: serializePlayers(),
                bullets: bullets.map(b => ({ x: b.x, y: b.y, ownerId: b.ownerId })) });
            lastNetUpdate = t;
        }
        checkRoundEnd();
    }

    updateCamera();
}

function updateBullets(dt) {
    const walls = MAPS[currentMapIdx].walls;
    bullets = bullets.filter(b => {
        b.x += b.vx * dt; b.y += b.vy * dt;
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
                if (p.lives <= 0) p.alive = false;
                else p.invincibleUntil = now + INVINCIBLE_TIME;
                return false;
            }
        }
        return true;
    });
}

function checkRoundEnd() {
    if (!gameActive || roundOver) return;
    const all = Object.values(players);
    if (all.length <= 1) return;
    const alive = all.filter(p => p.alive);
    if (alive.length <= 1) {
        gameActive = false;
        roundOver = true;
        const winner = alive[0];
        const winnerName = winner ? winner.name : null;
        if (winnerName) addWin(winnerName);
        showRoundEnd(winnerName);
        broadcast({ type: 'roundEnd', winnerId: winner && winner.id, winnerName });
    }
}

// ===================== CAMERA =====================
function updateCamera() {
    if (!canvas) return;
    const me = players[myId];
    let target = me;
    if (me && !me.alive) {
        const alive = Object.values(players).filter(p => p.alive);
        if (alive.length) target = alive[0];
    }
    if (!target) return;
    const tx = target.x - canvas.width / 2;
    const ty = target.y - canvas.height / 2;
    camera.x += (tx - camera.x) * 0.12;
    camera.y += (ty - camera.y) * 0.12;
    camera.x = Math.max(0, Math.min(Math.max(0, MAP_W - canvas.width), camera.x));
    camera.y = Math.max(0, Math.min(Math.max(0, MAP_H - canvas.height), camera.y));
}

// ===================== RENDER =====================
function render() {
    if (!ctx || !canvas) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const map = MAPS[currentMapIdx];

    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    ctx.fillStyle = map.bg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gs = 80;
    for (let x = 0; x <= MAP_W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
    for (let y = 0; y <= MAP_H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_W, MAP_H);

    for (const w of map.walls) {
        ctx.fillStyle = map.wall;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = map.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // Bullets (image)
    for (const b of bullets) {
        if (bulletImg && bulletImg.complete && bulletImg.naturalWidth) {
            ctx.drawImage(bulletImg, b.x - BULLET_DRAW / 2, b.y - BULLET_DRAW / 2, BULLET_DRAW, BULLET_DRAW);
        } else {
            ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700'; ctx.fill();
        }
    }

    // Players
    const now = Date.now();
    for (const p of Object.values(players)) {
        if (!p.alive) continue;
        const invincible = now < p.invincibleUntil;
        if (invincible && Math.floor(now / 90) % 2 === 0) continue;

        const img = charImages[p.charIndex];
        if (img && img.complete && img.naturalWidth) {
            ctx.drawImage(img, Math.round(p.x - DRAW_SIZE / 2), Math.round(p.y - DRAW_SIZE / 2), DRAW_SIZE, DRAW_SIZE);
        } else {
            ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#888'; ctx.fill();
        }

        if (p.id === myId) {
            const ax = p.x + Math.cos(p.angle) * (DRAW_SIZE / 2 + 6);
            const ay = p.y + Math.sin(p.angle) * (DRAW_SIZE / 2 + 6);
            ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
        }

        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = invincible ? '#ff6666' : '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
        ctx.strokeText(p.name, p.x, p.y - DRAW_SIZE / 2 - 12);
        ctx.fillText(p.name, p.x, p.y - DRAW_SIZE / 2 - 12);

        const dotY = p.y - DRAW_SIZE / 2 - 4;
        let dotX = p.x - (MAX_LIVES * 10) / 2 + 5;
        for (let i = 0; i < MAX_LIVES; i++) {
            ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
            ctx.fillStyle = i < p.lives ? '#e94560' : 'rgba(255,255,255,0.15)';
            ctx.fill(); dotX += 10;
        }
    }

    ctx.restore();

    // HUD
    const me = players[myId];
    if (me) {
        let hearts = '';
        for (let i = 0; i < MAX_LIVES; i++) hearts += i < me.lives ? '❤️ ' : '🖤 ';
        $('livesDisplay').textContent = hearts;
        $('roundDisplay').textContent = 'ROUND ' + roundNum + ' • ' + map.name.toUpperCase();
    }

    if (mapAnnounce && now - mapAnnounce < 2500) {
        const alpha = Math.min(1, (2500 - (now - mapAnnounce)) / 800);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#e94560';
        ctx.fillText(map.name.toUpperCase(), canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '20px monospace'; ctx.fillStyle = '#aaa';
        ctx.fillText('ROUND ' + roundNum, canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
    }

    if (me && !me.alive && gameActive) {
        ctx.save();
        ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(233,69,96,0.85)';
        ctx.fillText('ELIMINATED', canvas.width / 2, 80);
        ctx.font = '16px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Spectating...', canvas.width / 2, 110);
        ctx.restore();
    }

    if (gameActive) {
        const aliveCount = Object.values(players).filter(p => p.alive).length;
        const totalCount = Object.values(players).length;
        ctx.font = '14px monospace'; ctx.textAlign = 'right';
        ctx.fillStyle = '#888';
        ctx.fillText(aliveCount + '/' + totalCount + ' alive', canvas.width - 16, canvas.height - 16);
    }
}

// ===================== GAME LOOP =====================
let lastTime = performance.now();
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    if (gameActive) { update(dt); render(); }
    requestAnimationFrame(gameLoop);
}

// Fallback tick: browsers pause requestAnimationFrame on hidden/background tabs.
// Without this, a host who switches tabs would freeze the match for everyone.
// Throttled by the browser to ~1Hz while hidden, but keeps the simulation alive.
setInterval(() => {
    if (!document.hidden) return;
    if (!gameActive) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    render();
}, 1000 / 30);

// ===================== INIT =====================
function init() {
    loadLeaderboard();
    setupLobbyEvents();
    loadImages(() => { renderCharacterPreviews(); });
    requestAnimationFrame(gameLoop);
}

init();

})();
