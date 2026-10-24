const previews = new WeakMap();
export function drawAdventure(ctx, game, point, size, time, options = {}) {
  const r = game.run,
    a = r.adventure;
  if (!a) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const tile of a.terrain) {
    if (!r.seen[tile.y]?.[tile.x]) continue;
    const p = point(tile);
    ctx.globalAlpha = game.visible(tile.x, tile.y) ? 0.75 : 0.25;
    ctx.fillStyle = {
      water: "#467fba",
      ice: "#a3dbea",
      sand: "#c2a565",
      grass: "#486c42",
    }[tile.kind];
    ctx.fillRect(p.x - size / 2 + 1, p.y - size / 2 + 1, size - 2, size - 2);
    ctx.fillStyle = "#ffffff35";
    if (tile.kind === "water")
      for (let i = 0; i < 3; i++)
        ctx.fillRect(
          p.x - size * 0.35,
          p.y - size * 0.25 + i * size * 0.22,
          size * 0.6,
          2,
        );
    if (tile.kind === "ice") {
      ctx.beginPath();
      ctx.moveTo(p.x - size * 0.3, p.y - size * 0.3);
      ctx.lineTo(p.x + size * 0.3, p.y + size * 0.3);
      ctx.strokeStyle = "#efffff";
      ctx.stroke();
    }
    if (tile.kind === "sand")
      for (let i = 0; i < 4; i++)
        ctx.fillRect(p.x + (i % 2 ? 5 : -6), p.y + (i > 1 ? 5 : -5), 2, 2);
  }
  ctx.globalAlpha = 1;
  for (const s of a.sites) {
    if ((s.used && !s.pending) || !game.visible(s.x, s.y)) continue;
    const p = point(s);
    ctx.fillStyle = {
      treasure: "#debb56",
      rest: "#79d5b2",
      merchant: "#bc8be2",
      trial: "#ea9471",
      rescue: "#e5c0d5",
    }[s.kind];
    ctx.fillRect(p.x - size * 0.3, p.y - size * 0.3, size * 0.6, size * 0.6);
    ctx.strokeStyle = "#1c262d";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - size * 0.3, p.y - size * 0.3, size * 0.6, size * 0.6);
    ctx.fillStyle = "#162631";
    ctx.font = `bold ${Math.max(12, size * 0.48)}px Pixel,monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      { treasure: "◆", rest: "+", merchant: "¤", trial: "!", rescue: "?" }[
        s.kind
      ],
      p.x,
      p.y + size * 0.16,
    );
  }
  if (r.tactics) {
    const intent = a.bossIntent;
    for (const cell of intent?.tiles || []) {
      const p = point(cell);
      ctx.fillStyle = intent.kind === "move" ? "#70c5ef55" : "#ff695e55";
      ctx.fillRect(p.x - size / 2 + 1, p.y - size / 2 + 1, size - 2, size - 2);
      ctx.strokeStyle = intent.kind === "move" ? "#92d9f9" : "#ff9d89";
      ctx.strokeRect(
        p.x - size / 2 + 1,
        p.y - size / 2 + 1,
        size - 2,
        size - 2,
      );
    }
    for (const [i, order] of game.orderPreview().entries()) {
      if (order.missing) continue;
      const from = point(order.from),
        to = point(order.end || order.to);
      ctx.strokeStyle = order.conflict ? "#ffb64d" : "#9fe4b9";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = Math.max(2, size / 12);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      if (from.x !== to.x || from.y !== to.y) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(
          to.x - Math.cos(angle - 0.5) * 9,
          to.y - Math.sin(angle - 0.5) * 9,
        );
        ctx.lineTo(
          to.x - Math.cos(angle + 0.5) * 9,
          to.y - Math.sin(angle + 0.5) * 9,
        );
        ctx.closePath();
        ctx.fill();
      }
      if (order.conflict) {
        const p = point(order.to);
        ctx.fillStyle = "#ffa83a66";
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.fillStyle = "#c8f5da";
      ctx.font = "14px Pixel,monospace";
      ctx.fillText(String(i + 1), from.x + size * 0.3, from.y - size * 0.25);
    }
  }
  const move = options.move,
    actor = game.active().find((m) => m.uid === options.actor) || r.player;
  if (move) {
    let cache = previews.get(game);
    if (!cache || cache.turn !== r.turn) {
      cache = { turn: r.turn, matches: new Map() };
      previews.set(game, cache);
    }
    for (const enemy of r.enemies.filter((e) => game.visible(e.x, e.y))) {
      const key = actor.uid + ":" + enemy.uid + ":" + move.id;
      let result = cache.matches.get(key);
      if (!result) {
        result = game.matchup(actor, enemy, move);
        cache.matches.set(key, result);
      }
      const p = point(enemy);
      ctx.font = `${Math.max(12, Math.min(18, size * 0.45))}px Pixel,monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle =
        result.score === 3
          ? "#f3da82"
          : result.score < 2
            ? "#aab7cb"
            : "#d7e7e9";
      ctx.fillText(result.label, p.x, p.y - size * 0.85);
    }
  }
  if (!options.reducedMotion && a.weather !== "clear") {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle =
      a.weather === "sunny"
        ? "#ffe4a7"
        : a.weather === "sandstorm"
          ? "#dbc28e"
          : "#d1ebfc";
    for (let i = 0; i < 24; i++) {
      const x =
          (i * 137 + time / (a.weather === "sandstorm" ? 18 : 60)) %
          ctx.canvas.width,
        y = (i * 83 + time / 15) % ctx.canvas.height;
      if (a.weather === "fog") ctx.fillRect(x, y, 70, 10);
      else
        ctx.fillRect(
          x,
          y,
          a.weather === "rain" ? 2 : 3,
          a.weather === "rain" ? 9 : 3,
        );
    }
  }
  ctx.restore();
}
