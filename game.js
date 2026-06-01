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

// ===== Boss fight (Chef Big Back) =====
const KITCHEN_PUZZLE_TIME = 60000;   // 60s to hit all 4 buttons once the first is on
const ARENA_W = 2000, ARENA_H = 1500;
const ISLAND_CX = 1000, ISLAND_CY = 980, ISLAND_RX = 640, ISLAND_RY = 430; // floating island ellipse
const KITCHEN_TOP_Y = 230;           // boss patrol line in the sky-kitchen
const KITCHEN_X1 = 360, KITCHEN_X2 = 1640;
const HITS_PER_PHASE = 10;           // pie-hits to clear phases 1-3
const PHASE4_HITS = 25;              // bullet-hits to clear the secret phase
const PHASE4_HITS_PER_DIZZY = 5;     // hits that register per dizzy window
const PIE_REFLECT_SHOTS = 4;         // bullets to reflect a pie back at the boss
const BOSS_PROJ_TTL = 9000;          // ms before a boss projectile self-destructs (prevents pile-up)
const BOSS_NAME_KITCHEN = "Chef Big Back's kitchen";
const BOSS_NAME_FINAL = "Chef Big Back";

const CHAR_NAMES = ['Greenie', 'Shadow', 'Goldie', 'Blue', 'Red'];

// ===================== IMAGES =====================
const charImages = [];
let bulletImg = null;
const bossImg = {}; // phase1..4, pizza, pie, banana, cheese

function loadImg(src) { const i = new Image(); i.src = src; return i; }

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

    // boss assets load in the background (not gated on cb). ?v bust = pick up real art over cached placeholders.
    const v = '?v=5';
    bossImg.phase1 = loadImg('chefphase1.png' + v);
    bossImg.phase2 = loadImg('chefphase2.png' + v);
    bossImg.phase3 = loadImg('realchefphase3.png' + v);
    bossImg.phase4 = loadImg('chefphase4.png' + v);
    bossImg.pizza  = loadImg('pizzaattack.png' + v);
    bossImg.pie    = loadImg('pieattack.png' + v);
    bossImg.banana = loadImg('banana.png' + v);
    bossImg.cheese = loadImg('cheeseattack.png' + v);
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
  // KITCHEN — special map (not in the vote pool, only appears via the 1/15 roll).
  // Has 4 shootable buttons; turning all 4 on opens the boss fight.
  { name:'Kitchen', bg:'#26201a', wall:'#7a6a55', border:'#524534', kitchen:true, walls:[
    {x:150,y:150,w:500,h:60},{x:1350,y:150,w:500,h:60},
    {x:150,y:1290,w:500,h:60},{x:1350,y:1290,w:500,h:60},
    {x:150,y:150,w:60,h:300},{x:1790,y:150,w:60,h:300},
    {x:150,y:1050,w:60,h:300},{x:1790,y:1050,w:60,h:300},
    {x:600,y:650,w:300,h:60},{x:1100,y:650,w:300,h:60},
    {x:600,y:790,w:300,h:60},{x:1100,y:790,w:300,h:60},
    {x:930,y:450,w:140,h:80},{x:930,y:970,w:140,h:80}],
    // candidate button positions (4 chosen at random each time)
    buttonSpots:[{x:300,y:350},{x:1700,y:350},{x:300,y:1150},{x:1700,y:1150},
                 {x:1000,y:250},{x:1000,y:1250},{x:400,y:750},{x:1600,y:750}],
    spawns:[{x:1000,y:750},{x:300,y:750},{x:1700,y:750},{x:1000,y:300},
            {x:1000,y:1200},{x:500,y:400},{x:1500,y:400},{x:1000,y:900}]},
];
const KITCHEN_MAP = MAPS.findIndex(m => m.kitchen);
const KITCHEN_CHANCE = 15; // 1-in-N chance a round becomes the Kitchen instead of the voted map

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

// ===== mode + kitchen puzzle + boss fight state =====
let mode = 'ffa';            // 'ffa' | 'boss' | 'cutscene'
let camScale = 1;

// kitchen button puzzle (only on the Kitchen map)
let kbuttons = [];           // {x,y,on}
let kPuzzleStart = 0;        // when first button pressed (0 = not started)
let kPuzzleCount = 0;

// boss fight
let boss = null;             // {x,y,phase,dir,img,...} on host; mirrored on clients
let bossHits = 0;            // pie hits this phase (1-3) or bullet hits (phase 4)
let bossDizzyHits = 0;       // hits registered in current dizzy window
let pizzas = [], pies = [], bananas = [], cheeses = [], fireTrails = [], warnings = [];
let bossText = '';           // text near the boss name area
let centerText = '';         // big center announcement
let centerTextUntil = 0;
let bossTimers = {};         // host attack cooldown timestamps
let targetCycle = 0;         // round-robin attack targeting
let bossOutcome = '';        // '' | 'win' | 'lose' during cutscene
let cutsceneUntil = 0;
let cutsceneLine = '';

// connection guards
let connecting = false;
let joined = false;
let joinTimeout = null;

// room/session mode chosen by host in the waiting room: 'ffa' or 'boss'
let roomMode = 'ffa';

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
        conn.send({ type: 'playerList', hostId, players: serializePlayers(), roomMode });
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
        if (data.roomMode) { roomMode = data.roomMode; updateModeUI(); }
    }
    if (data.type === 'roomMode') {
        roomMode = data.roomMode;
        updateModeUI();
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
        mode = 'ffa';
        boss = null;
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
        kbuttons = data.kbuttons || []; kPuzzleStart = 0; kPuzzleCount = 0;
        $('roundEnd').classList.add('hidden');
        beginGame();
    }
    if (data.type === 'bossStart') {
        mode = 'boss';
        beginGame();
        applyBossState(data);
    }
    if (data.type === 'bossState') {
        applyBossState(data);
    }
    if (data.type === 'bossEnd') {
        bossOutcome = data.outcome;
        cutsceneLine = data.line || '';
        showBossOutcome(data.outcome, data.line, data.winnerName);
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
        if (data.kbuttons) { kbuttons = data.kbuttons; kPuzzleCount = data.kcount || 0; kPuzzleStart = data.kstart || 0; }
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
    updateModeUI();
}

// Host sees a clickable toggle; clients see a read-only label.
function updateModeUI() {
    const btn = $('modeToggleBtn'), label = $('modeLabel');
    const isBoss = roomMode === 'boss';
    const text = isBoss ? 'MODE: BOSS FIGHT 🍕' : 'MODE: FREE-FOR-ALL ⚔️';
    if (isHost) {
        btn.classList.remove('hidden'); label.classList.add('hidden');
        btn.textContent = text;
        btn.classList.toggle('boss', isBoss);
        $('startGameBtn').textContent = isBoss ? 'START BOSS FIGHT' : 'START GAME';
    } else {
        btn.classList.add('hidden'); label.classList.remove('hidden');
        label.textContent = isBoss ? 'Mode: Boss Fight 🍕 (all vs Chef Big Back)' : 'Mode: Free-for-All ⚔️';
    }
}

function toggleRoomMode() {
    if (!isHost) return;
    roomMode = roomMode === 'ffa' ? 'boss' : 'ffa';
    updateModeUI();
    broadcast({ type: 'roomMode', roomMode });
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
    $('modeToggleBtn').addEventListener('click', toggleRoomMode);
    $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') createRoom(); });
    $('roomInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
}

// ===================== GAME START =====================
// "Start" respects the room mode: FFA opens a map vote, Boss jumps straight into the fight.
function hostStartGame() {
    if (!isHost || gameActive) return;
    if (roomMode === 'boss') hostStartBossMode();
    else hostStartVote();
}
function hostNextRound() { hostStartVote(); }

// Start the co-op boss fight directly from the waiting room (no map vote / kitchen puzzle).
function hostStartBossMode() {
    if (!isHost || gameActive) return;
    mode = 'ffa';
    roundNum++;
    beginGame();        // show the game screen + set up canvas
    startBossFight();   // init boss, teleport everyone onto the island, broadcast bossStart
}

// ----- map voting (host drives it) -----
function pickCandidates(n) {
    const pool = [];
    for (let i = 0; i < MAPS.length; i++) {
        if (MAPS[i].kitchen) continue;                 // Kitchen never appears in the vote
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
    mode = 'ffa';
    // 1-in-KITCHEN_CHANCE: the round secretly becomes the Kitchen instead of the voted map
    if (KITCHEN_MAP >= 0 && Math.floor(Math.random() * KITCHEN_CHANCE) === 0) {
        mapIndex = KITCHEN_MAP;
    }
    currentMapIdx = mapIndex;
    roundNum++;
    for (const p of Object.values(players)) { p.lives = MAX_LIVES; p.alive = true; p.invincibleUntil = 0; p.lastStormDamage = 0; }
    assignSpawns();
    bullets = [];
    // set up the kitchen button puzzle if this is the Kitchen
    kbuttons = []; kPuzzleStart = 0; kPuzzleCount = 0;
    if (MAPS[currentMapIdx].kitchen) setupKitchenButtons();
    broadcast({ type: 'gameStart', mapIndex: currentMapIdx, roundNum, hostId,
                players: serializePlayers(), kbuttons });
    $('roundEnd').classList.add('hidden');
    beginGame();
}

function setupKitchenButtons() {
    const spots = [...MAPS[KITCHEN_MAP].buttonSpots];
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    kbuttons = spots.slice(0, 4).map(s => ({ x: s.x, y: s.y, on: false }));
    kPuzzleStart = 0; kPuzzleCount = 0;
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
    const sp = worldToScreen(me.x, me.y);
    return Math.atan2(mouseY - sp.y, mouseX - sp.x);
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
    const now = Date.now();

    if (me.alive && !bossOutcome) {
        const mov = getMovement();
        if (mov.dx !== 0 || mov.dy !== 0) facingAngle = Math.atan2(mov.dy, mov.dx);
        const nx = me.x + mov.dx * PLAYER_SPEED * dt;
        const ny = me.y + mov.dy * PLAYER_SPEED * dt;
        if (mode === 'boss') {
            me.x = nx; me.y = ny;                 // free movement; falling off island handled by host
            if (!isHost) keepRoughlyOnIsland(me); // soft local clamp for feel
        } else {
            const resolved = resolveWalls(me.x, me.y, nx, ny, PLAYER_RADIUS);
            const clamped = clampToMap(resolved.x, resolved.y, PLAYER_RADIUS);
            me.x = clamped.x; me.y = clamped.y;
        }
        me.angle = isMobile ? facingAngle : getAimAngle();

        if (wantsShoot() && now - me.lastShot > SHOOT_COOLDOWN) {
            me.lastShot = now;
            const shootAngle = me.angle;
            if (isHost) createBullet(myId, me.x, me.y, shootAngle);
            else if (hostConn) hostConn.send({ type: 'shoot', id: myId, angle: shootAngle });
        }
        if (!isHost && hostConn && now - lastNetUpdate > STATE_RATE) {
            hostConn.send({ type: 'input', id: myId, x: me.x, y: me.y, angle: me.angle });
            lastNetUpdate = now;
        }
    }

    if (isHost) {
        updateBullets(dt);
        if (mode === 'ffa') {
            stormElapsed = now - roundStartTime;
            if (MAPS[currentMapIdx].kitchen) {
                updateKitchenPuzzle(now);          // may switch mode to 'boss'
            } else {
                if (!wallsBroken && stormElapsed >= WALLS_BREAK_TIME) { wallsBroken = true; wallsBreakAnnounce = now; }
                stormRadius = computeStormRadius(stormElapsed);
                applyStormDamage(now);
            }
            if (mode === 'ffa') {
                checkCollisions();
                if (now - lastNetUpdate > STATE_RATE) {
                    const msg = { type: 'state', players: serializePlayers(),
                        bullets: bullets.map(b => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId })),
                        stormR: stormRadius, walls: wallsBroken, el: stormElapsed };
                    if (MAPS[currentMapIdx].kitchen) { msg.kbuttons = kbuttons; msg.kcount = kPuzzleCount; msg.kstart = kPuzzleStart; }
                    broadcast(msg);
                    lastNetUpdate = now;
                }
                checkRoundEnd();
            }
        } else if (mode === 'boss') {
            updateBoss(dt, now);
            checkBossCollisions(now);
            if (now - lastNetUpdate > STATE_RATE) { broadcast(serializeBossState()); lastNetUpdate = now; }
            checkBossEnd();
        }
    } else {
        // client: advance projectiles locally between state updates for smooth motion
        for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
        if (mode === 'boss') advanceBossProjectilesLocal(dt);
    }

    updateCamera();
}

function updateBullets(dt) {
    const now = Date.now();
    const inBoss = mode === 'boss';
    const walls = (!inBoss && currentMapIdx >= 0) ? MAPS[currentMapIdx].walls : [];
    bullets = bullets.filter(b => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (now - b.born > BULLET_TTL) return false;           // self-destruct so bullets never pile up
        if (b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) return false;
        if (!inBoss && !wallsBroken) {                         // no walls in the boss arena
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
    if (!gameActive || roundOver || mode !== 'ffa') return;
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

// ===================== KITCHEN PUZZLE (host) =====================
function updateKitchenPuzzle(now) {
    // bullets turn red buttons green
    bullets = bullets.filter(b => {
        for (const btn of kbuttons) {
            if (!btn.on && circlesOverlap(b.x, b.y, BULLET_RADIUS, btn.x, btn.y, 28)) {
                btn.on = true;
                kPuzzleCount++;
                if (kPuzzleCount === 1) kPuzzleStart = now;
                return false;
            }
        }
        return true;
    });
    // puzzle fails if the timer runs out -> reset the buttons
    if (kPuzzleStart && kPuzzleCount < 4 && now - kPuzzleStart > KITCHEN_PUZZLE_TIME) {
        for (const btn of kbuttons) btn.on = false;
        kPuzzleStart = 0; kPuzzleCount = 0;
    }
    if (kPuzzleCount >= 4) startBossFight();
}

// ===================== BOSS FIGHT (host authoritative) =====================
function pointInIsland(x, y) {
    const dx = (x - ISLAND_CX) / ISLAND_RX, dy = (y - ISLAND_CY) / ISLAND_RY;
    return dx * dx + dy * dy <= 1;
}
function clampToIsland(x, y, margin) {
    const rx = ISLAND_RX - (margin || 0), ry = ISLAND_RY - (margin || 0);
    const dx = (x - ISLAND_CX) / rx, dy = (y - ISLAND_CY) / ry;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 1) return { x, y, clamped: false };
    return { x: ISLAND_CX + (dx / d) * rx, y: ISLAND_CY + (dy / d) * ry, clamped: true };
}
function keepRoughlyOnIsland(p) {
    const c = clampToIsland(p.x, p.y, PLAYER_RADIUS);
    if (c.clamped) { p.x = c.x; p.y = c.y; }
}
function randomAlive() {
    const a = Object.values(players).filter(p => p.alive);
    return a.length ? a[Math.floor(Math.random() * a.length)] : null;
}
function setCenterText(t, ms) { centerText = t; centerTextUntil = Date.now() + ms; }

function startBossFight() {
    mode = 'boss';
    boss = { x: (KITCHEN_X1 + KITCHEN_X2) / 2, y: KITCHEN_TOP_Y, phase: 1, dir: 1,
             rollState: '', rollsLeft: 0, rollUntil: 0, dizzyUntil: 0, lastTrail: 0 };
    bossHits = 0; bossDizzyHits = 0;
    pizzas = []; pies = []; bananas = []; cheeses = []; fireTrails = []; warnings = [];
    bossTimers = { pizzaPie: Date.now(), banana: Date.now(), cheese: Date.now() };
    bossOutcome = ''; cutsceneUntil = 0; cutsceneLine = '';
    bossText = 'Shoot the pies to deal damage';
    setCenterText('You think you can challenge me???', 3500);
    teleportPlayersToIsland();
    broadcast(serializeBossState('bossStart'));
}

function teleportPlayersToIsland() {
    const list = Object.values(players);
    const n = Math.max(1, list.length);
    list.forEach((p, i) => {
        const ang = (i / n) * Math.PI * 2;
        p.x = ISLAND_CX + Math.cos(ang) * (ISLAND_RX * 0.45);
        p.y = ISLAND_CY + Math.sin(ang) * (ISLAND_RY * 0.45);
        p.lives = MAX_LIVES; p.alive = true; p.invincibleUntil = Date.now() + 2000;
    });
}

function speedMul() { return boss.phase === 1 ? 1 : boss.phase === 2 ? 1.3 : 1.6; }

function spawnPizza() {
    const t = randomAlive(); if (!t) return;
    const ang = Math.atan2(t.y - boss.y, t.x - boss.x);
    const sp = 150 * speedMul();
    pizzas.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, speed: sp, targetId: t.id, born: Date.now() });
}
function spawnPie() {
    const t = randomAlive(); if (!t) return;
    const ang = Math.atan2(t.y - boss.y, t.x - boss.x);
    const sp = 130 * speedMul();
    pies.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, speed: sp, targetId: t.id, hits: 0, returning: false, born: Date.now() });
}
function spawnBanana() {
    const t = randomAlive(); if (!t) return;
    const ang = Math.atan2(t.y - boss.y, t.x - boss.x);
    const sp = 240 * speedMul();
    bananas.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, speed: sp, returning: false, born: Date.now() });
}
function spawnCheese() {
    // 3 warning lines aimed at 3 random players, fire after 0.8s
    const alive = Object.values(players).filter(p => p.alive);
    for (let k = 0; k < 3; k++) {
        const t = alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
        const ang = t ? Math.atan2(t.y - boss.y, t.x - boss.x) : Math.random() * Math.PI * 2;
        warnings.push({ x: boss.x, y: boss.y, angle: ang, fireAt: Date.now() + 800, fired: false });
    }
}

function homeToward(proj, tx, ty, turnRate, dt) {
    const desired = Math.atan2(ty - proj.y, tx - proj.x);
    let cur = Math.atan2(proj.vy, proj.vx);
    let diff = ((desired - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const step = turnRate * dt;
    cur += Math.max(-step, Math.min(step, diff));
    proj.vx = Math.cos(cur) * proj.speed;
    proj.vy = Math.sin(cur) * proj.speed;
}
function damagePlayer(p, now) {
    if (!p.alive || now < p.invincibleUntil) return;
    p.lives--; if (p.lives <= 0) p.alive = false; else p.invincibleUntil = now + INVINCIBLE_TIME;
}
function offArena(x, y) { return x < -100 || x > ARENA_W + 100 || y < -100 || y > ARENA_H + 100; }

function advanceBoss(dt, now) {
    // patrol the kitchen in phases 1-3
    if (boss.phase <= 3) {
        boss.x += boss.dir * 170 * dt;
        if (boss.x < KITCHEN_X1) { boss.x = KITCHEN_X1; boss.dir = 1; }
        if (boss.x > KITCHEN_X2) { boss.x = KITCHEN_X2; boss.dir = -1; }
        boss.y = KITCHEN_TOP_Y;
        // attacks
        if (now - bossTimers.pizzaPie > 5000) {
            bossTimers.pizzaPie = now;
            spawnPizza(); spawnPizza(); spawnPizza(); spawnPie();
        }
        if (boss.phase >= 2 && now - bossTimers.banana > 4500) { bossTimers.banana = now; spawnBanana(); }
        if (boss.phase >= 3 && now - bossTimers.cheese > 10000) { bossTimers.cheese = now; spawnCheese(); }
    } else {
        // phase 4: rolling
        if (boss.rollState === 'dizzy') {
            if (now >= boss.dizzyUntil) { boss.rollState = 'rolling'; boss.rollsLeft = 3; startRoll(now); }
        } else if (boss.rollState === 'off') {
            boss.y += 600 * dt; // roll off the island during the win cutscene
        } else {
            boss.x += boss.vx * dt; boss.y += boss.vy * dt;
            if (now - boss.lastTrail > 70) { boss.lastTrail = now; fireTrails.push({ x: boss.x, y: boss.y, until: now + 2000 }); }
            const c = clampToIsland(boss.x, boss.y, 44);
            if (c.clamped || now >= boss.rollUntil) {
                boss.x = c.x; boss.y = c.y;
                boss.rollsLeft--;
                if (boss.rollsLeft <= 0) { boss.rollState = 'dizzy'; boss.dizzyUntil = now + 3000; bossDizzyHits = 0; }
                else startRoll(now);
            }
        }
    }
}
function startRoll(now) {
    const t = randomAlive();
    const ang = t ? Math.atan2(t.y - boss.y, t.x - boss.x) : Math.random() * Math.PI * 2;
    boss.vx = Math.cos(ang) * 340; boss.vy = Math.sin(ang) * 340;
    boss.rollUntil = now + 1100;
}

function updateBoss(dt, now) {
    if (bossOutcome) { advanceBoss(dt, now); return; }
    advanceBoss(dt, now);

    // pizzas (home slowly, hit players)
    pizzas = pizzas.filter(a => {
        if (now - a.born > BOSS_PROJ_TTL) return false;
        const t = players[a.targetId] && players[a.targetId].alive ? players[a.targetId] : randomAlive();
        if (t) homeToward(a, t.x, t.y, 1.4, dt);
        a.x += a.vx * dt; a.y += a.vy * dt;
        for (const p of Object.values(players)) if (circlesOverlap(a.x, a.y, 12, p.x, p.y, PLAYER_RADIUS)) { damagePlayer(p, now); return false; }
        return !offArena(a.x, a.y);
    });
    // pies (home; reflectable; damage boss on return)
    pies = pies.filter(a => {
        if (!a.returning && now - a.born > BOSS_PROJ_TTL) return false; // returning pies always fly home
        if (a.returning) {
            homeToward(a, boss.x, boss.y, 2.2, dt);
            a.x += a.vx * dt; a.y += a.vy * dt;
            if (circlesOverlap(a.x, a.y, 14, boss.x, boss.y, 40)) { hitBossWithPie(now); return false; }
        } else {
            const t = players[a.targetId] && players[a.targetId].alive ? players[a.targetId] : randomAlive();
            if (t) homeToward(a, t.x, t.y, 1.3, dt);
            a.x += a.vx * dt; a.y += a.vy * dt;
            for (const p of Object.values(players)) if (circlesOverlap(a.x, a.y, 13, p.x, p.y, PLAYER_RADIUS)) { damagePlayer(p, now); return false; }
        }
        return !offArena(a.x, a.y);
    });
    // bananas (boomerang)
    bananas = bananas.filter(a => {
        if (now - a.born > BOSS_PROJ_TTL) return false;
        if (!a.returning) {
            a.x += a.vx * dt; a.y += a.vy * dt;
            if (Math.hypot(a.x - boss.x, a.y - boss.y) > 900 || offArena(a.x, a.y)) {
                a.returning = true;
                const ang = Math.atan2(boss.y - a.y, boss.x - a.x);
                a.vx = Math.cos(ang) * a.speed; a.vy = Math.sin(ang) * a.speed;
            }
        } else {
            homeToward(a, boss.x, boss.y, 3, dt);
            a.x += a.vx * dt; a.y += a.vy * dt;
            if (circlesOverlap(a.x, a.y, 16, boss.x, boss.y, 40)) return false; // returns, no self-damage
        }
        for (const p of Object.values(players)) if (circlesOverlap(a.x, a.y, 15, p.x, p.y, PLAYER_RADIUS)) { damagePlayer(p, now); return false; }
        return !offArena(a.x, a.y);
    });
    // warnings -> fire cheese beams
    warnings = warnings.filter(w => {
        if (!w.fired && now >= w.fireAt) {
            w.fired = true;
            const sp = 620;
            cheeses.push({ x: boss.x, y: boss.y, vx: Math.cos(w.angle) * sp, vy: Math.sin(w.angle) * sp, lastTrail: 0 });
            return false;
        }
        return !w.fired;
    });
    // cheese beams (leave fire trail)
    cheeses = cheeses.filter(a => {
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (now - a.lastTrail > 50) { a.lastTrail = now; fireTrails.push({ x: a.x, y: a.y, until: now + 2000 }); }
        for (const p of Object.values(players)) if (circlesOverlap(a.x, a.y, 16, p.x, p.y, PLAYER_RADIUS)) damagePlayer(p, now);
        return !offArena(a.x, a.y);
    });
    // fire trails (damage + expire)
    fireTrails = fireTrails.filter(f => {
        if (now > f.until) return false;
        for (const p of Object.values(players)) if (circlesOverlap(f.x, f.y, 22, p.x, p.y, PLAYER_RADIUS)) damagePlayer(p, now);
        return true;
    });
    // phase-4 roll contact
    if (boss.phase === 4 && boss.rollState === 'rolling') {
        for (const p of Object.values(players)) if (circlesOverlap(boss.x, boss.y, 40, p.x, p.y, PLAYER_RADIUS)) damagePlayer(p, now);
    }
    // players falling off the island
    for (const p of Object.values(players)) {
        if (!p.alive) continue;
        if (!pointInIsland(p.x, p.y) && now > (p.invincibleUntil || 0)) {
            p.x = ISLAND_CX; p.y = ISLAND_CY;
            p.lives--; if (p.lives <= 0) p.alive = false; else p.invincibleUntil = now + INVINCIBLE_TIME;
        }
    }
}

function hitBossWithPie(now) {
    bossHits++;
    if (bossHits >= HITS_PER_PHASE) {
        bossHits = 0;
        if (boss.phase === 1) { boss.phase = 2; }
        else if (boss.phase === 2) { boss.phase = 3; }
        else if (boss.phase === 3) { enterPhase4(now); }
    }
}

function enterPhase4(now) {
    boss.phase = 4;
    boss.x = ISLAND_CX; boss.y = ISLAND_CY;
    boss.rollState = 'rolling'; boss.rollsLeft = 3;
    bossHits = 0; bossDizzyHits = 0;
    bossText = '';
    pizzas = []; pies = []; bananas = []; cheeses = []; warnings = [];
    setCenterText("didn't think it'd come down to this", 5000);
    startRoll(now);
}

function checkBossCollisions(now) {
    if (bossOutcome) return;
    bullets = bullets.filter(b => {
        // reflect pies
        for (const pie of pies) {
            if (!pie.returning && circlesOverlap(b.x, b.y, BULLET_RADIUS, pie.x, pie.y, 15)) {
                pie.hits = (pie.hits || 0) + 1;
                if (pie.hits >= PIE_REFLECT_SHOTS) { pie.returning = true; pie.targetId = null; }
                return false;
            }
        }
        // shoot boss while dizzy (phase 4)
        if (boss && boss.phase === 4 && boss.rollState === 'dizzy' && bossDizzyHits < PHASE4_HITS_PER_DIZZY
            && circlesOverlap(b.x, b.y, BULLET_RADIUS, boss.x, boss.y, 44)) {
            bossDizzyHits++; bossHits++;
            if (bossHits >= PHASE4_HITS) bossWin(now);
            return false;
        }
        return true;
    });
}

function bossWin(now) {
    if (bossOutcome) return;
    bossOutcome = 'win';
    const alive = Object.values(players).filter(p => p.alive);
    const champ = alive.length ? alive[Math.floor(Math.random() * alive.length)] : Object.values(players)[0];
    const champName = champ ? champ.name : 'Player';
    if (champName) addWin(champName);
    boss.rollState = 'off';
    const line = champName + ': Yay! we won :)';
    broadcast({ type: 'bossEnd', outcome: 'win', line, winnerName: champName });
    showBossOutcome('win', line, champName);
}

function checkBossEnd() {
    if (bossOutcome) return;
    if (Object.values(players).filter(p => p.alive).length === 0) {
        bossOutcome = 'lose';
        const line = 'Chef Big Back: I knew you couldn\'t defeat me :)';
        broadcast({ type: 'bossEnd', outcome: 'lose', line });
        showBossOutcome('lose', line);
    }
}

// shared payload for bossStart / bossState
function serializeBossState(type) {
    return {
        type: type || 'bossState',
        players: serializePlayers(),
        bullets: bullets.map(b => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId })),
        boss: boss ? { x: boss.x, y: boss.y, phase: boss.phase, rollState: boss.rollState } : null,
        hits: bossHits,
        pizzas: pizzas.map(a => ({ x: a.x, y: a.y, vx: a.vx, vy: a.vy })),
        pies: pies.map(a => ({ x: a.x, y: a.y, vx: a.vx, vy: a.vy, hits: a.hits, returning: a.returning })),
        bananas: bananas.map(a => ({ x: a.x, y: a.y, vx: a.vx, vy: a.vy, returning: a.returning })),
        cheeses: cheeses.map(a => ({ x: a.x, y: a.y, vx: a.vx, vy: a.vy })),
        fires: fireTrails.map(f => ({ x: f.x, y: f.y })),
        warnings: warnings.map(w => ({ x: w.x, y: w.y, angle: w.angle })),
        bText: bossText,
        cText: centerText,
        cRemain: Math.max(0, centerTextUntil - Date.now()),
    };
}

function advanceBossProjectilesLocal(dt) {
    for (const a of pizzas) { a.x += a.vx * dt; a.y += a.vy * dt; }
    for (const a of pies) { a.x += a.vx * dt; a.y += a.vy * dt; }
    for (const a of bananas) { a.x += a.vx * dt; a.y += a.vy * dt; }
    for (const a of cheeses) { a.x += a.vx * dt; a.y += a.vy * dt; }
}

function applyBossState(data) {
    mode = 'boss';
    if (data.players) {
        for (const [id, info] of Object.entries(data.players)) {
            if (!players[id]) players[id] = makePlayer(id, info.name, info.char);
            if (id === myId) {
                players[id].lives = info.lives; players[id].alive = info.alive; players[id].invincibleUntil = info.invincibleUntil;
            } else { Object.assign(players[id], info); }
        }
        for (const id of Object.keys(players)) if (!data.players[id]) delete players[id];
    }
    if (data.bullets) {
        const ids = new Set(data.bullets.map(b => b.id));
        for (const b of data.bullets) {
            const ex = bullets.find(o => o.id === b.id);
            if (ex) { ex.x = b.x; ex.y = b.y; ex.vx = b.vx; ex.vy = b.vy; }
            else bullets.push({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId });
        }
        bullets = bullets.filter(b => ids.has(b.id));
    }
    boss = data.boss; bossHits = data.hits || 0;
    pizzas = data.pizzas || []; pies = data.pies || []; bananas = data.bananas || [];
    cheeses = data.cheeses || []; fireTrails = data.fires || []; warnings = data.warnings || [];
    bossText = data.bText || '';
    if (data.cText && data.cRemain > 0) { centerText = data.cText; centerTextUntil = Date.now() + data.cRemain; }
}

function showBossOutcome(outcome, line, winnerName) {
    // keep mode === 'boss' so the host keeps animating the boss rolling off the island;
    // bossOutcome freezes player movement and drives the end-screen text.
    cutsceneLine = line || '';
    bossOutcome = outcome;
    setCenterText(outcome === 'win' ? 'VICTORY!' : 'DEFEAT', 5200);
    if (outcome === 'win' && winnerName && !isHost) addWin(winnerName);
    setTimeout(returnToMenu, 5200);
}

function returnToMenu() {
    mode = 'ffa'; gameActive = false; roundOver = false; boss = null;
    pizzas = []; pies = []; bananas = []; cheeses = []; fireTrails = []; warnings = [];
    bossOutcome = ''; centerText = '';
    kbuttons = []; kPuzzleStart = 0; kPuzzleCount = 0;
    $('gameScreen').classList.add('hidden');
    $('roundEnd').classList.add('hidden');
    $('voteScreen').classList.add('hidden');
    $('waitingRoom').classList.remove('hidden');
    $('waitingStatus').textContent = isHost ? 'Press Start for another game!' : 'Waiting for host...';
    updateModeUI();
}

// ===================== CAMERA =====================
function updateCamera() {
    if (!canvas) return;
    if (mode === 'boss' || mode === 'cutscene') {
        // fixed view that fits the whole arena on screen
        camScale = Math.min(canvas.width / ARENA_W, canvas.height / ARENA_H);
        camera.x = -(canvas.width - ARENA_W * camScale) / (2 * camScale);
        camera.y = -(canvas.height - ARENA_H * camScale) / (2 * camScale);
        return;
    }
    camScale = 1;
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

// world -> screen helper (respects camScale)
function worldToScreen(wx, wy) { return { x: (wx - camera.x) * camScale, y: (wy - camera.y) * camScale }; }

// ===================== RENDER =====================
function render() {
    if (!ctx || !canvas) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === 'boss' || mode === 'cutscene') { renderBoss(); return; }
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

    // Kitchen buttons (red until shot, then green)
    if (map.kitchen) {
        for (const btn of kbuttons) {
            ctx.fillStyle = btn.on ? '#39d353' : '#e23b3b';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(btn.x, btn.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(btn.x - 6, btn.y - 6, 5, 0, Math.PI * 2); ctx.fill();
        }
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

    // Kitchen puzzle HUD
    if (map.kitchen) {
        ctx.save();
        ctx.textAlign = 'center';
        if (kPuzzleStart && kPuzzleCount < 4) {
            const left = Math.max(0, Math.ceil((KITCHEN_PUZZLE_TIME - (Date.now() - kPuzzleStart)) / 1000));
            ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#ffcc00';
            ctx.fillText('TURN ON THE OTHER BUTTONS ' + kPuzzleCount + '/4', canvas.width / 2, 50);
            ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#e94560';
            ctx.fillText(left + 's', canvas.width / 2, 76);
        } else if (kPuzzleCount < 4) {
            ctx.font = '16px monospace'; ctx.fillStyle = '#ffcc00';
            ctx.fillText('Shoot the 4 red buttons...', canvas.width / 2, 50);
        }
        ctx.restore();
    }
}

// ===================== BOSS RENDER =====================
function renderBoss() {
    const now = Date.now();
    // sky background
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#243a6b'); g.addColorStop(1, '#0d1530');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camScale, camScale);
    ctx.translate(-camera.x, -camera.y);

    // floating island
    ctx.fillStyle = '#5a7a3a';
    ctx.beginPath(); ctx.ellipse(ISLAND_CX, ISLAND_CY, ISLAND_RX, ISLAND_RY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6e9447';
    ctx.beginPath(); ctx.ellipse(ISLAND_CX, ISLAND_CY - 14, ISLAND_RX - 14, ISLAND_RY - 26, 0, 0, Math.PI * 2); ctx.fill();
    // dirt underside
    ctx.fillStyle = '#4a3520';
    ctx.beginPath(); ctx.moveTo(ISLAND_CX - ISLAND_RX + 40, ISLAND_CY + ISLAND_RY - 40);
    ctx.lineTo(ISLAND_CX, ISLAND_CY + ISLAND_RY + 160);
    ctx.lineTo(ISLAND_CX + ISLAND_RX - 40, ISLAND_CY + ISLAND_RY - 40); ctx.closePath(); ctx.fill();

    // kitchen platform at top
    ctx.fillStyle = '#3a2f26'; ctx.fillRect(KITCHEN_X1 - 60, 90, (KITCHEN_X2 - KITCHEN_X1) + 120, 200);
    ctx.fillStyle = '#524434'; ctx.fillRect(KITCHEN_X1 - 60, 90, (KITCHEN_X2 - KITCHEN_X1) + 120, 26);
    ctx.fillStyle = '#1d1812'; ctx.fillRect(KITCHEN_X1 - 60, 270, (KITCHEN_X2 - KITCHEN_X1) + 120, 20);

    // fire trails
    for (const f of fireTrails) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ff6a1a';
        ctx.beginPath(); ctx.arc(f.x, f.y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffd23a';
        ctx.beginPath(); ctx.arc(f.x, f.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    // cheese warning lines (flashing yellow)
    for (const w of warnings) {
        if (Math.floor(now / 100) % 2 === 0) continue;
        ctx.strokeStyle = 'rgba(255,230,60,0.9)'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x + Math.cos(w.angle) * 2400, w.y + Math.sin(w.angle) * 2400); ctx.stroke();
    }

    const drawImgAt = (img, x, y, size) => {
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    };

    // player bullets
    for (const b of bullets) {
        if (bulletImg && bulletImg.complete && bulletImg.naturalWidth) {
            ctx.drawImage(bulletImg, b.x - BULLET_DRAW / 2, b.y - BULLET_DRAW / 2, BULLET_DRAW, BULLET_DRAW);
        } else {
            ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700'; ctx.fill();
        }
    }

    // attacks
    for (const a of cheeses) drawImgAt(bossImg.cheese, a.x, a.y, 40);
    for (const a of pizzas) drawImgAt(bossImg.pizza, a.x, a.y, 36);
    for (const a of bananas) drawImgAt(bossImg.banana, a.x, a.y, 40);
    for (const a of pies) {
        drawImgAt(bossImg.pie, a.x, a.y, 34);
        if (!a.returning) {  // show reflect progress
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
            ctx.fillText((a.hits || 0) + '/' + PIE_REFLECT_SHOTS, a.x, a.y - 22);
        } else {
            ctx.fillStyle = '#53d769'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
            ctx.fillText('↩', a.x, a.y - 20);
        }
    }

    // boss
    if (boss) {
        const img = boss.phase === 1 ? bossImg.phase1 : boss.phase === 2 ? bossImg.phase2
                  : boss.phase === 3 ? bossImg.phase3 : bossImg.phase4;
        const size = 130;
        if (boss.phase === 4 && boss.rollState === 'rolling') {
            ctx.save(); ctx.translate(boss.x, boss.y); ctx.rotate(now / 90); drawImgAt(img, 0, 0, size); ctx.restore();
        } else {
            drawImgAt(img, boss.x, boss.y, size);
            if (boss.phase === 4 && boss.rollState === 'dizzy') {
                ctx.fillStyle = '#ffe23a'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
                ctx.fillText('★ ★ ★', boss.x, boss.y - size / 2 - 8);
            }
        }
    }

    // players
    for (const p of Object.values(players)) {
        if (!p.alive) continue;
        const inv = now < p.invincibleUntil;
        if (inv && Math.floor(now / 90) % 2 === 0) continue;
        const cimg = charImages[p.charIndex];
        if (cimg && cimg.complete && cimg.naturalWidth) ctx.drawImage(cimg, p.x - DRAW_SIZE / 2, p.y - DRAW_SIZE / 2, DRAW_SIZE, DRAW_SIZE);
        ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
        ctx.strokeText(p.name, p.x, p.y - DRAW_SIZE / 2 - 6); ctx.fillText(p.name, p.x, p.y - DRAW_SIZE / 2 - 6);
    }

    ctx.restore();

    // ---- boss HUD (screen space) ----
    drawBossHealthBar();

    // local lives
    const me = players[myId];
    if (me) {
        let hearts = '';
        for (let i = 0; i < MAX_LIVES; i++) hearts += i < me.lives ? '❤️ ' : '🖤 ';
        $('livesDisplay').textContent = hearts;
        $('roundDisplay').textContent = 'CHEF BIG BACK';
    }

    if (bossText) {
        ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#ffd23a';
        ctx.fillText(bossText, canvas.width / 2, 120);
        ctx.restore();
    }

    if (me && !me.alive && mode === 'boss') {
        ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 28px monospace';
        ctx.fillStyle = 'rgba(233,69,96,0.85)'; ctx.fillText('DOWNED — Spectating', canvas.width / 2, canvas.height - 60);
        ctx.restore();
    }

    // center announcement
    if (centerText && now < centerTextUntil) {
        ctx.save(); ctx.textAlign = 'center';
        ctx.font = 'bold 40px monospace';
        ctx.fillStyle = bossOutcome ? (bossOutcome === 'win' ? '#53d769' : '#e94560') : '#fff';
        ctx.fillText(centerText, canvas.width / 2, canvas.height / 2 - 10);
        if (bossOutcome && cutsceneLine) {
            ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#fff';
            ctx.fillText(cutsceneLine, canvas.width / 2, canvas.height / 2 + 36);
        }
        ctx.restore();
    }
}

function drawBossHealthBar() {
    const bw = Math.min(canvas.width - 80, 760), bh = 26;
    const bx = (canvas.width - bw) / 2, by = 16;
    const phase = boss ? boss.phase : 1;
    // name
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#fff';
    ctx.fillText(phase >= 4 ? BOSS_NAME_FINAL : BOSS_NAME_KITCHEN, canvas.width / 2, by - 2 + bh + 22);
    // bar background
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = '#3a0d14'; ctx.fillRect(bx, by, bw, bh);
    // fill
    let frac;
    if (phase <= 3) {
        const completed = phase - 1;
        const seg = bossHits / HITS_PER_PHASE;
        frac = (3 - completed - seg) / 3;
    } else {
        frac = 1 - bossHits / PHASE4_HITS;
    }
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = phase >= 4 ? '#b026ff' : '#e23b3b';
    ctx.fillRect(bx, by, bw * frac, bh);
    // segment dividers (phases 1-3 only -> divided in 3)
    if (phase <= 3) {
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        for (let i = 1; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(bx + bw * i / 3, by); ctx.lineTo(bx + bw * i / 3, by + bh); ctx.stroke();
        }
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();
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
