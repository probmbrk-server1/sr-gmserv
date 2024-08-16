"use strict";

const { respawnplayer } = require('./player')
const { handleElimination } = require('./zone')


// Helper function to apply the health decrease
function applyHealthDecrease(player, room) {
  

  if (1 > player.health) {
    if (player.respawns > 0) {
      respawnplayer(room, player);
    } else {
      handleElimination(room, player);
    }
  } else {
    player.last_hit_time = new Date().getTime();
    player.health -= 5;
    
    if (player.health < 1) {  // double check so player has no - health
      

      if (player.respawns > 0) {
        respawnplayer(room, player);
      } else {
        handleElimination(room, player);
      }
    }
  } 
  }


// Async function to decrease health
async function decreaseHealth(player, room) {
  if (player.visible && room.winner === 0) {
    applyHealthDecrease(player, room);
  }
}

// Apply health decrease for all players
async function decreaseHealthForAllPlayers(room) {
  if (room.state === "playing") {
    room.players.forEach(async (player) => {
      if (player.visible !== false && room.winner === 0) {
      await decreaseHealth(player, room);
    }
    });
  }
}

// Start decreasing health at intervals
function startDecreasingHealth(room, intervalInSeconds) {
  room.decreasehealth = setInterval(() => {

    decreaseHealthForAllPlayers(room);
  }, intervalInSeconds * 1000);
}


function waitForHealthBelow100(player, room) {
  return new Promise((resolve) => {
    const checkHealth = () => {
      if (player.health < player.starthealth) {
        resolve(); 
      } else {
        room.fixtimeout3 = setTimeout(checkHealth, player.starthealth);
      }
    };
    checkHealth(); 
  });
}

async function regenerateHealth(player, room) {
  await waitForHealthBelow100(player, room); 
  const currentTime = new Date().getTime();
  const timeSinceLastHit = currentTime - player.last_hit_time;
  if (timeSinceLastHit >= 10000 && player.health < player.starthealth) {
    player.health += 6;
    if (player.health > player.starthealth) {
      player.health = player.starthealth; 
    }
  }
}

async function regenerateHealthForAllPlayers(room) {
  if (room.state === "playing") {
    room.players.forEach((player) => {
      if (player.visible !== false) {
        regenerateHealth(player, room);
      }
    });
  }
}

function startRegeneratingHealth(room, intervalInSeconds) {
  room.regeneratehealth = setInterval(() => {
    regenerateHealthForAllPlayers(room);
  }, intervalInSeconds * 1000); 
}

module.exports = {
  startDecreasingHealth, 
  startRegeneratingHealth,
};
