import { BIOMES } from "./game.mjs";
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
    this.camera = { x: 0, y: 0 };
  }
  async prepare(ids) {
    await Promise.all(
      [...new Set(ids)].map(async (id) => this.art.set(id, await sprite(id))),
    );
  }
  animate(events) {
    this.events = events.map((e) => ({ ...e, time: performance.now() }));
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
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#101e26";
    ctx.fillRect(0, 0, width, height);
    const r = game.run;
    if (!r) return;
    const size = 40,
      b = BIOMES[r.biome];
    const ox = Math.round(width / 2 - r.player.x * size - size / 2),
      oy = Math.round(height / 2 - r.player.y * size - size / 2);
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
        if (wall) {
          ctx.fillStyle = "#00000030";
          ctx.fillRect(px + 1, py + size - 6, size - 2, 6);
        } else {
          ctx.fillStyle = "#00000016";
          ctx.fillRect(
            px + ((x * 17 + y * 3) % 28),
            py + ((y * 13 + x) % 29),
            5,
            2,
          );
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
    const ex = point(r.exit);
    if (r.seen[r.exit.y][r.exit.x]) {
      ctx.fillStyle = "#e6c889";
      for (let i = 0; i < 5; i++)
        ctx.fillRect(ex.x - 13 + i * 2, ex.y - 12 + i * 5, 26 - i * 4, 3);
    }
    for (const item of r.items)
      if (game.visible(item.x, item.y)) {
        const p = point(item);
        ctx.font = "22px Georgia";
        ctx.textAlign = "center";
        ctx.fillStyle = "#edd19b";
        ctx.fillText(
          item.type === "chest" ? "▣" : item.type === "apple" ? "●" : "◆",
          p.x,
          p.y + 7,
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
    ctx.font = "bold 15px sans-serif";
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
