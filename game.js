"use strict";

function hidePlayer(player) {

  player.health = 0; 
  player.visible = false;
}



function endGame(room) {

  room.players.forEach((player) => {

  clearInterval(player.moveInterval)
  clearTimeout(player.timeout)

    if (room.eliminatedPlayers) {
      player.ws.close(4300, "places");
    } else {
      player.ws.close(4301, "game_ended");
    }
  });
}

module.exports = {
  hidePlayer,
  endGame,
};