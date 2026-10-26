// Original pixel motifs; no external art or Team Cherry assets.
const colors = {
  vines: "#80c775",
  water: "#439dcc",
  ford: "#8adbd3",
  boulder: "#9a9eaa",
  vortex: "#616fd9",
  cascade: "#86deed",
  rock: "#b7a07b",
  fog: "#a9bac8",
  ledge: "#bba58e",
};
export function drawField(ctx, game, point, size, time, reduced) {
  const features = game.run.field?.features;
  if (!features) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const f of features) {
    if (!game.run.seen[f.y]?.[f.x]) continue;
    const p = point(f),
      u = size / 16;
    ctx.save();
    ctx.translate(Math.round(p.x - size / 2), Math.round(p.y - size / 2));
    ctx.scale(u, u);
    ctx.globalAlpha = game.visible(f.x, f.y) ? 0.85 : 0.3;
    const phase = reduced ? 0 : Math.floor(time / 240) % 3;
    ctx.fillStyle = "#101e2b";
    if (f.kind !== "vines") ctx.fillRect(2, 12, 12, 3);
    ctx.fillStyle = colors[f.kind];
    if (["water", "ford", "vortex", "cascade"].includes(f.kind)) {
      ctx.fillStyle = "#163e61";
      ctx.fillRect(1, 2, 14, 12);
      ctx.fillStyle = colors[f.kind];
      for (let i = 0; i < 3; i++)
        ctx.fillRect(2 + ((i + phase) % 3), 4 + i * 3, 10, 1);
      if (f.kind === "vortex") {
        ctx.fillStyle = "#161f4e";
        ctx.fillRect(6, 6, 4, 4);
      }
      if (f.kind === "cascade")
        for (let i = 3; i < 14; i += 3) ctx.fillRect(i, 2, 1, 11);
      if (f.kind === "ford") {
        ctx.fillStyle = "#c7bfa1";
        for (let i = 2; i < 15; i += 4) ctx.fillRect(i, 6, 3, 4);
      }
    } else if (f.kind === "vines") {
      // Low, irregular brambles across the ground: no upright fence posts.
      ctx.fillStyle = "#244e35";
      ctx.fillRect(1, 10, 14, 4);
      ctx.fillStyle = "#4a8b4b";
      for (const [x, y] of [
        [1, 9],
        [4, 7],
        [7, 10],
        [10, 6],
        [12, 9],
      ]) {
        ctx.fillRect(x, y, 4, 2);
        ctx.fillRect(x + 1, y - 2, 2, 2);
      }
      ctx.fillStyle = "#9ccc73";
      for (const [x, y] of [
        [3, 7],
        [6, 10],
        [9, 8],
        [13, 6],
      ])
        ctx.fillRect(x, y, 2, 1);
      ctx.fillStyle = "#bd8b9b";
      ctx.fillRect(5, 8, 1, 1);
      ctx.fillRect(12, 10, 1, 1);
    } else if (f.kind === "fog") {
      ctx.globalAlpha *= 0.55;
      for (let i = 0; i < 3; i++)
        ctx.fillRect(1 + ((phase + i) % 3), 3 + i * 4, 12, 3);
    } else if (f.kind === "ledge") {
      for (let i = 0; i < 3; i++)
        ctx.fillRect(2 + i * 3, 11 - i * 4, 10 - i * 3, 3);
    } else {
      ctx.fillRect(3, 5, 10, 8);
      ctx.fillRect(5, 3, 6, 2);
      ctx.fillStyle = "#d9d4bd";
      ctx.fillRect(5, 4, 5, 2);
      ctx.fillStyle = "#505367";
      ctx.fillRect(10, 7, 3, 5);
      if (f.kind === "rock") {
        ctx.fillStyle = "#2a2f41";
        ctx.fillRect(7, 6, 1, 3);
        ctx.fillRect(6, 9, 2, 3);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
