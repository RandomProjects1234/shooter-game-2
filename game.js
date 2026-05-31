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
const BULLET_TTL = 3500;          // ms before a bullet self-destructs (prevents buildup/lag)

// Walls break (all cover destroyed) one minute into a round
const WALLS_BREAK_TIME = 60000;

// Closing storm (battle-royale style shrinking safe zone)
const STORM_CX = MAP_W / 2, STORM_CY = MAP_H / 2;
const STORM_START_DELAY = 8000;     // grace period before it starts closing
const STORM_SHRINK_DURATION = 70000; // time to shrink from full to minimum
const STORM_START_R = 1300;         // covers the whole map at the start
const STORM_MIN_R = 150;            // final tiny safe zone
const STORM_DAMAGE_INTERVAL = 2500; // lose 1 life per this many ms outside the zone

// Pre-round map voting
const VOTE_DURATION = 12000;   // ms players have to vote
const VOTE_CANDIDATES = 3;     // number of maps offered each vote

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
  { name:'Maze', bg:'#241e2d', wall:'#5d4a78', border:'#3d2f55', walls:[
    {x:200,y:300,w:400,h:24},{x:800,y:300,w:400,h:24},{x:1400,y:300,w:400,h:24},
    {x:200,y:600,w:300,h:24},{x:700,y:600,w:500,h:24},{x:1400,y:600,w:400,h:24},
    {x:300,y:900,w:400,h:24},{x:900,y:900,w:500,h:24},{x:1500,y:900,w:300,h:24},
    {x:200,y:1200,w:500,h:24},{x:900,y:1200,w:400,h:24},{x:1450,y:1200,w:350,h:24},
    {x:600,y:300,w:24,h:300},{x:1200,y:324,w:24,h:280},{x:900,y:600,w:24,h:300},
    {x:400,y:900,w:24,h:300},{x:1400,y:624,w:24,h:280}],
    spawns:[{x:100,y:150},{x:1900,y:150},{x:100,y:1380},{x:1900,y:1380},
            {x:1000,y:120},{x:1000,y:1400},{x:120,y:750},{x:1880,y:750}]},
  { name:'Crossfire', bg:'#2d2417', wall:'#9a7b3f', border:'#6b552c', walls:[
    {x:950,y:400,w:100,h:700},{x:650,y:700,w:700,h:100},
    {x:200,y:200,w:260,h:24},{x:200,y:200,w:24,h:260},
    {x:1540,y:200,w:260,h:24},{x:1776,y:200,w:24,h:260},
    {x:200,y:1276,w:24,h:224},{x:200,y:1276,w:260,h:24},
    {x:1776,y:1276,w:24,h:224},{x:1540,y:1276,w:260,h:24},
    {x:500,y:560,w:70,h:70},{x:1430,y:560,w:70,h:70},
    {x:500,y:870,w:70,h:70},{x:1430,y:870,w:70,h:70}],
    spawns:[{x:120,y:120},{x:1880,y:120},{x:120,y:1380},{x:1880,y:1380},
            {x:1000,y:120},{x:1000,y:1380},{x:120,y:750},{x:1880,y:750}]},
  { name:'Pillars', bg:'#16242d', wall:'#3f7a86', border:'#2c545c', walls:[
    {x:350,y:300,w:60,h:60},{x:700,y:300,w:60,h:60},{x:1050,y:300,w:60,h:60},{x:1400,y:300,w:60,h:60},{x:1700,y:300,w:60,h:60},
    {x:500,y:550,w:60,h:60},{x:850,y:550,w:60,h:60},{x:1200,y:550,w:60,h:60},{x:1550,y:550,w:60,h:60},
    {x:350,y:800,w:60,h:60},{x:700,y:800,w:60,h:60},{x:1050,y:800,w:60,h:60},{x:1400,y:800,w:60,h:60},{x:1700,y:800,w:60,h:60},
    {x:500,y:1050,w:60,h:60},{x:850,y:1050,w:60,h:60},{x:1200,y:1050,w:60,h:60},{x:1550,y:1050,w:60,h:60},
    {x:350,y:1250,w:60,h:60},{x:1050,y:1250,w:60,h:60},{x:1700,y:1250,w:60,h:60}],
    spawns:[{x:120,y:120},{x:1880,y:120},{x:120,y:1380},{x:1880,y:1380},
            {x:1000,y:120},{x:1000,y:1400},{x:120,y:750},{x:1880,y:750}]},
  { name:'Fortress', bg:'#2d1717', wall:'#9a4f3f', border:'#6b372c', walls:[
    {x:700,y:500,w:250,h:24},{x:1050,y:500,w:250,h:24},
    {x:700,y:976,w:250,h:24},{x:1050,y:976,w:250,h:24},
    {x:700,y:500,w:24,h:200},{x:700,y:800,w:24,h:200},
    {x:1276,y:500,w:24,h:200},{x:1276,y:800,w:24,h:200},
    {x:950,y:700,w:100,h:100},
    {x:300,y:300,w:140,h:30},{x:1560,y:300,w:140,h:30},
    {x:300,y:1170,w:140,h:30},{x:1560,y:1170,w:140,h:30},
    {x:300,y:720,w:30,h:120},{x:1670,y:720,w:30,h:120}],
    spawns:[{x:120,y:120},{x:1880,y:120},{x:120,y:1380},{x:1880,y:1380},
            {x:1000,y:130},{x:1000,y:1370},{x:130,y:750},{x:1870,y:750}]},
  { name:'Lanes', bg:'#17252d', wall:'#3f6b86', border:'#2c4a5c', walls:[
    {x:0,y:380,w:720,h:24},{x:920,y:380,w:1080,h:24},
    {x:0,y:760,w:1080,h:24},{x:1280,y:760,w:720,h:24},
    {x:0,y:1140,w:720,h:24},{x:920,y:1140,w:1080,h:24},
    {x:500,y:120,w:24,h:200},{x:1400,y:500,w:24,h:200},
    {x:600,y:850,w:24,h:200},{x:1450,y:1180,w:24,h:200},
    {x:1000,y:500,w:24,h:200},{x:300,y:850,w:24,h:200}],
    spawns:[{x:120,y:180},{x:1880,y:180},{x:120,y:1360},{x:1880,y:1360},
            {x:1000,y:560},{x:200,y:560},{x:1800,y:950},{x:1000,y:950}]},
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

// round-event state (walls + storm)
let roundStartTime = 0;
let wallsBroken = false;
let wallsBreakAnnounce = 0;
let stormRadius = STORM_START_R;
let stormElapsed = 0;

// connection guards
let connecting = false;
let joined = false;
let joinTimeout = null;

// map voting
let voting = false;
let voteCandidates = [];
let votes = {};                // playerId -> mapIndex
let myVote = null;
let voteResolved = false;
let voteTimer = null;
let voteCountdownInterval = null;

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
            if (gameActive || voting) { try { conn.close(); } catch {} return; } // no join mid-game/vote
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
    if (data.type === 'vote' && voting) {
        votes[data.id] = data.mapIndex;
        const counts = computeVoteCounts();
        broadcast({ type: 'voteUpdate', counts });
        updateVoteCounts(counts);
        if (Object.keys(votes).length >= Object.keys(players).length) hostFinishVote();
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
    if (data.type === 'voteStart') {
        voting = true;
        hostId = data.hostId || hostId;
        if (data.players) {
            for (const [id, info] of Object.entries(data.players)) {
                if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
                else { players[id].name = info.name; players[id].charIndex = info.char; }
            }
            for (const id of Object.keys(players)) { if (!data.players[id]) delete players[id]; }
        }
        voteCandidates = data.candidates || [];
        votes = {}; myVote = null; voteResolved = false;
        showVoteScreen(data.duration || VOTE_DURATION);
    }
    if (data.type === 'voteUpdate') {
        updateVoteCounts(data.counts || {});
    }
    if (data.type === 'gameStart' || data.type === 'newRound') {
        voting = false;
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
        // merge bullets by id so local extrapolation stays smooth instead of snapping
        const incoming = data.bullets || [];
        const ids = new Set(incoming.map(b => b.id));
        for (const b of incoming) {
            const ex = bullets.find(o => o.id === b.id);
            if (ex) { ex.x = b.x; ex.y = b.y; ex.vx = b.vx; ex.vy = b.vy; }
            else bullets.push({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId });
        }
        bullets = bullets.filter(b => ids.has(b.id));
        if (typeof data.stormR === 'number') stormRadius = data.stormR;
        if (data.walls && !wallsBroken) wallsBreakAnnounce = Date.now();
        wallsBroken = !!data.walls;
        if (typeof data.el === 'number') stormElapsed = data.el;
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
             angle: 0, lastShot: 0, invincibleUntil: 0, lastStormDamage: 0 };
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
// Both "Start" (from waiting room) and "Next Round" (from leaderboard) now open a map vote.
function hostStartGame() { hostStartVote(); }
function hostNextRound() { hostStartVote(); }

// ----- map voting (host drives it) -----
function pickCandidates(n) {
    const pool = [];
    for (let i = 0; i < MAPS.length; i++) {
        if (roundNum === 0 || i !== currentMapIdx) pool.push(i); // don't re-offer the map just played
    }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, Math.min(n, pool.length));
}

function hostStartVote() {
    if (!isHost || gameActive) return;
    voting = true;
    voteResolved = false;
    votes = {};
    myVote = null;
    voteCandidates = pickCandidates(VOTE_CANDIDATES);
    broadcast({ type: 'voteStart', candidates: voteCandidates, duration: VOTE_DURATION,
                hostId, players: serializePlayers() });
    showVoteScreen(VOTE_DURATION);
    clearTimeout(voteTimer);
    voteTimer = setTimeout(hostFinishVote, VOTE_DURATION);
}

function computeVoteCounts() {
    const c = {};
    for (const m of voteCandidates) c[m] = 0;
    for (const v of Object.values(votes)) if (v in c) c[v]++;
    return c;
}

function hostFinishVote() {
    if (!isHost || voteResolved) return;
    voteResolved = true;
    clearTimeout(voteTimer);
    const counts = computeVoteCounts();
    let max = -1, winners = [];
    for (const m of voteCandidates) {
        if (counts[m] > max) { max = counts[m]; winners = [m]; }
        else if (counts[m] === max) winners.push(m);
    }
    const winner = winners.length ? winners[Math.floor(Math.random() * winners.length)]
                                  : Math.floor(Math.random() * MAPS.length);
    hostBeginRound(winner);
}

function hostBeginRound(mapIndex) {
    voting = false;
    currentMapIdx = mapIndex;
    roundNum++;
    for (const p of Object.values(players)) { p.lives = MAX_LIVES; p.alive = true; p.invincibleUntil = 0; p.lastStormDamage = 0; }
    assignSpawns();
    bullets = [];
    broadcast({ type: 'gameStart', mapIndex: currentMapIdx, roundNum, hostId, players: serializePlayers() });
    $('roundEnd').classList.add('hidden');
    beginGame();
}

// cast a vote (host records locally, clients send to host); re-clicking changes your vote
function castVote(mapIndex) {
    if (!voting || !voteCandidates.includes(mapIndex)) return;
    myVote = mapIndex;
    highlightMyVote();
    if (isHost) {
        votes[myId] = mapIndex;
        const counts = computeVoteCounts();
        broadcast({ type: 'voteUpdate', counts });
        updateVoteCounts(counts);
        if (Object.keys(votes).length >= Object.keys(players).length) hostFinishVote();
    } else if (hostConn) {
        hostConn.send({ type: 'vote', id: myId, mapIndex });
    }
}

// ----- map vote UI -----
function renderMapPreview(canvas, idx) {
    const m = MAPS[idx];
    const cx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const sx = cw / MAP_W, sy = ch / MAP_H;
    cx.fillStyle = m.bg; cx.fillRect(0, 0, cw, ch);
    cx.fillStyle = m.wall;
    for (const w of m.walls) cx.fillRect(w.x * sx, w.y * sy, Math.max(1, w.w * sx), Math.max(1, w.h * sy));
    cx.strokeStyle = '#e94560'; cx.lineWidth = 2; cx.strokeRect(0, 0, cw, ch);
}

function showVoteScreen(duration) {
    $('lobby').classList.add('hidden');
    $('waitingRoom').classList.add('hidden');
    $('roundEnd').classList.add('hidden');
    $('gameScreen').classList.add('hidden');
    $('voteScreen').classList.remove('hidden');

    const container = $('voteCandidates');
    container.innerHTML = '';
    for (const idx of voteCandidates) {
        const card = document.createElement('div');
        card.className = 'vote-card';
        card.dataset.map = idx;
        const cv = document.createElement('canvas');
        cv.width = 200; cv.height = 150;
        card.appendChild(cv);
        const nm = document.createElement('div');
        nm.className = 'vote-name';
        nm.textContent = MAPS[idx].name;
        card.appendChild(nm);
        const cnt = document.createElement('div');
        cnt.className = 'vote-count';
        cnt.textContent = '0 votes';
        card.appendChild(cnt);
        card.addEventListener('click', () => castVote(idx));
        container.appendChild(card);
        renderMapPreview(cv, idx);
    }
    updateVoteCounts(computeVoteCounts());
    highlightMyVote();

    clearInterval(voteCountdownInterval);
    const end = Date.now() + duration;
    const tick = () => {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        $('voteTimer').textContent = left + 's';
        if (left <= 0) clearInterval(voteCountdownInterval);
    };
    tick();
    voteCountdownInterval = setInterval(tick, 250);
}

function updateVoteCounts(counts) {
    document.querySelectorAll('#voteCandidates .vote-card').forEach(card => {
        const idx = parseInt(card.dataset.map);
        const n = (counts && counts[idx]) || 0;
        const el = card.querySelector('.vote-count');
        if (el) el.textContent = n + (n === 1 ? ' vote' : ' votes');
    });
}

function highlightMyVote() {
    document.querySelectorAll('#voteCandidates .vote-card').forEach(card => {
        card.classList.toggle('voted', parseInt(card.dataset.map) === myVote);
    });
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
    voting = false;
    clearInterval(voteCountdownInterval);
    $('waitingRoom').classList.add('hidden');
    $('lobby').classList.add('hidden');
    $('roundEnd').classList.add('hidden');
    $('voteScreen').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    gameActive = true;
    roundOver = false;
    mapAnnounce = Date.now();
    // reset round-event state
    roundStartTime = Date.now();
    wallsBroken = false;
    wallsBreakAnnounce = 0;
    stormRadius = STORM_START_R;
    stormElapsed = 0;
    for (const p of Object.values(players)) p.lastStormDamage = 0;
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
        born: Date.now(),
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
    if (wallsBroken) return { x: nx, y: ny };
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
        const now = Date.now();
        stormElapsed = now - roundStartTime;
        if (!wallsBroken && stormElapsed >= WALLS_BREAK_TIME) {
            wallsBroken = true;
            wallsBreakAnnounce = now;
        }
        stormRadius = computeStormRadius(stormElapsed);
        applyStormDamage(now);

        updateBullets(dt);
        checkCollisions();
        if (now - lastNetUpdate > STATE_RATE) {
            broadcast({ type: 'state', players: serializePlayers(),
                bullets: bullets.map(b => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId })),
                stormR: stormRadius, walls: wallsBroken, el: stormElapsed });
            lastNetUpdate = now;
        }
        checkRoundEnd();
    } else {
        // client: advance bullets locally between state updates for smooth motion (no stutter)
        for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    }

    updateCamera();
}

function updateBullets(dt) {
    const now = Date.now();
    const walls = MAPS[currentMapIdx].walls;
    bullets = bullets.filter(b => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (now - b.born > BULLET_TTL) return false;           // self-destruct so bullets never pile up
        if (b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) return false;
        if (!wallsBroken) {
            for (const w of walls) {
                if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) return false;
            }
        }
        return true;
    });
}

// ----- closing storm -----
function computeStormRadius(elapsed) {
    if (elapsed < STORM_START_DELAY) return STORM_START_R;
    const progress = Math.min(1, (elapsed - STORM_START_DELAY) / STORM_SHRINK_DURATION);
    return STORM_START_R + (STORM_MIN_R - STORM_START_R) * progress;
}

function applyStormDamage(now) {
    for (const p of Object.values(players)) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - STORM_CX, p.y - STORM_CY);
        if (d > stormRadius && now - (p.lastStormDamage || 0) > STORM_DAMAGE_INTERVAL) {
            p.lives--;
            p.lastStormDamage = now;
            if (p.lives <= 0) p.alive = false;
        }
    }
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

    if (!wallsBroken) {
        for (const w of map.walls) {
            ctx.fillStyle = map.wall;
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeStyle = map.border;
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, w.y, w.w, w.h);
        }
    } else if (wallsBreakAnnounce && Date.now() - wallsBreakAnnounce < 500) {
        // brief crumble flash where the walls used to be
        ctx.save();
        ctx.globalAlpha = 1 - (Date.now() - wallsBreakAnnounce) / 500;
        for (const w of map.walls) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(w.x, w.y, w.w, w.h);
        }
        ctx.restore();
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

    // Storm overlay (everything OUTSIDE the safe circle is the danger zone).
    // At round start the radius covers the whole map, so nothing shows yet.
    {
        const r = Math.max(0, stormRadius);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, MAP_W, MAP_H);
        ctx.arc(STORM_CX, STORM_CY, r, 0, Math.PI * 2, true); // reverse arc punches a hole
        ctx.fillStyle = 'rgba(150, 40, 210, 0.30)';
        ctx.fill('evenodd');
        ctx.beginPath();
        ctx.arc(STORM_CX, STORM_CY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(210, 130, 255, 0.9)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
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

    // Center-top status: walls countdown, then storm warning
    if (gameActive) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px monospace';
        if (!wallsBroken) {
            const left = Math.max(0, Math.ceil((WALLS_BREAK_TIME - stormElapsed) / 1000));
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('💥 Walls break in ' + left + 's', canvas.width / 2, 26);
        } else {
            ctx.fillStyle = '#d27aff';
            ctx.fillText('🌩 STORM CLOSING — get to the circle!', canvas.width / 2, 26);
        }
        ctx.restore();
    }

    // "WALLS DESTROYED" big announce
    if (wallsBreakAnnounce && now - wallsBreakAnnounce < 2000) {
        const a = Math.min(1, (2000 - (now - wallsBreakAnnounce)) / 700);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.font = 'bold 42px monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText('WALLS DESTROYED!', canvas.width / 2, canvas.height / 2 - 70);
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
