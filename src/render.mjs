import { drawWorld, drawStairs } from "./world-art.mjs";
import { drawAdventure } from "./adventure-render.mjs";
import { DIRS, ITEMS, itemIcon } from "./game.mjs";
import { EFFECTS } from "./presentation.mjs";
const cache = new Map();
let effectSheets;
async function loadEffects() {
  effectSheets ??= fetch("assets/effects/manifest.json")
    .then((r) => r.json())
    .then(async (data) => {
      const result = {};
      await Promise.all(
        Object.entries(data.sheets).map(async ([key, def]) => {
          const img = new Image();
          img.src = "assets/effects/" + def.file;
          await img.decode();
          result[key] = { ...def, img };
        }),
      );
      return result;
    });
  return effectSheets;
}
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
    for (const key of [...Object.keys(ITEMS), "chest"]) {
      const img = new Image();
      img.src = itemIcon(key);
      img
        .decode()
        .then(() => this.items.set(key, img))
        .catch(console.error);
    }
    this.camera = { x: 0, y: 0 };
    this.hitAreas = [];
  }
  async prepare(ids) {
    this.fx = await loadEffects();
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
          time - e.time < (e.duration || (e.type === "defeat" ? 900 : 350)),
      );
    if (ev && !this.reducedMotion) {
      const progress = Math.min(1, (time - ev.time) / (ev.duration || 160));
      if (ev.type === "step") {
        x += (ev.from.x - ev.to.x) * (this.camera.size || 40) * (1 - progress);
        y += (ev.from.y - ev.to.y) * (this.camera.size || 40) * (1 - progress);
      }
      if (ev.type === "attack") {
        const pulse =
          Math.sin(
            Math.min(1, (time - ev.time) / (ev.duration || 220)) * Math.PI,
          ) * 9;
        x += Math.sign(ev.to.x - ev.from.x) * pulse;
        y += Math.sign(ev.to.y - ev.from.y) * pulse;
      }
      if (ev.type === "hit" && this.options?.shake !== false)
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
          : Math.min(
              total - 1,
              Math.floor(((time - ev.time) / (ev.duration || 350)) * total),
            ),
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
    const size = r.tactics
      ? Math.min(40, Math.floor(width / 21), Math.floor(height / 15))
      : width >= 700
        ? 56
        : 40;
    const focus = !r.tactics && game.controlled ? game.controlled() : r.player;
    const step = this.events.findLast(
      (e) =>
        e.type === "step" &&
        e.uid === focus.uid &&
        time - e.time < (e.duration || 160),
    );
    const follow =
      step && !this.reducedMotion && !r.tactics
        ? 1 - (time - step.time) / (step.duration || 160)
        : 0;
    const cameraX =
      (r.tactics ? 12 : focus.x) +
      (step ? step.from.x - step.to.x : 0) * follow;
    const cameraY =
      (r.tactics ? 9 : focus.y) + (step ? step.from.y - step.to.y : 0) * follow;
    const ox = Math.round(width / 2 - cameraX * size - size / 2),
      oy = Math.round(height / 2 - cameraY * size - size / 2);
    this.camera = { x: ox, y: oy, size };
    drawWorld(ctx, game, this.camera, width, height, time, {
      ...this.options,
      reducedMotion: this.reducedMotion,
    });
    const rangeActor =
      game.active?.().find((m) => m.uid === this.commandUid) || r.player;
    if (this.rangeMove) {
      ctx.fillStyle = "#dfc58724";
      for (
        let y = Math.max(0, rangeActor.y - 10);
        y < Math.min(r.h, rangeActor.y + 11);
        y++
      )
        for (
          let x = Math.max(0, rangeActor.x - 10);
          x < Math.min(r.w, rangeActor.x + 11);
          x++
        )
          if (
            game.floorTile(x, y) &&
            game.visible(x, y) &&
            game.validTarget(rangeActor, { x, y, hp: 1 }, this.rangeMove)
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
      const [dx, dy] = DIRS[focus.facing];
      const mark = point({ x: focus.x + dx, y: focus.y + dy });
      ctx.fillStyle = "#ffdf7b30";
      ctx.fillRect(mark.x - 18, mark.y - 18, 36, 36);
      ctx.strokeStyle = "#ffe198";
      ctx.lineWidth = 2;
      ctx.strokeRect(mark.x - 16, mark.y - 16, 32, 32);
      ctx.fillStyle = "#ffe198";
      ctx.fillRect(mark.x - 3, mark.y - 3, 6, 6);
    }
    drawAdventure(ctx, game, point, size, time, {
      move: this.rangeMove || this.orderMove,
      actor: this.commandUid ?? 0,
      reducedMotion: this.reducedMotion,
      movement: this.movementPreview,
    });
    const ex = point(r.exit);
    if (r.seen[r.exit.y][r.exit.x]) {
      drawStairs(ctx, ex, size);
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
    if (r.tactics?.phase === "deploy") {
      ctx.fillStyle = "#80dfa538";
      ctx.strokeStyle = "#9febb4";
      for (const cell of game.deploymentCells()) {
        const x = ox + cell.x * size,
          y = oy + cell.y * size;
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);
      }
    }
    for (const mon of [...r.enemies, ...(game.active?.() || [r.player])].sort(
      (a, b) => a.y - b.y,
    )) {
      if (!r.tactics && mon !== r.player && !game.visible(mon.x, mon.y))
        continue;
      const p = point(mon);
      ctx.fillStyle =
        mon.uid === this.commandUid || mon === target
          ? "#e6c88955"
          : mon === r.player
            ? "#8dccb438"
            : "#00000040";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 13, 17, 6, 0, 0, 7);
      ctx.fill();
      this.mon(mon, p.x, p.y, time, (2 * size) / 40);
      if (mon !== r.player) {
        ctx.fillStyle = "#0a141a";
        ctx.fillRect(p.x - 15, p.y - 24, 30, 3);
        ctx.fillStyle = game.isAlly?.(mon)
          ? "#8dccb4"
          : mon.boss
            ? "#e9bc75"
            : "#d88677";
        ctx.fillRect(
          p.x - 15,
          p.y - 24,
          (30 * Math.max(0, mon.hp)) / mon.maxHp,
          3,
        );
      }
    }
    for (const ev of this.events) {
      const duration = ev.duration || 1100,
        age = time - ev.time;
      if (
        age < 0 ||
        age > duration ||
        !["attack", "heal", "item"].includes(ev.type)
      )
        continue;
      const t = age / duration,
        p = point(ev.to),
        a = point(ev.from);
      let [key, kind] = EFFECTS[ev.slug] || ["Hit_Neutral", "impact"];
      if (ev.type === "heal" || ev.type === "item") {
        key = "Healing_Wish_Hit";
        kind = "impact";
      }
      const sheet = this.fx?.[key];
      if (!sheet) continue;
      if (t < 0.2 && ev.type === "attack") {
        ctx.strokeStyle = "#ffe8aa";
        ctx.lineWidth = 2;
        ctx.strokeRect(a.x - 18, a.y - 22, 36, 36);
        continue;
      }
      let x = p.x,
        y = p.y,
        scale = 2;
      const phase = Math.max(0, Math.min(1, (t - 0.2) / 0.8));
      if (kind === "projectile") {
        const travel = Math.min(1, phase / 0.6);
        x = a.x + (p.x - a.x) * travel;
        y = a.y + (p.y - a.y) * travel;
      }
      if (kind === "drain") {
        x = p.x + (a.x - p.x) * phase;
        y = p.y + (a.y - p.y) * phase;
      }
      const frame = this.reducedMotion
        ? Math.min(2, sheet.frames - 1)
        : Math.min(sheet.frames - 1, Math.floor(phase * sheet.frames));
      const draw = (x, y, s = scale) =>
        ctx.drawImage(
          sheet.img,
          frame * sheet.size,
          0,
          sheet.size,
          sheet.size,
          Math.round(x - (sheet.size * s) / 2),
          Math.round(y - (sheet.size * s) / 2 - 8),
          sheet.size * s,
          sheet.size * s,
        );
      ctx.globalAlpha = this.reducedMotion ? 0.65 : 1;
      if (kind === "beam") {
        const distance = Math.hypot(p.x - a.x, p.y - a.y),
          count = Math.max(1, Math.ceil(distance / 22));
        for (
          let i = 1;
          i <= Math.max(1, Math.ceil(count * Math.min(1, phase * 2)));
          i++
        )
          draw(
            a.x + ((p.x - a.x) * i) / count,
            a.y + ((p.y - a.y) * i) / count,
            1.5,
          );
      } else if (kind === "room") {
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) draw(p.x + i * 32, p.y + j * 32, 1.5);
      } else draw(x, y);
    }
    ctx.globalAlpha = 1;
    ctx.font = "24px Pixel, monospace";
    ctx.textAlign = "center";
    for (const ev of this.events) {
      const age = time - ev.time;
      if (
        age > 800 ||
        this.options?.numbers === false ||
        !["hit", "heal", "text"].includes(ev.type)
      )
        continue;
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
      (e) =>
        e.type === "defeat" &&
        e.uid !== 0 &&
        e.mon &&
        time - e.time < (e.duration || 900),
    )) {
      const p = point(ev.to);
      ctx.globalAlpha = 1 - (time - ev.time) / (ev.duration || 900);
      this.mon(ev.mon, p.x, p.y, time, (2 * size) / 40);
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
      if (focus.uid !== 0) {
        mc.fillStyle = "#ffcb74";
        mc.fillRect(focus.x * s - 1, focus.y * s - 1, s + 3, s + 3);
      }
    }
  }
}
