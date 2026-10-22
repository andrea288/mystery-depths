import { BIOMES, DIRS } from "./game.mjs";
const cache = new Map();
let metadata;
async function sprite(id) {
  if (cache.has(id)) return cache.get(id);
  const promise = (async () => {
    metadata ??= fetch("assets/game/animations.json").then((r) => r.json());
    const defs = (await metadata)[id];
    const anims = {};
    for (const [name, def] of Object.entries(defs)) {
      const img = new Image();
      img.src = `assets/pokemon/${String(id).padStart(4, "0")}/${def.sheet}-Anim.png`;
      await img.decode();
      anims[name] = {
        ...def,
        img,
        w: def.frameWidth,
        h: def.frameHeight,
        durations: def.durations,
      };
    }
    return anims;
  })();
  cache.set(id, promise);
  return promise;
}
export class Renderer {
  constructor(canvas, mini) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mini = mini;
    this.art = new Map();
    this.events = [];
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.items = new Map();
    for (const key of ["berry", "ether", "apple", "seed", "chest"]) {
      const img = new Image();
      img.src = `assets/items/${key}.${["seed", "chest"].includes(key) ? "svg" : "png"}`;
      img
        .decode()
        .then(() => this.items.set(key, img))
        .catch(console.error);
    }
    this.camera = { x: 0, y: 0 };
    this.hitAreas = [];
  }
  async prepare(ids) {
    await Promise.all(
      [...new Set(ids)].map(async (id) => this.art.set(id, await sprite(id))),
    );
  }
  animate(events) {
    const now = performance.now();
    this.events = [
      ...this.events.filter((e) => now - e.time < 900),
      ...events.map((e) => ({ ...e, time: now })),
    ].slice(-100);
  }
  mon(mon, x, y, time, scale = 2) {
    const ctx = this.ctx;
    const ev = [...this.events]
      .reverse()
      .find(
        (e) =>
          e.uid === mon.uid &&
          time - e.time < (e.type === "defeat" ? 900 : 350),
      );
    if (ev && !this.reducedMotion) {
      const progress = Math.min(1, (time - ev.time) / 160);
      if (ev.type === "step") {
        x += (ev.from.x - ev.to.x) * 40 * (1 - progress);
        y += (ev.from.y - ev.to.y) * 40 * (1 - progress);
      }
      if (ev.type === "attack") {
        const pulse =
          Math.sin(Math.min(1, (time - ev.time) / 220) * Math.PI) * 9;
        x += Math.sign(ev.to.x - ev.from.x) * pulse;
        y += Math.sign(ev.to.y - ev.from.y) * pulse;
      }
      if (ev.type === "hit")
        x += Math.sin((time - ev.time) / 18) * 3 * (1 - progress);
    }
    this.hitAreas.push({ uid: mon.uid, x, y });
    const a = this.art.get(mon.species);
    if (!a) return;
    const action =
      ev?.type === "defeat"
        ? "Faint"
        : ev?.type === "hit"
          ? "Hurt"
          : ev?.type === "step"
            ? "Walk"
            : ev?.type === "attack"
              ? "Attack"
              : "Idle";
    const animation = a[action] || a.Idle;
    if (!animation) return;
    const total = animation.durations.reduce((s, n) => s + n, 0);
    let tick =
        action === "Idle"
          ? Math.floor((time / 1000) * 60) % total
          : Math.min(total - 1, Math.floor(((time - ev.time) / 1000) * 60)),
      frame = 0;
    while (
      frame < animation.durations.length - 1 &&
      tick >= animation.durations[frame]
    )
      tick -= animation.durations[frame++];
    const row = ((8 - mon.facing) % 8) % animation.shadowAnchors.length;
    const left = Math.round(x - (animation.w * scale) / 2),
      top = Math.round(y - (animation.h / 2 + 4) * scale);
    const anchor = animation.shadowAnchors[row][frame];
    ctx.fillStyle = "#00000040";
    ctx.beginPath();
    ctx.ellipse(
      left + anchor[0] * scale,
      top + anchor[1] * scale,
      15,
      5,
      0,
      0,
      7,
    );
    ctx.fill();
    ctx.drawImage(
      animation.img,
      frame * animation.w,
      row * animation.h,
      animation.w,
      animation.h,
      left,
      top,
      animation.w * scale,
      animation.h * scale,
    );
  }

  draw(game, time, target) {
    const c = this.canvas,
      ctx = this.ctx;
    const width = Math.round(c.clientWidth || 540),
      height = Math.round(c.clientHeight || 300);
    if (c.width !== width || c.height !== height) {
      c.width = width;
      c.height = height;
    }
    this.hitAreas = [];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#101e26";
    ctx.fillRect(0, 0, width, height);
    const r = game.run;
    if (!r) return;
    const size = 40,
      b = BIOMES[r.biome];
    const step = this.events.findLast(
      (e) => e.type === "step" && e.uid === 0 && time - e.time < 160,
    );
    const follow =
      step && !this.reducedMotion ? 1 - (time - step.time) / 160 : 0;
    const cameraX = r.player.x + (step ? step.from.x - step.to.x : 0) * follow;
    const cameraY = r.player.y + (step ? step.from.y - step.to.y : 0) * follow;
    const ox = Math.round(width / 2 - cameraX * size - size / 2),
      oy = Math.round(height / 2 - cameraY * size - size / 2);
    this.camera = { x: ox, y: oy, size };
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const px = ox + x * size,
          py = oy + y * size;
        if (
          px < -size ||
          py < -size ||
          px > width ||
          py > height ||
          !r.seen[y][x]
        )
          continue;
        ctx.globalAlpha = game.visible(x, y) ? 1 : 0.3;
        const wall = r.map[y][x];
        ctx.fillStyle = wall ? b.wall : b.floor;
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = wall ? b.edge : "#ffffff08";
        ctx.fillRect(px + 1, py + 1, size - 2, wall ? 8 : 1);
        const noise = (x * 73 + y * 127 + x * y * 17) >>> 0;
        if (wall) {
          ctx.fillStyle = "#00000042";
          ctx.fillRect(px, py + 25, size, 15);
          ctx.fillStyle = b.edge;
          ctx.fillRect(px + 3, py + 4, 14, 8);
          ctx.fillRect(px + 20, py + 3, 17, 10);
          ctx.fillStyle = "#ffffff10";
          ctx.fillRect(px + 4, py + 4, 11, 2);
          ctx.fillRect(px + 22, py + 3, 12, 2);
          ctx.fillStyle = "#00000036";
          ctx.fillRect(px + 17, py + 2, 3, 13);
          ctx.fillRect(px + 2, py + 15, 36, 2);
          ctx.fillStyle = b.edge;
          ctx.fillRect(px + 6, py + 18, 24, 7);
          if (noise % 3 === 0) {
            ctx.fillStyle = b.accent;
            ctx.globalAlpha *= 0.3;
            ctx.fillRect(px + 5, py + 5, 6, 3);
            ctx.fillRect(px + 8, py + 8, 3, 5);
          }
        } else {
          ctx.fillStyle = "#ffffff08";
          ctx.fillRect(px + 2, py + 2, 16, 16);
          ctx.fillRect(px + 22, py + 22, 15, 15);
          ctx.fillStyle = "#00000026";
          ctx.fillRect(px + 2, py + 19, 15, 2);
          ctx.fillRect(px + 21, py + 37, 16, 2);
          ctx.fillRect(
            px + (noise % 28) + 3,
            py + ((noise >> 3) % 28) + 3,
            4,
            2,
          );
          if (r.map[y - 1]?.[x]) {
            ctx.fillStyle = "#00000035";
            ctx.fillRect(px, py, size, 7);
          }
          if (noise % 7 === 0) {
            ctx.fillStyle = b.accent;
            ctx.globalAlpha *= 0.25;
            ctx.fillRect(px + 8, py + 26, 2, 5);
            ctx.fillRect(px + 5, py + 28, 2, 3);
          }
        }
      }
    ctx.globalAlpha = 1;
    if (this.rangeMove) {
      ctx.fillStyle = "#dfc58724";
      for (
        let y = Math.max(0, r.player.y - 10);
        y < Math.min(r.h, r.player.y + 11);
        y++
      )
        for (
          let x = Math.max(0, r.player.x - 10);
          x < Math.min(r.w, r.player.x + 11);
          x++
        )
          if (
            game.floorTile(x, y) &&
            game.visible(x, y) &&
            game.validTarget(r.player, { x, y, hp: 1 }, this.rangeMove)
          )
            ctx.fillRect(
              ox + x * size + 1,
              oy + y * size + 1,
              size - 2,
              size - 2,
            );
    }
    const point = (o) => ({
      x: ox + o.x * size + size / 2,
      y: oy + o.y * size + size / 2,
    });
    if (this.facingMode) {
      const [dx, dy] = DIRS[r.player.facing];
      const mark = point({ x: r.player.x + dx, y: r.player.y + dy });
      ctx.fillStyle = "#ffdf7b30";
      ctx.fillRect(mark.x - 18, mark.y - 18, 36, 36);
      ctx.strokeStyle = "#ffe198";
      ctx.lineWidth = 2;
      ctx.strokeRect(mark.x - 16, mark.y - 16, 32, 32);
      ctx.fillStyle = "#ffe198";
      ctx.fillRect(mark.x - 3, mark.y - 3, 6, 6);
    }
    const ex = point(r.exit);
    if (r.seen[r.exit.y][r.exit.x]) {
      ctx.fillStyle = "#e6c889";
      for (let i = 0; i < 5; i++)
        ctx.fillRect(ex.x - 13 + i * 2, ex.y - 12 + i * 5, 26 - i * 4, 3);
    }
    for (const item of r.items)
      if (game.visible(item.x, item.y)) {
        const p = point(item);
        const icon = this.items.get(item.type);
        const bob = this.reducedMotion
          ? 0
          : Math.round(Math.sin(time / 280 + item.x) * 2);
        ctx.fillStyle = "#00000040";
        ctx.fillRect(p.x - 9, p.y + 9, 18, 4);
        if (icon)
          ctx.drawImage(
            icon,
            Math.round(p.x - 16),
            Math.round(p.y - 18 + bob),
            32,
            32,
          );
      }
    for (const mon of [...r.enemies, r.player].sort((a, b) => a.y - b.y)) {
      if (mon !== r.player && !game.visible(mon.x, mon.y)) continue;
      const p = point(mon);
      ctx.fillStyle =
        mon === target
          ? "#e6c88955"
          : mon === r.player
            ? "#8dccb438"
            : "#00000040";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 13, 17, 6, 0, 0, 7);
      ctx.fill();
      this.mon(mon, p.x, p.y, time);
      if (mon !== r.player) {
        ctx.fillStyle = "#0a141a";
        ctx.fillRect(p.x - 15, p.y - 24, 30, 3);
        ctx.fillStyle = mon.boss ? "#e9bc75" : "#d88677";
        ctx.fillRect(
          p.x - 15,
          p.y - 24,
          (30 * Math.max(0, mon.hp)) / mon.maxHp,
          3,
        );
      }
    }
    if (!this.reducedMotion)
      for (const ev of this.events) {
        const age = time - ev.time;
        if (
          age < 0 ||
          age > 420 ||
          !["attack", "hit", "heal"].includes(ev.type)
        )
          continue;
        const p = point(ev.to),
          from = point(ev.from),
          t = age / 420;
        const colors = {
          fire: "#ffc15e",
          water: "#86d8ff",
          grass: "#b4e989",
          electric: "#fff28c",
          ice: "#c3fcff",
          poison: "#dc9ce7",
          ghost: "#ad9cf1",
          normal: "#fff0c4",
        };
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle =
          ev.type === "heal" ? "#b6f5a1" : colors[ev.element] || "#ffe9a9";
        if (
          ev.type === "attack" &&
          Math.max(
            Math.abs(ev.to.x - ev.from.x),
            Math.abs(ev.to.y - ev.from.y),
          ) > 1
        ) {
          const travel = Math.min(1, t * 2.5);
          ctx.fillRect(
            Math.round(from.x + (p.x - from.x) * travel) - 4,
            Math.round(from.y + (p.y - from.y) * travel) - 4,
            8,
            8,
          );
        } else
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4,
              radius = 5 + t * 27;
            const x = Math.round(p.x + Math.cos(angle) * radius),
              y = Math.round(p.y - 8 + Math.sin(angle) * radius);
            ctx.fillRect(x, y, i % 2 ? 3 : 5, i % 2 ? 3 : 5);
          }
      }
    ctx.globalAlpha = 1;
    ctx.font = "24px Pixel, monospace";
    ctx.textAlign = "center";
    for (const ev of this.events) {
      const age = time - ev.time;
      if (age > 800 || !["hit", "heal", "text"].includes(ev.type)) continue;
      const p = point(ev.to);
      ctx.globalAlpha = 1 - age / 800;
      ctx.fillStyle = ev.type === "heal" ? "#a4e4aa" : "#fff0d4";
      ctx.fillText(
        ev.label || `${ev.type === "heal" ? "+" : "−"}${ev.amount}`,
        p.x,
        p.y - 22 - age / 30,
      );
    }
    ctx.globalAlpha = 1;
    for (const ev of this.events.filter(
      (e) => e.type === "defeat" && e.uid !== 0 && e.mon && time - e.time < 900,
    )) {
      const p = point(ev.to);
      ctx.globalAlpha = 1 - (time - ev.time) / 900;
      this.mon(ev.mon, p.x, p.y, time);
      ctx.globalAlpha = 1;
    }
    if (this.mini) {
      const mc = this.mini.getContext("2d"),
        s = Math.min(this.mini.width / r.w, this.mini.height / r.h);
      mc.clearRect(0, 0, 172, 124);
      for (let y = 0; y < r.h; y++)
        for (let x = 0; x < r.w; x++)
          if (r.seen[y][x] && r.map[y][x] === 0) {
            mc.fillStyle = "#688a89";
            mc.fillRect(x * s, y * s, s, s);
          }
      mc.fillStyle = "#ffe1a0";
      if (r.seen[r.exit.y][r.exit.x])
        mc.fillRect(r.exit.x * s, r.exit.y * s, s + 1, s + 1);
      mc.fillStyle = "#baffd9";
      mc.fillRect(r.player.x * s, r.player.y * s, s + 1, s + 1);
    }
  }
}
