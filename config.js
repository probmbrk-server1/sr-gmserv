"use strict";

const batchedMessages = new Map();
const rooms = new Map();

const server_tick_rate = 14;
const matchmaking_timeout = 300000;
const player_idle_timeout = 60000;
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 800;
const playerspeed = 0.26;
const SHOOT_COOLDOWN = 100; 
const BULLET_DAMAGE = 5;
const game_start_time = 1000;
const game_win_rest_time = 10000;
const maxClients = 20;

const playerHitboxWidth = 60; 
const playerHitboxHeight = 120;

const validDirections = [-90, 0, 180, -180, 90, 45, 135, -135, -45];

const isValidDirection = (direction) => {
const numericDirection = parseFloat(direction);
return !isNaN(numericDirection) && validDirections.includes(numericDirection);
  };

const teleporters = [
  { x: 700, y: 0, width: 50, height: 50, destination: { x: -700, y: 0 } },// Example teleporter
  // Add more teleporters as needed
];

const matchmaking = {
  1: {
    1: 800
  }
}

function matchmakingsp(target) {
  // Convert the nested object into an array of values and sort them
  const values = Object.values(matchmaking[1]).sort((a, b) => a - b);
  
  let higherBound = values[values.length - 1]; // Start with the last value
  
  for (let i = 0; i < values.length; i++) {
    if (target < values[i]) {
      higherBound = values[i];
      break;
    }
  }

  return higherBound;
}

const gamemodeconfig = {
  1: {
    maxplayers: 1,
    respawns_allowed: 4,
    playerhealth: 77,
    zonespeed: 13.4,
    usezone: true,
    health_restore: true,
  //  health_autodamage: true,
  },
  2: {
    maxplayers: 2,
    respawns_allowed: 2,
    playerhealth: 150,
    zonespeed: 1.4,
    usezone: true,
    health_restore: true,
   //health_autodamage: true,
  },
};

const mapsconfig = {
  1: {
    walls: [{"x":-750,"y":800},{"x":700,"y":800},{"x":750,"y":800},{"x":-800,"y":750},{"x":-650,"y":750},{"x":-600,"y":750},{"x":-550,"y":750},{"x":-500,"y":750},{"x":-200,"y":750},{"x":400,"y":750},{"x":450,"y":750},{"x":500,"y":750},{"x":550,"y":750},{"x":600,"y":750},{"x":750,"y":750},{"x":-650,"y":700},{"x":-200,"y":700},{"x":-150,"y":700},{"x":600,"y":700},{"x":-650,"y":650},{"x":-150,"y":650},{"x":-100,"y":650},{"x":-50,"y":650},{"x":0,"y":650},{"x":50,"y":650},{"x":100,"y":650},{"x":150,"y":650},{"x":600,"y":650},{"x":-650,"y":600},{"x":650,"y":600},{"x":650,"y":550},{"x":-300,"y":450},{"x":-250,"y":450},{"x":-200,"y":450},{"x":-150,"y":450},{"x":150,"y":450},{"x":200,"y":450},{"x":250,"y":450},{"x":-550,"y":400},{"x":-250,"y":400},{"x":-200,"y":400},{"x":-150,"y":400},{"x":150,"y":400},{"x":200,"y":400},{"x":250,"y":400},{"x":-550,"y":350},{"x":200,"y":350},{"x":250,"y":350},{"x":-600,"y":300},{"x":-600,"y":250},{"x":100,"y":250},{"x":450,"y":250},{"x":-650,"y":200},{"x":-150,"y":200},{"x":100,"y":200},{"x":450,"y":200},{"x":-150,"y":150},{"x":100,"y":150},{"x":450,"y":150},{"x":500,"y":150},{"x":-450,"y":100},{"x":-150,"y":100},{"x":100,"y":100},{"x":450,"y":100},{"x":500,"y":100},{"x":-450,"y":50},{"x":-400,"y":50},{"x":-150,"y":50},{"x":100,"y":50},{"x":450,"y":50},{"x":500,"y":50},{"x":-500,"y":0},{"x":-450,"y":0},{"x":-150,"y":0},{"x":100,"y":0},{"x":400,"y":0},{"x":450,"y":0},{"x":500,"y":0},{"x":-500,"y":-50},{"x":500,"y":-50},{"x":-550,"y":-100},{"x":-500,"y":-100},{"x":500,"y":-100},{"x":550,"y":-100},{"x":-600,"y":-150},{"x":500,"y":-150},{"x":550,"y":-150},{"x":-600,"y":-200},{"x":-150,"y":-200},{"x":-100,"y":-200},{"x":-50,"y":-200},{"x":0,"y":-200},{"x":50,"y":-200},{"x":100,"y":-200},{"x":-400,"y":-400},{"x":250,"y":-400},{"x":600,"y":-400},{"x":-450,"y":-450},{"x":-400,"y":-450},{"x":-350,"y":-450},{"x":-100,"y":-450},{"x":200,"y":-450},{"x":250,"y":-450},{"x":550,"y":-450},{"x":600,"y":-450},{"x":-500,"y":-500},{"x":-450,"y":-500},{"x":-400,"y":-500},{"x":-150,"y":-500},{"x":-100,"y":-500},{"x":-50,"y":-500},{"x":200,"y":-500},{"x":250,"y":-500},{"x":550,"y":-500},{"x":600,"y":-500},{"x":-150,"y":-550},{"x":-100,"y":-550},{"x":-50,"y":-550},{"x":500,"y":-550},{"x":550,"y":-550},{"x":450,"y":-600},{"x":500,"y":-600},{"x":-750,"y":-650},{"x":-700,"y":-700},{"x":750,"y":-700},{"x":700,"y":-750},{"x":750,"y":-750}],
    width: 800,
    height: 800,
    spawns: [
      { x: 0, y: 0 },
      { x: 0, y: -700 },
      { x: 300, y: 300 },
      { x: 400, y: 400 },
      { x: 400, y: 450 },
    ]  
  },

  2: {
    walls: [{"x":-125,"y":775},{"x":125,"y":775},{"x":-125,"y":725},{"x":125,"y":725},{"x":-125,"y":675},{"x":125,"y":675},{"x":-625,"y":625},{"x":-575,"y":625},{"x":-525,"y":625},{"x":-475,"y":625},{"x":-125,"y":625},{"x":125,"y":625},{"x":475,"y":625},{"x":525,"y":625},{"x":575,"y":625},{"x":625,"y":625},{"x":-625,"y":575},{"x":-425,"y":575},{"x":-125,"y":575},{"x":125,"y":575},{"x":425,"y":575},{"x":625,"y":575},{"x":-625,"y":525},{"x":-375,"y":525},{"x":-125,"y":525},{"x":125,"y":525},{"x":375,"y":525},{"x":625,"y":525},{"x":-625,"y":475},{"x":-125,"y":475},{"x":125,"y":475},{"x":625,"y":475},{"x":-575,"y":425},{"x":-125,"y":425},{"x":125,"y":425},{"x":575,"y":425},{"x":-525,"y":375},{"x":-125,"y":375},{"x":125,"y":375},{"x":525,"y":375},{"x":-475,"y":325},{"x":-125,"y":325},{"x":125,"y":325},{"x":475,"y":325},{"x":-775,"y":125},{"x":-725,"y":125},{"x":-675,"y":125},{"x":-625,"y":125},{"x":-575,"y":125},{"x":-525,"y":125},{"x":-475,"y":125},{"x":-425,"y":125},{"x":-375,"y":125},{"x":-325,"y":125},{"x":325,"y":125},{"x":375,"y":125},{"x":425,"y":125},{"x":475,"y":125},{"x":525,"y":125},{"x":575,"y":125},{"x":625,"y":125},{"x":675,"y":125},{"x":725,"y":125},{"x":775,"y":125},{"x":-775,"y":-125},{"x":-725,"y":-125},{"x":-675,"y":-125},{"x":-625,"y":-125},{"x":-575,"y":-125},{"x":-525,"y":-125},{"x":-475,"y":-125},{"x":-425,"y":-125},{"x":-375,"y":-125},{"x":-325,"y":-125},{"x":325,"y":-125},{"x":375,"y":-125},{"x":425,"y":-125},{"x":475,"y":-125},{"x":525,"y":-125},{"x":575,"y":-125},{"x":625,"y":-125},{"x":675,"y":-125},{"x":725,"y":-125},{"x":775,"y":-125},{"x":-475,"y":-325},{"x":-125,"y":-325},{"x":125,"y":-325},{"x":475,"y":-325},{"x":-525,"y":-375},{"x":-125,"y":-375},{"x":125,"y":-375},{"x":525,"y":-375},{"x":-575,"y":-425},{"x":-125,"y":-425},{"x":125,"y":-425},{"x":575,"y":-425},{"x":-625,"y":-475},{"x":-125,"y":-475},{"x":125,"y":-475},{"x":625,"y":-475},{"x":-625,"y":-525},{"x":-375,"y":-525},{"x":-125,"y":-525},{"x":125,"y":-525},{"x":375,"y":-525},{"x":625,"y":-525},{"x":-625,"y":-575},{"x":-425,"y":-575},{"x":-125,"y":-575},{"x":125,"y":-575},{"x":425,"y":-575},{"x":625,"y":-575},{"x":-625,"y":-625},{"x":-575,"y":-625},{"x":-525,"y":-625},{"x":-475,"y":-625},{"x":-125,"y":-625},{"x":125,"y":-625},{"x":475,"y":-625},{"x":525,"y":-625},{"x":575,"y":-625},{"x":625,"y":-625},{"x":-125,"y":-675},{"x":125,"y":-675},{"x":-125,"y":-725},{"x":125,"y":-725},{"x":-125,"y":-775},{"x":125,"y":-775}],
    width: 800,
    height: 800,
    spawns: [
      { x: 0, y: 0 },
      { x: 0, y: -800 },
      { x: 0, y: 800 },
      { x: -800, y: 0 },
      { x: 800, y: 0 },
    ]  
  },
};


const gunsconfig = {
  1: {
    cooldown: 500,
    damage: 5,
    width: 5,
    height: 5,
    useplayerangle: false,
    bullets: [
      { angle: 90, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: 0, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: 180, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: -90, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: 45, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: -45, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: -135, speed: 13, distance: 200, delay: 0, offset: 0 },
      { angle: 135, speed: 13, distance: 200, delay: 0, offset: 0 }
    ]
  },
  2: {
    cooldown: 600,
    damage: 2,
    width: 5,
    height: 5,
    useplayerangle: true,
    bullets: [
      { angle: 0, speed: 25, distance: 300, delay: 0, offset: -10 },
      { angle: 0, speed: 25, distance: 300, delay: 100, offset: 10 },
      { angle: 0, speed: 25, distance: 300, delay: 200, offset: -10 },
      { angle: 0, speed: 25, distance: 300, delay: 300, offset: 10 },
      { angle: 0, speed: 25, distance: 300, delay: 400, offset: -10 }
     // { angle: 0, speed: 25, distance: 300, delay: 500, offset: -10 }
     
    ]
  },
  3: {
    cooldown: 1000,
    damage: 15,
    useplayerangle: true,
    bullets: [
      { angle: 0, speed: 10, distance: 500, delay: 0, offset: 0 },
      { angle: 20, speed: 10, distance: 500, delay: 100, offset: 0 },
      { angle: -20, speed: 10, distance: 500, delay: 200, offset: 0 },
      { angle: 40, speed: 10, distance: 500, delay: 300, offset: 0 },
      { angle: -40, speed: 10, distance: 500, delay: 400, offset: 0 }
    ]
  },
};



module.exports = {
  batchedMessages,
  server_tick_rate,
  matchmaking_timeout,
  player_idle_timeout,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  playerspeed,
  SHOOT_COOLDOWN,
  BULLET_DAMAGE,
  game_start_time,
  game_win_rest_time,
  maxClients,
  isValidDirection,
  teleporters,
  playerHitboxWidth, 
  playerHitboxHeight,
  gunsconfig,
  mapsconfig,
  matchmakingsp,
  gamemodeconfig,
  rooms,
};