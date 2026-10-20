/**
 * Intentional roguelite extension, NOT the original EoS dungeon generator or RNG.
 * Combat, movement, collision and action scheduling must live in the EoS core.
 */
export const WIDTH = 56;
export const HEIGHT = 32;

export function validateFloor(floor) {
  if (typeof floor !== "string" || !/^[1-9][0-9]{0,127}$/.test(floor)) {
    throw new TypeError("Il piano deve essere una stringa decimale positiva (massimo 128 cifre).");
  }
  return BigInt(floor);
}

function rng(seed) {
  let state = 2166136261;
  for (const code of new TextEncoder().encode(seed)) {
    state = Math.imul(state ^ code, 16777619) >>> 0;
  }
  if (!state) state = 1;
  return max => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % max;
  };
}

export function nextFloor(floor) {
  const next = String(validateFloor(floor) + 1n);
  validateFloor(next);
  return next;
}

export function generateDungeon(seed, floor = "1") {
  if (typeof seed !== "string" || !seed.length || seed.length > 256) {
    throw new TypeError("Seed non valido.");
  }
  const depth = validateFloor(floor);
  const random = rng(JSON.stringify([seed, floor]));
  const tiles = new Uint8Array(WIDTH * HEIGHT);
  const rooms = [];
  const carve = (x, y) => { tiles[y * WIDTH + x] = 1; };
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 2 + col * 18 + random(3);
      const y = 2 + row * 15 + random(3);
      const width = 8 + random(6);
      const height = 6 + random(5);
      const room = {x, y, width, height, center: {x: x + (width >> 1), y: y + (height >> 1)}};
      rooms.push(room);
      for (let yy = y; yy < y + height; yy++) {
        for (let xx = x; xx < x + width; xx++) carve(xx, yy);
      }
    }
  }
  // Connected tree plus an extra link. Orthogonal carving guarantees a route
  // regardless of the core's eventual diagonal corner rules.
  const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5]];
  for (const [a, b] of edges) {
    let {x, y} = rooms[a].center;
    const to = rooms[b].center;
    const horizontalFirst = random(2) === 0;
    for (const axis of horizontalFirst ? ["x", "y"] : ["y", "x"]) {
      if (axis === "x") {
        while (x !== to.x) { x += Math.sign(to.x - x); carve(x, y); }
      } else {
        while (y !== to.y) { y += Math.sign(to.y - y); carve(x, y); }
      }
    }
  }
  const start = {...rooms[0].center};
  const stairs = {...rooms[5].center};
  const available = [];
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if ((x !== start.x || y !== start.y) && (x !== stairs.x || y !== stairs.y)) {
          available.push({x, y});
        }
      }
    }
  }
  // Shuffle the room cells so enemies, items and traps cannot overlap.
  for (let i = available.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [available[i], available[j]] = [available[j], available[i]];
  }
  const take = count => available.splice(0, count);
  const difficulty = Number(depth > 100n ? 100n : depth);
  return {
    schema: 1, seed, floor, width: WIDTH, height: HEIGHT, tiles,
    rooms, start, stairs,
    biome: ["bosco", "caverna", "rovine", "cristallo"][Number(((depth - 1n) / 5n) % 4n)],
    bossFloor: depth % 5n === 0n,
    // Positions only, not live entities: no invented battle stats or mechanics.
    spawns: {
      enemies: take(Math.min(14, 3 + Math.floor(difficulty / 5))),
      items: take(4),
      traps: take(Math.min(6, Math.floor(difficulty / 4))),
    },
  };
}

export function reachableCells(map) {
  const start = map.start.y * map.width + map.start.x;
  const visited = new Set([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const x = current % map.width, y = Math.floor(current / map.width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const next = ny * map.width + nx;
      if (map.tiles[next] === 1 && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}
