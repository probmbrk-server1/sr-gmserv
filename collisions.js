"use strict";

const wallblocksize = 50
function isCollisionWithWalls(walls, x, y) {
  
  const threshold = 100;
  let collisionDetected = false;
  const nearbyWalls = walls.filter((wall) => {
  
    const closestX = Math.max(
      wall.x - wallblocksize,
      Math.min(x, wall.x + wallblocksize),
    );
    const closestY = Math.max(
      wall.y - wallblocksize,
      Math.min(y, wall.y + wallblocksize),
    );
    const distanceX = x - closestX;
    const distanceY = y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < threshold;
  });

  
  for (const wall of nearbyWalls) {
    
    const wallLeft = wall.x - wallblocksize / 2;
    const wallRight = wall.x + wallblocksize / 2;
    const wallTop = wall.y - wallblocksize / 2;
    const wallBottom = wall.y + wallblocksize / 2;

    if (
      x + 20 > wallLeft &&
      x - 20 < wallRight &&
      y + 45 > wallTop &&
      y - 45 < wallBottom
    ) {
      collisionDetected = true; 
      break; 
     
    }
  }

   return collisionDetected;
}

function isCollisionWithBullet(walls, x, y, height, width) {

  const threshold = 60;
  let collisionDetected = false;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const nearbyWalls = walls.filter((wall) => {
  
    const closestX = Math.max(
      wall.x - wallblocksize + 1,
      Math.min(x, wall.x + wallblocksize),
    );
    const closestY = Math.max(
      wall.y - wallblocksize + 1,
      Math.min(y, wall.y + wallblocksize),
    );
    const distanceX = x - closestX;
    const distanceY = y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < threshold;
  });

  
  for (const wall of nearbyWalls) {
    const wallLeft = wall.x - wallblocksize / 2;
    const wallRight = wall.x + wallblocksize / 2;
    const wallTop = wall.y - wallblocksize / 2;
    const wallBottom = wall.y + wallblocksize / 2;

   
    if (
      x - halfWidth < wallRight &&
      x + halfWidth > wallLeft &&
      y - halfHeight < wallBottom &&
      y + halfHeight > wallTop
    ) {
      collisionDetected = true;
     
      break; 
    }
  }

   return collisionDetected;
}


function adjustBulletDirection(bullet, wall, wallblocksize) {
  let normalAngle = 0;
  const halfBlockSize = wallblocksize / 2;

  if (bullet.x < wall.x - halfBlockSize) {
    normalAngle = 180;
  } else if (bullet.x > wall.x + halfBlockSize) {
    normalAngle = 0;
  } else if (bullet.y < wall.y - halfBlockSize) {
    normalAngle = 90;
  } else if (bullet.y > wall.y + halfBlockSize) {
    normalAngle = 270;
  }

  const incomingAngle = bullet.direction * (Math.PI / 180);
  const normalAngleRadians = normalAngle * (Math.PI / 180);
  const reflectionAngle = 2 * normalAngleRadians - incomingAngle;
  const reflectionAngleDegrees = (reflectionAngle * 180) / Math.PI;
  bullet.direction = reflectionAngleDegrees % 360;
}

module.exports = {
  isCollisionWithWalls,
  isCollisionWithBullet,
  wallblocksize,
};
