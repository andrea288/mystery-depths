// Original pixel tiles. Only visual randomness: never touches the simulation RNG.
const atlases = new Map();
const palettes = {
  grass: [
    "#243a30",
    "#3d5442",
    "#73806a",
    "#97a180",
    "#1d5140",
    "#397554",
    "#78a355",
  ],
  bug: [
    "#303c28",
    "#4c5a37",
    "#7b8560",
    "#a0ab76",
    "#2f5434",
    "#56804c",
    "#a1b565",
  ],
  water: [
    "#1a3341",
    "#344e59",
    "#657d7b",
    "#8caaa0",
    "#19494c",
    "#306b66",
    "#69a69a",
  ],
  ice: [
    "#253e50",
    "#456478",
    "#87aaba",
    "#c1dfe0",
    "#416c80",
    "#83bbc7",
    "#d3eeee",
  ],
  fire: [
    "#30242b",
    "#584039",
    "#8a6550",
    "#b18b64",
    "#613b34",
    "#a35537",
    "#e39850",
  ],
  rock: [
    "#302c2c",
    "#534c43",
    "#807563",
    "#a99b7e",
    "#454c34",
    "#747c45",
    "#a3a862",
  ],
  ground: [
    "#3b3028",
    "#62533f",
    "#9a865f",
    "#c9b27c",
    "#595335",
    "#8c884a",
    "#bdb569",
  ],
  steel: [
    "#29343e",
    "#4b5961",
    "#77898c",
    "#abb8b5",
    "#344c48",
    "#577b66",
    "#89a28a",
  ],
  poison: [
    "#2c283c",
    "#514255",
    "#7b687e",
    "#a08aa3",
    "#3b4252",
    "#5d6870",
    "#8b9d79",
  ],
  ghost: [
    "#252637",
    "#424358",
    "#646a80",
    "#8c9ab0",
    "#303e50",
    "#4e6470",
    "#84a69b",
  ],
  fairy: [
    "#362c42",
    "#615064",
    "#927e91",
    "#c5a6b3",
    "#415451",
    "#6e8773",
    "#abc5a0",
  ],
};
const themeFor = (t) =>
  palettes[t] ||
  palettes[
    {
      electric: "ground",
      fighting: "rock",
      flying: "water",
      psychic: "fairy",
      dragon: "ghost",
      dark: "ghost",
      normal: "grass",
    }[t]
  ] ||
  palettes.grass;
function seed(n) {
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function tile(type, wall, variant, boss = false) {
  const key = `${type}:${wall}:${variant}:${boss}`;
  if (atlases.has(key)) return atlases.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 40;
  const g = c.getContext("2d"),
    p = themeFor(type),
    rnd = seed(variant * 7919 + 431 + (wall ? 17 : 0));
  const rect = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  rect(0, 0, 40, 40, p[0]);
  if (boss && !wall) {
    rect(0, 0, 40, 40, p[0]);
    rect(1, 1, 38, 38, p[1]);
    rect(3, 3, 34, 33, p[2]);
    rect(3, 2, 34, 2, p[3]);
    rect(3, 36, 34, 2, p[0]);
    if (variant % 3 === 0) {
      rect(4, 4, 7, 2, p[1]);
      rect(9, 6, 2, 5, p[1]);
      rect(11, 10, 4, 1, p[1]);
    }
    if (variant % 4 === 0) {
      rect(30, 30, 5, 3, p[4]);
      rect(33, 27, 2, 5, p[5]);
    }
  } else if (!wall) {
    rect(0, 0, 40, 40, p[1]);
    // Broken flagstones in an earth-and-moss bed, with large readable silhouettes.
    rect(0, 0, 40, 40, variant % 3 === 0 ? p[1] : p[0]);
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const x = col * 15 - 3 + (row % 2 ? 5 : 0),
          y = row * 15 - 4,
          w = 10 + Math.floor(rnd() * 5),
          h = 9 + Math.floor(rnd() * 5);
        if (rnd() < 0.18) continue;
        rect(x + 1, y, w - 2, h, p[1]);
        rect(x, y + 2, w, h - 4, p[2]);
        rect(x + 2, y + 1, w - 4, 2, p[3]);
        rect(x + 2, y + h - 2, w - 2, 2, p[1]);
        if (rnd() < 0.5) rect(x + 3, y + 6, 3, 1, p[1]);
      }
    for (let n = 0; n < 22; n++) {
      const x = Math.floor(rnd() * 40),
        y = Math.floor(rnd() * 40);
      rect(x, y, 2, 1, n % 3 ? p[1] : p[3]);
    }
  } else {
    // Raised ruin masonry under a dense canopy of pixel foliage/crystal.
    for (let row = 0; row < 3; row++)
      for (let col = -1; col < 3; col++) {
        const x = col * 20 + (row % 2 ? 9 : 0),
          y = row * 13;
        rect(x + 1, y + 1, 18, 10, p[1]);
        rect(x + 2, y + 1, 16, 2, p[2]);
        rect(x + 3, y + 3, 3, 5, p[2]);
        rect(x + 1, y + 10, 18, 2, "#101c24");
      }
    for (let n = 0; n < 9; n++) {
      const x = Math.floor(rnd() * 44) - 8,
        y = Math.floor(rnd() * 24) - 7,
        w = 9 + Math.floor(rnd() * 8);
      rect(x + 3, y, w - 6, 2, p[4]);
      rect(x + 1, y + 2, w - 2, 3, p[4]);
      rect(x, y + 5, w, 6, p[4]);
      rect(x + 2, y + 11, w - 4, 3, p[0]);
      rect(x + 2, y + 3, w - 4, 5, p[5]);
      rect(x + 4, y + 1, w - 8, 3, p[5]);
      rect(x + 4, y + 3, 4, 2, p[6]);
      rect(x + 2, y + 6, 3, 2, p[6]);
    }
    for (let n = 0; n < 14; n++) {
      const x = Math.floor(rnd() * 38),
        y = Math.floor(rnd() * 26);
      rect(x, y, 2, 1, p[6]);
    }
    if (variant % 4 === 0) {
      rect(29, 14, 2, 19, p[4]);
      rect(27, 21, 5, 3, p[5]);
      rect(29, 30, 5, 2, p[6]);
    }
  }
  atlases.set(key, c);
  return c;
}
export function drawWorld(
  ctx,
  game,
  camera,
  width,
  height,
  time,
  options = {},
) {
  const r = game.run,
    { x: ox, y: oy, size } = camera,
    type = game.biome?.().type || "grass";
  ctx.fillStyle = "#101f29";
  ctx.fillRect(0, 0, width, height);
  // Atmospheric depth behind the dungeon, independent of unexplored geometry.
  // Original silhouettes: broad cave ribs and distant suspended lights.
  for (let layer = 0; layer < 2; layer++) {
    const span = 115 + layer * 64,
      offset = (ox * (0.08 + layer * 0.04)) % span;
    ctx.fillStyle = layer ? "#152833" : "#12232e";
    for (let i = -1; i < width / span + 1; i++) {
      const x = Math.floor(i * span + offset),
        tip = 80 + (((i * 41 + r.seed) >>> 0) % 140);
      ctx.beginPath();
      ctx.moveTo(x - 35, 0);
      ctx.lineTo(x + 32, 0);
      ctx.lineTo(x + 13, tip);
      ctx.lineTo(x - 8, tip + 34);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (
    let y = Math.max(0, Math.floor(-oy / size));
    y < Math.min(r.h, Math.ceil((height - oy) / size));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(-ox / size));
      x < Math.min(r.w, Math.ceil((width - ox) / size));
      x++
    ) {
      if (!r.seen[y][x] && !r.tactics) continue;
      const px = ox + x * size,
        py = oy + y * size,
        wall = !!r.map[y][x],
        noise =
          (Math.imul(x + 1, 374761393) ^
            Math.imul(y + 1, 668265263) ^
            r.seed) >>>
          0;
      ctx.globalAlpha = r.tactics || game.visible(x, y) ? 1 : 0.26;
      ctx.drawImage(
        tile(type, wall, noise % 16, !!r.tactics),
        px,
        py,
        size,
        size,
      );

      if (!wall) {
        if (r.map[y - 1]?.[x]) {
          ctx.fillStyle = "#07162077";
          ctx.fillRect(px, py, size, size * 0.22);
        }
        if (r.map[y]?.[x - 1]) {
          ctx.fillStyle = "#07162033";
          ctx.fillRect(px, py, size * 0.12, size);
        }

        if (r.tactics || options.grid) {
          ctx.strokeStyle = r.tactics ? "#9ad5cd28" : "#ced9c21a";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
        }
      }
    }
  ctx.globalAlpha = 1;
}
export function drawStairs(ctx, p, size) {
  ctx.save();
  ctx.strokeStyle = "#ffe181";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    p.x - size * 0.48,
    p.y - size * 0.48,
    size * 0.96,
    size * 0.96,
  );
  ctx.fillStyle = "#102b35";
  ctx.fillRect(p.x - 27, p.y - size * 0.5 - 19, 54, 17);
  ctx.fillStyle = "#ffe181";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCALE ↓", p.x, p.y - size * 0.5 - 6);
  ctx.restore();
  ctx.fillStyle = "#172934";
  ctx.fillRect(p.x - size * 0.43, p.y - size * 0.43, size * 0.86, size * 0.86);
  ctx.fillStyle = "#b9bda1";
  ctx.fillRect(p.x - size * 0.45, p.y - size * 0.45, 3, size * 0.9);
  ctx.fillRect(p.x + size * 0.38, p.y - size * 0.45, 3, size * 0.9);
  for (let i = 0; i < 5; i++) {
    const y = p.y - size * 0.35 + i * size * 0.15;
    ctx.fillStyle = i % 2 ? "#6e817a" : "#82928a";
    ctx.fillRect(p.x - size * 0.35, y, size * 0.7, size * 0.12);
    ctx.fillStyle = "#c2c6aa";
    ctx.fillRect(p.x - size * 0.35, y, size * 0.7, 2);
  }
}
export function drawSite(ctx, site, p, size, time, reducedMotion) {
  ctx.save();
  ctx.translate(Math.round(p.x - size / 2), Math.round(p.y - size / 2));
  ctx.scale(size / 40, size / 40);
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  rect(7, 30, 27, 5, "#071b2855");
  if (site.kind === "treasure") {
    rect(7, 12, 27, 20, "#3c2831");
    rect(9, 9, 23, 8, "#683640");
    rect(10, 10, 21, 5, "#a95043");
    rect(9, 18, 23, 12, "#823d39");
    rect(9, 16, 23, 3, "#ebc46e");
    rect(11, 10, 3, 20, "#b78c47");
    rect(27, 10, 3, 20, "#b78c47");
    rect(18, 16, 6, 7, "#edcb76");
    rect(20, 18, 2, 3, "#6b4b35");
    rect(13, 11, 13, 1, "#d57a55");
  } else if (site.kind === "merchant") {
    rect(8, 12, 3, 22, "#634934");
    rect(30, 12, 3, 22, "#634934");
    rect(6, 10, 29, 7, "#6b4e7d");
    for (let i = 0; i < 5; i++) rect(6 + i * 6, 10, 3, 7, "#c19bc1");
    rect(8, 8, 25, 2, "#e4c48c");
    rect(7, 26, 28, 5, "#a47d4d");
    rect(9, 31, 24, 3, "#634934");
    rect(12, 21, 5, 5, "#86b8bf");
    rect(23, 20, 5, 6, "#dcae62");
    rect(13, 19, 3, 2, "#ecdc9d");
  } else if (site.kind === "rest") {
    rect(6, 26, 28, 6, "#567955");
    rect(8, 24, 24, 4, "#95b075");
    rect(12, 27, 16, 3, "#b9c694");
    rect(9, 19, 9, 7, "#d7d7b4");
    rect(28, 10, 2, 17, "#766246");
    rect(29, 10, 9, 8, "#8ad3b4");
    rect(32, 11, 2, 6, "#f7ecc4");
    rect(30, 13, 6, 2, "#f7ecc4");
  } else if (site.kind === "trial") {
    rect(11, 30, 20, 4, "#787e72");
    rect(17, 6, 4, 25, "#685443");
    rect(20, 7, 14, 13, "#b9494c");
    rect(22, 8, 10, 2, "#e48170");
    rect(25, 10, 3, 5, "#fff0bc");
    rect(25, 17, 3, 2, "#fff0bc");
  } else {
    rect(11, 20, 18, 10, "#ac9d77");
    rect(13, 18, 14, 3, "#dbd0a0");
    rect(14, 29, 12, 2, "#6a7861");
    const bob = reducedMotion ? 0 : Math.floor(Math.sin(time / 300) * 2);
    rect(17, 4 + bob, 8, 2, "#ffe2b5");
    rect(23, 6 + bob, 2, 5, "#ffe2b5");
    rect(20, 10 + bob, 4, 2, "#ffe2b5");
    rect(19, 12 + bob, 2, 3, "#ffe2b5");
    rect(19, 17 + bob, 2, 2, "#ffe2b5");
  }
  ctx.restore();
}
export function drawTerrain(ctx, tile, p, size, time, reducedMotion) {
  ctx.save();
  ctx.translate(Math.round(p.x - size / 2), Math.round(p.y - size / 2));
  ctx.scale(size / 40, size / 40);
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  if (tile.kind === "grass") {
    for (let i = 0; i < 10; i++) {
      const x = ((i * 13 + tile.x * 3) % 34) + 2,
        y = ((i * 7 + tile.y * 3) % 31) + 5;
      rect(x, y, 5, 2, "#245342");
      rect(x + 1, y - 4, 2, 5, "#5a8c52");
      rect(x + 4, y - 2, 1, 4, "#a3b66b");
    }
  } else if (tile.kind === "water") {
    rect(3, 2, 34, 36, "#315b68");
    rect(1, 7, 38, 26, "#2a617b");
    rect(4, 5, 32, 30, "#367f96");
    rect(7, 9, 26, 23, "#3f91a1");
    const offset = reducedMotion ? 0 : Math.floor(time / 450) % 3;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 11 + tile.x * 3 + offset * 2) % 25) + 5,
        y = 8 + i * 5;
      rect(x, y, 6, 1, "#91c9c0");
      rect(x - 2, y + 1, 2, 1, "#62aeb4");
    }
    rect(3, 4, 12, 2, "#739e87");
    rect(23, 33, 10, 2, "#adc3a3");
  } else if (tile.kind === "ice") {
    rect(3, 3, 34, 34, "#77a6b8");
    rect(5, 5, 29, 28, "#9bcbd1");
    rect(8, 6, 18, 2, "#e6f0dc");
    for (let i = 0; i < 12; i++) {
      rect(9 + i, 10 + i, 2, 1, "#d5e9db");
      rect(30 - i, 15 + i, 1, 1, "#5e98ae");
    }
  } else {
    rect(3, 4, 34, 32, "#b6a270");
    rect(7, 2, 25, 36, "#b6a270");
    for (let i = 0; i < 17; i++)
      rect(
        ((i * 11 + tile.x) % 30) + 5,
        ((i * 7 + tile.y) % 29) + 5,
        3,
        1,
        i % 2 ? "#dfc18a" : "#8b805b",
      );
  }
  ctx.restore();
}
