"use strict";

const { LZString, axios, Limiter } = require('./index.js');
const { matchmaking_timeout, server_tick_rate, WORLD_WIDTH, WORLD_HEIGHT, game_start_time, batchedMessages, rooms, mapsconfig, gunsconfig, gamemodeconfig, matchmakingsp } = require('./config.js');
const { handleBulletFired } = require('./bullets.js');
const { handleMovement } = require('./player.js');
const { startRegeneratingHealth, startDecreasingHealth } = require('./match-modifiers');
const { gadgetconfig } = require('./gadgets.js')

const { UseZone } = require('./zone');

const {
  verifyPlayer,
} = require("./dbrequests");

function createRateLimiter() {
  const rate = 50; // Allow one request every 50 milliseconds
  return new Limiter({
    tokensPerInterval: rate,
    interval: 1000, // milliseconds
  });
}


function closeRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    clearTimeout(room.fixtimeout);
    clearTimeout(room.fixtimeout2);
    clearTimeout(room.fixtimeout3);
    clearTimeout(room.fixtimeout4);
    clearTimeout(room.runtimeout);
   
    clearInterval(room.intervalId);
    clearInterval(room.shrinkInterval);
    clearInterval(room.zonefulldamage);
    clearInterval(room.pinger);
    clearInterval(room.snapInterval);
    clearInterval(room.cleanupinterval);
    clearInterval(room.decreasehealth);
    clearInterval(room.regeneratehealth);

    // Clean up resources associated with players in the room
    room.players.forEach(player => {
      clearInterval(player.moveInterval);
      clearTimeout(player.timeout);
      player.ws.close();
    });

    rooms.delete(roomId);

    console.log(`Room ${roomId} closed.`);
  } else {
    console.log(`Room ${roomId} not found.`);
  }
}

async function joinRoom(ws, token, gamemode, playerVerified) {
  try {

      let roomId;
      let room;

      const { playerId, hat, top, player_color, hat_color, top_color, selected_gadget } = playerVerified;

     const gadgetselected = selected_gadget || 1;
  
     const { skillpoints } = playerVerified;

     const targetValue = skillpoints;

     const roomjoiningvalue = matchmakingsp(targetValue);
      // Check if there's an existing room with available slots
      const availableRoom = Array.from(rooms.values()).find(
        (currentRoom) =>
          currentRoom.players.size < gamemodeconfig[gamemode].maxplayers &&
          currentRoom.state !== "playing" &&
          currentRoom.state !== "countdown" &&
          currentRoom.gamemode === gamemode && currentRoom.sp_level === roomjoiningvalue
      );

      if (availableRoom) {
        roomId = availableRoom.roomId || `room_${Math.random().toString(36).substring(2, 15)}`;
        room = availableRoom;
      } else {
        roomId = `room_${Math.random().toString(36).substring(2, 15)}`;
        room = createRoom(roomId, gamemode, gamemodeconfig[gamemode], roomjoiningvalue);
      }


      const playerRateLimiter = createRateLimiter();

      // Determine spawn position index
      const playerCount = room.players.size;
      const spawnPositions = room.spawns
      const spawnIndex = playerCount % spawnPositions.length;

      const newPlayer = {
        ws,
        x: spawnPositions[spawnIndex].x,
        y: spawnPositions[spawnIndex].y,
        direction: null,
        prevX: 0,
        prevY: 0,
        lastProcessedPosition: { x: spawnPositions[spawnIndex].x, y: spawnPositions[spawnIndex].y },
        startspawn: { x: spawnPositions[spawnIndex].x, y: spawnPositions[spawnIndex].y },
        playerId: playerId,
        rateLimiter: playerRateLimiter,
        hat: hat,
        top: top,
        player_color: player_color,
        hat_color: hat_color,
        top_color: top_color,
        timeout: null,
        health: gamemodeconfig[gamemode].playerhealth,
        starthealth: gamemodeconfig[gamemode].playerhealth,
        damage: 0,
        kills: 0,
        lastShootTime: 0,
        moving: false,
        moveInterval: null,
        visible: true,
        eliminated: false,
        place: null,
        shooting: false,
        shoot_direction: 90,
        gun: 1,
        bullets: new Map(),
        spectatingPlayer: playerId,
        emote: 0,
        respawns: room.respawns,
        gadgetid: gadgetselected,
        canusegadget: true,
        gadgetcooldown: gadgetconfig[gadgetselected].cooldown,
        gadgetuselimit: gadgetconfig[gadgetselected].use_limit,

        usegadget() {
        
        const player = room.players.get(playerId);
        
        if (player && room.state === 'playing' && player.visible) {
            // Apply the gadget effect
            gadgetconfig[gadgetselected].gadget(player, room);
        } else {
            console.error('Player not found');
        
      }
      },
      };
  

      if (room) {

      room.players.set(playerId, newPlayer);

    }

      if (room.state === "waiting" && room.players.size > room.maxplayers - 1) {
        room.state = "await";
        room.fixtimeout = setTimeout(() => {
          
      

        room.state = "countdown";

        room.fixtimeout2 = setTimeout(() => {
          room.state = "playing";

         if (room.zoneallowed === true) {
            UseZone(room);
            }

         if (room.regenallowed === true) {
            startRegeneratingHealth(room, 1);
            }

         if (room.healthdecrease === true) {
            startDecreasingHealth(room, 1)
            }
           
          }, 5000);
         // generateRandomCoins(room);
        }, game_start_time);
      }
   
    

      // Set timeout to disconnect player after 5 minutes of inactivity
      const playerTimeout = setTimeout(() => {
        player.ws.close(4100, "matchmaking_timeout");
      }, matchmaking_timeout);

      // Assign the timeout ID to the player
      room.players.get(playerId).timeout = playerTimeout;

      return { roomId, playerId, room };
    
  } catch (error) {
    console.error("Error joining room:", error);
    ws.close(4000, "Error joining room");
    throw error;
  }
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  // Clear the cleanup interval if it exists
  if (room.cleanupinterval) {
    clearInterval(room.cleanupinterval);
  }

  // Close the room if it has no players
  if (room.players.size < 1) {
    closeRoom(roomId);
  }
}

function addToBatch(roomId, messages) {
  if (!batchedMessages.has(roomId)) {
    batchedMessages.set(roomId, []);
  }
  batchedMessages.get(roomId).push(...messages);
}

function getDistance(x1, y1, x2, y2) {
return Math.sqrt(
    Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2),
  );

}
/*
function sendBatchedMessages(roomId) {
  const room = rooms.get(roomId);



  const playerData = Array.from(room.players.values()).reduce((acc, player) => {

    if (player.visible !== false) {
      
      
      const formattedBullets = player.bullets.reduce((acc, bullet) => {
        acc[bullet.timestamp] = {
          x: bullet.x,
          y: bullet.y,
          d: bullet.direction,
        };
        return acc;
      }, {});

      acc[player.playerId] = {
        x: player.x,
        y: player.y,
        d: player.direction,
        h: player.health,
        s: player.shooting,
        g: player.gun,
        ping: player.ping,
        hd: player.hitdata,
        b: formattedBullets,
      };


      // Include additional properties only when room state is not "playing"
      if (room.state !== "playing") {
        acc[player.playerId].hat = player.hat;
        acc[player.playerId].top = player.top;
        acc[player.playerId].player_color = player.player_color;
        acc[player.playerId].hat_color = player.hat_color;
        acc[player.playerId].top_color = player.top_color;
      }
    }

    return acc;
  }, {});

  const newMessage = {
    ...playerData ? { playerData } : {},
    //coins: room.coins,
    state: room.state,
    z: room.zone,
    pl: room.maxplayers,
    pg: room.sendping,
    rp: room.players.size,
    //coins: room.coins,
    ...(room.eliminatedPlayers && room.eliminatedPlayers.length > 0) ? { eliminatedPlayers: room.eliminatedPlayers } : {},
  };

  const jsonString = JSON.stringify(newMessage);
  const compressedString = LZString.compressToUint8Array(jsonString);

  if (room.lastSentMessage !== jsonString) {
    room.players.forEach((player) => {
      player.ws.send(compressedString, { binary: true });
    });

    room.lastSentMessage = jsonString;
  }

  batchedMessages.set(roomId, []); // Clear the batch after sending
} 

*/

function sendBatchedMessages(roomId) {
  const room = rooms.get(roomId);

  // Prepare new player data and changes
  const playerDataChanges = {};
  const playerData = {};

  Array.from(room.players.values()).forEach(player => {
    if (player.visible !== false) {
      const formattedBullets = {};
player.bullets.forEach(bullet => {
  formattedBullets[bullet.timestamp] = {
    x: bullet.x,
    y: bullet.y,
    d: bullet.direction,
  };
});

      // Create current player data object
      const currentPlayerData = {
        x: player.x,
        y: player.y,
        dr: player.direction2,
        h: player.health,
        s: player.shooting,
        g: player.gun,
        p: player.ping,
        w: player.hitdata,
        e: player.elimlast,
        b: formattedBullets, // Always include bullets
        em: player.emote,
        ell: player.elimlast,
        cg: player.canusegadget,
        lg: player.gadgetuselimit,
      };

      // Include additional properties only when room state is not "playing"
      if (room.state !== "playing") {
        currentPlayerData.ht = player.hat;
        currentPlayerData.tp = player.top;
        currentPlayerData.pc = player.player_color;
        currentPlayerData.hc = player.hat_color;
        currentPlayerData.tc = player.top_color;
        currentPlayerData.sh = player.starthealth;
      }

      playerData[player.playerId] = currentPlayerData;

      if (room.state === "playing") {
        // Track changes if state is "playing"
        const previousPlayerData = room.lastSentPlayerData?.[player.playerId] || {};
        const changes = {};

        // Only check for changes in non-bullets data
        Object.keys(currentPlayerData).forEach(key => {
          if (key !== 'bullets' && key !== 'shooting') {
            if (JSON.stringify(currentPlayerData[key]) !== JSON.stringify(previousPlayerData[key])) {
              changes[key] = currentPlayerData[key];
            }
          }
        });

        // Always include bullets changes
      
          changes.b = currentPlayerData.b;

        if (Object.keys(changes).length > 0) {
          playerDataChanges[player.playerId] = changes;
        }
      }
    }
  });

  const playercountroom = Array.from(room.players.values()).filter(player => player.eliminated === false).length;
  // Create the new message based on room state
  const newMessage = {
    pD: room.state === "playing" ? playerDataChanges : playerData,
    st: room.lastSent?.state !== room.state ? room.state : undefined,
    ...(room.lastSent?.zone !== room.zone ? { z: room.zone } : {}),
    pl: room.state === "playing" ? room.lastSent?.maxplayers !== room.maxplayers ? { pl: room.maxplayers } : undefined : room.maxplayers,
    // ...(room.lastSent?.sendping !== room.sendping ? { pg: room.sendping } : {}),
    rp: playercountroom,
    id: room.state === "playing" ? undefined : room.map,
    ...(room.eliminatedPlayers && room.eliminatedPlayers.length > 0 ? { ep: room.eliminatedPlayers } : {}),
  };

  //pl: room.state === "playing" ? room.lastSent?.maxplayers !== room.maxplayers ? { pl: room.maxplayers } : {} : room.maxplayers,

  const jsonString = JSON.stringify(newMessage);
  const compressedString = LZString.compressToUint8Array(jsonString);

  // Check if the message has changed
  if (room.lastSentMessage !== jsonString) {
    room.players.forEach(player => {
      if (player.ws) {
        player.ws.send(compressedString, { binary: true });
      }
    });

    room.lastSentMessage = jsonString;
    room.lastSentPlayerData = playerData;
  


    // Update the last sent message and player data
    room.lastSent = {
      zone: room.zone,
      maxplayers: room.maxplayers,
     // sendping: room.sendping,
      playersize: room.players.size,
      state: room.state,
      id: room.map,
      ep: room.eliminatedPlayers
    };
  }


  batchedMessages.set(roomId, []); // Clear the batch after sending
}


    // Update last sent message and player data
   

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


// Utility function to calculate distance between two points
function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}



function createRoom(roomId, gamemode, gmconfig, splevel) {
  const mapid = (getRandomInt(1, Object.keys(mapsconfig).length))
  const room = {
    roomId: roomId,
    maxplayers: gmconfig.maxplayers,
    sp_level: splevel,
    snap: [],
    players: new Map(),
    state: "waiting", // Possible values: "waiting", "playing", "countdown"
    gamemode: gamemode,
    winner: 0,
    eliminatedPlayers: [],
    zoneStartX: -mapsconfig[mapid].width, // Example start X coordinate (100 units left of the center)
    zoneStartY: -mapsconfig[mapid].height, // Example start Y coordinate (100 units above the center)
    zoneEndX: mapsconfig[mapid].width,  // Example end X coordinate (100 units right of the center)
    zoneEndY: mapsconfig[mapid].height,
    mapHeight: mapsconfig[mapid].height,
    mapWidth: mapsconfig[mapid].width,
    walls: mapsconfig[mapid].walls.map(({ x, y }) => ({ x, y })),
    spawns: mapsconfig[mapid].spawns,
    map: mapid,
    respawns: gmconfig.respawns_allowed,
    zonespeed: gmconfig.zonespeed,
    zoneallowed: gmconfig.usezone,
    regenallowed: gmconfig.health_restore,
    healthdecrease: gmconfig.health_autodamage,
  };
  
  rooms.set(roomId, room);
console.log("room created:", roomId)


  // Start sending batched messages at regular intervals
  room.intervalId = setInterval(() => {
    
    sendBatchedMessages(roomId);
  }, server_tick_rate);

 // room.intervalId = intervalId;
 room.fixtimeout4 = setTimeout(() => {


 room.cleanupinterval = setInterval(() => {
  
  if (room) {
 cleanupRoom(room);
}
   }, 1000);
 }, 10000);


  const roomopentoolong = setTimeout(() => {
    closeRoom(roomId);
    console.log(`Room ${roomId} closed due to timeout.`);
  }, 10 * 60 * 1000);
  room.runtimeout = roomopentoolong;

  return room;
}

function generateRandomCoins(roomId) {
  const coins = [];
  for (let i = 0; i < 1; i++) {
    const coin = {
      x: Math.floor(Math.random() * (roomId.mapWidth * 2 + 1)) - roomId.mapWidth,
      y: Math.floor(Math.random() * (roomId.mapHeight * 2 + 1)) - roomId.mapHeight,
    };
    coins.push(coin);
  }
  roomId.coins = coins;


}

function handleCoinCollected2(result, index) {
  const room = rooms.get(result.roomId);
  const playerId = result.playerId;

  room.coins.splice(index, 1);

  const expectedOrigin = "tw-editor://.";
  axios
    .post(
      `https://liquemgames-api.netlify.app/increasecoins-lqemfindegiejgkdmdmvu/${playerId}`,
      null,
      {
        headers: {
          Origin: expectedOrigin,
        },
      },
    )
    .then(() => {
      console.log(`Coins increased for player ${playerId}`);
    })
    .catch((error) => {
      console.error("Error increasing coins:", error);
    });

 
  // Generate new random coins
  generateRandomCoins(room);
}

const validDirections = [-90, 0, 180, -180, 90, 45, 135, -135, -45];

const isValidDirection = (direction) => {
  const numericDirection = parseFloat(direction);
  return !isNaN(numericDirection) && validDirections.includes(numericDirection);
};

function handleRequest(result, message) {
	const player = result.room.players.get(result.playerId);
	if (result.room.state === "playing" && player.visible !== false && !player.eliminated) {
		try {
			const data = JSON.parse(message);
			if (message.length > 100) {
				player.ws.close(4000, "ahhh whyyyyy");
			}
			if (data.type === "shoot") {
				if (data.shoot_direction > -181 && data.shoot_direction < 181) {
					player.shoot_direction = parseFloat(data.shoot_direction);
					handleBulletFired(result.room, player, player.gun);
				} else {
				//	console.log(data.shoot_direction)
				}
			}
			if (data.type === "pong") {
				const timestamp = new Date().getTime();
				if (player.lastping && (timestamp - player.lastping < 2000)) {
					player.ping = timestamp - player.lastping;
				} else {
	
				}
			}

			if (data.type === "switch_gun") {
				const selectedGunNumber = parseFloat(data.gun);
				const allguns = Object.keys(gunsconfig).length;
				if (
					selectedGunNumber !== player.gun &&
					!player.shooting &&
					selectedGunNumber >= 1 &&
					selectedGunNumber <= allguns
				) {
					
					player.gun = selectedGunNumber;
				} else if (player.shooting) {
					
					console.log("Cannot switch guns while shooting.");
				} else {
					
					console.log("Gun number must be between 1 and 3.");
				}
			}
			if (data.moving === "false") {
				clearInterval(player.moveInterval);
				player.moveInterval = null;
				player.moving = false;
			}


      if (data.type === "emote" && data.id >= 1 && data.id <= 4 && player.emote === 0){
         
        player.emote = data.id

        setTimeout(() =>{
        player.emote = 0

        }, 3000);
        }

        if (data.type === "gadget" && player.canusegadget && player.gadgetuselimit > 0){
         
          player.canusegadget = false
          player.gadgetuselimit--
  
          player.usegadget();
          setTimeout(() =>{
            player.canusegadget = true
  
          }, player.gadgetcooldown);
          }


			if (
				data.type === "movement" &&
				typeof data.direction === "string" &&
				isValidDirection(data.direction)
			) {
				const validDirection = parseFloat(data.direction);
				if (!isNaN(validDirection)) {
					if (player) {
						
						player.direction = validDirection;
						if (validDirection > 90) {
							player.direction2 = 90;
						} else if (validDirection < -90) {
							player.direction2 = -90;
						} else {
							player.direction2 = validDirection;
						}
						
						if (data.moving === "true") {
						
							if (!player.moving === true) {
								player.moving = true;
							}
						} else if (data.moving === "false") {
							
							player.moving = false;
						} else {
							console.warn("Invalid 'moving' value:", data.moving);
						}
					
						if (!player.moveInterval) {
							player.moveInterval = setInterval(() => {
             
								if (player.moving) {
                  

									handleMovement(result, player);
								} else {
               
									clearInterval(player.moveInterval);
									player.moveInterval = null;
								}
							}, server_tick_rate);
						}
					}
				} else {
					console.warn("Invalid direction value:", data.direction);
				}
			}
		} catch (error) {
			console.error("Error parsing message:", error);
		}
	}
}

module.exports = {
  joinRoom,
  addToBatch,
  sendBatchedMessages,
  createRoom,
  generateRandomCoins,
  handleRequest,
  closeRoom,
  handleCoinCollected2,
};