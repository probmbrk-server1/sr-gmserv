"use strict";

const { isCollisionWithBullet } = require('./collisions');
const { handlePlayerCollision } = require('./player');
const { playerHitboxHeight, playerHitboxWidth, gunsconfig, server_tick_rate } = require('./config');

const BULLET_MOVE_INTERVAL = server_tick_rate; // milliseconds

// Helper functions
const calculateDistance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
const toRadians = degrees => degrees * (Math.PI / 180);

// Collision Detection
function isCollisionWithPlayer(bullet, player, height, width) {
  const playerLeft = player.x - playerHitboxWidth / 2.4;
  const playerRight = player.x + playerHitboxWidth / 2.4;
  const playerTop = player.y - playerHitboxHeight / 2.4;
  const playerBottom = player.y + playerHitboxHeight / 2.4;

  const bulletLeft = bullet.x - width / 2;
  const bulletRight = bullet.x + width / 2;
  const bulletTop = bullet.y - height / 2;
  const bulletBottom = bullet.y + height / 2;

  return (
    bulletRight >= playerLeft &&
    bulletLeft <= playerRight &&
    bulletBottom >= playerTop &&
    bulletTop <= playerBottom
  );
}

// Bullet Movement
function moveBullet(room, player, bullet) {
  if (!bullet) return;

  const { speed, direction, distance, timestamp, height, width } = bullet;
  const radians = toRadians(direction - 90); // Adjust direction to radians
  const xDelta = speed * Math.cos(radians);
  const yDelta = speed * Math.sin(radians);

  const newX = Math.round(bullet.x + xDelta);
  const newY = Math.round(bullet.y + yDelta);
  const distanceTraveled = calculateDistance(bullet.startX, bullet.startY, newX, newY);

  if (!isCollisionWithBullet(room.walls, newX, newY, height, width) && distanceTraveled <= distance) {
    bullet.x = newX;
    bullet.y = newY;

    for (const [id, otherPlayer] of room.players) {
      if (otherPlayer !== player && otherPlayer.visible && isCollisionWithPlayer(bullet, otherPlayer, height, width)) {
        const shootDistance = (distanceTraveled / distance + 0.5).toFixed(1);
        handlePlayerCollision(room, player, otherPlayer, shootDistance, bullet.damage);
        player.bullets.delete(timestamp);
        return;
      }
    }
  } else {
    player.bullets.delete(timestamp);
  }
}

// Bullet Shooting with Delay
function shootBulletsWithDelay(room, player, bulletdata) {
  return new Promise(resolve => {
    setTimeout(async () => {
      await shootBullet(room, player, bulletdata);
      resolve();
    }, bulletdata.delay);
  });
}

// Shoot Bullet
async function shootBullet(room, player, bulletdata) {
  const { angle, offset, damage, distance, speed, height, width } = bulletdata;
  const radians = toRadians(angle);
  const xOffset = offset * Math.cos(radians);
  const yOffset = offset * Math.sin(radians);
  const timestamp = Math.random().toString(36).substring(2, 7);

  const bullet = {
    x: player.x + xOffset,
    y: player.y + yOffset,
    startX: player.x + xOffset,
    startY: player.y + yOffset,
    direction: angle,
    timestamp,
    damage,
    distance,
    speed,
    height,
    width,
  };

  player.bullets.set(timestamp, bullet);

  while (player.bullets.has(timestamp)) {
    moveBullet(room, player, bullet);
    if (!player.bullets.has(timestamp)) break;
    await new Promise(resolve => setTimeout(resolve, BULLET_MOVE_INTERVAL));
  }
}

// Handle Bullet Fired
async function handleBulletFired(room, player, gunType) {
  const gun = gunsconfig[gunType];
  const currentTime = Date.now();
  const lastShootTime = player.lastShootTime || 0;
  const shootCooldown = gun.cooldown;

  if (player.shooting || (currentTime - lastShootTime < shootCooldown)) {
    return;
  }

  player.shooting = true;
  player.lastShootTime = currentTime;

  const definedAngle = gun.useplayerangle ? player.shoot_direction : 0;

  for (const bullet of gun.bullets) {
    
    const bulletdata = {
      speed: bullet.speed / 2,
      distance: bullet.distance,
      delay: bullet.delay,
      offset: bullet.offset,
      damage: gun.damage,
      angle: gun.useplayerangle ? bullet.angle + definedAngle : bullet.angle,
      height: gun.height,
      width: gun.width,
    };

   shootBulletsWithDelay(room, player, bulletdata);
  }

  setTimeout(() => {
    player.shooting = false;
  }, shootCooldown);
}

module.exports = {
  handleBulletFired,
};
