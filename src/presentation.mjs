// Visual playback never changes the simulation or consumes its RNG.
export class Playback {
  constructor(game, before, events, speed = 1) {
    this.game = Object.create(game);
    this.game.run = structuredClone(before);
    this.final = game.run;
    this.elapsed = 0;
    this.index = 0;
    this.events = [];
    this.schedule = [];
    let cursor = 0,
      impact = 0,
      hitIndex = 0;
    const unit = Math.max(0.2, Math.min(3, speed));
    for (const original of events) {
      const e = structuredClone(original);
      let at = cursor,
        duration = 500;
      if (e.type === "attack" || e.type === "item") {
        at = cursor;
        duration = e.type === "attack" ? 1100 : 800;
        impact = cursor + (e.type === "attack" ? 700 : 450);
        hitIndex = 0;
        cursor += duration;
      } else if (["hit", "heal", "text"].includes(e.type)) {
        at = Math.max(0, impact + hitIndex++ * 210);
        duration = 650;
        cursor = Math.max(cursor, at + duration);
      } else if (e.type === "defeat") {
        at = Math.max(impact + hitIndex * 210, cursor - 300);
        duration = 850;
        cursor = at + duration;
      } else if (e.type === "step") {
        at = cursor;
        duration = 230;
        cursor += duration;
      } else {
        at = cursor;
        duration = 500;
        cursor += duration;
      }
      this.schedule.push({ ...e, time: at * unit, duration: duration * unit });
    }
    this.schedule.sort((a, b) => a.time - b.time);
    this.duration = Math.max(120, cursor * unit);
  }
  advance(delta, paused = false) {
    if (paused) return;
    this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, delta));
    while (
      this.index < this.schedule.length &&
      this.schedule[this.index].time <= this.elapsed
    ) {
      const e = this.schedule[this.index++];
      this.events.push(e);
      const r = this.game.run,
        mons = [r.player, ...(r.companions || []), ...r.enemies];
      const mon = mons.find((m) =>
        e.uid !== undefined
          ? m.uid === e.uid
          : m.x === e.to.x && m.y === e.to.y,
      );
      if (e.type === "teamSwap") {
        const out = r.companions?.find((m) => m.uid === e.outUid),
          incoming = r.companions?.find((m) => m.uid === e.inUid);
        if (out) out.active = false;
        if (incoming) Object.assign(incoming, e.position, { active: true });
      }
      if (mon && e.type === "step") {
        mon.x = e.to.x;
        mon.y = e.to.y;
        this.game.face(mon, e.to.x - e.from.x, e.to.y - e.from.y);
      }
      if (mon && e.type === "attack")
        this.game.face(mon, e.to.x - e.from.x, e.to.y - e.from.y);
      if (mon && e.type === "hit") mon.hp = Math.max(0, mon.hp - e.amount);
      if (mon && e.type === "heal")
        mon.hp = Math.min(mon.maxHp, mon.hp + e.amount);
      if (mon && e.type === "defeat") {
        mon.hp = 0;
        if (mon.uid !== 0) {
          r.enemies = r.enemies.filter((m) => m !== mon);
          mon.active = false;
        }
      }
      if (["hit", "heal"].includes(e.type) && mon)
        r.log.unshift({
          turn: r.turn + 1,
          text:
            mon.name + " " + (e.type === "heal" ? "+" : "−") + e.amount + " PS",
          tone: e.type === "heal" ? "good" : "danger",
        });
    }
    if (this.done) this.game.run = this.final;
  }
  get done() {
    return this.elapsed >= this.duration;
  }
  get current() {
    return this.events.findLast(
      (e) =>
        this.elapsed - e.time < e.duration &&
        ["attack", "item"].includes(e.type),
    );
  }
}
export const EFFECTS = {
  "silver-wind": ["Magical_Leaf", "room"],
  earthquake: ["Rock_Pieces", "room"],
  psychic: ["Shock_Wave", "impact"],
  gust: ["Vine_Whip_2", "projectile"],
  "sludge-bomb": ["Shadow_Ball", "projectile"],
  confusion: ["Shock_Wave", "impact"],
  "aerial-ace": ["Metal_Burst_Hit", "impact"],
  "aura-sphere": ["Dragon_Pulse_Ball", "projectile"],
  "dark-pulse": ["Shadow_Ball", "room"],
  "dazzling-gleam": ["Healing_Wish_Hit", "room"],
  pound: ["Hit_Neutral", "impact"],
  scratch: ["Metal_Burst_Hit", "impact"],
  "vine-whip": ["Vine_Whip_2", "beam"],
  "double-kick": ["Bullet_Punch", "impact"],
  tackle: ["Hit_Neutral", "impact"],
  bite: ["Fangs_RSE", "impact"],
  ember: ["Ember", "projectile"],
  flamethrower: ["Flamethrower", "beam"],
  "water-gun": ["Bubbles_Blue", "beam"],
  "hydro-pump": ["Bubbles_Blue", "beam"],
  "ice-beam": ["Ice_RSE", "beam"],
  "bubble-beam": ["Bubbles_Blue", "beam"],
  absorb: ["Absorb", "drain"],
  "mega-drain": ["Absorb", "drain"],
  "giga-drain": ["Absorb", "drain"],
  "razor-leaf": ["Razor_Leaf", "projectile"],
  "fire-spin": ["Fire_Spin_Front", "impact"],
  "thunder-shock": ["Spark", "impact"],
  thunderbolt: ["Shock_Wave", "impact"],
  "rock-throw": ["Rock_Pieces", "projectile"],
  "quick-attack": ["Hit_Neutral", "impact"],
  lick: ["Lick", "impact"],
  bubble: ["Bubbles_Blue", "projectile"],
  "fury-swipes": ["Metal_Burst_Hit", "impact"],
  "rock-slide": ["Rock_Smash", "impact"],
  "powder-snow": ["Ice_Pieces", "room"],
  "dragon-breath": ["Dragon_Pulse_Ball", "beam"],
  "metal-claw": ["Metal_Burst_Hit", "impact"],
  crunch: ["Fangs_RSE", "impact"],
  "shadow-ball": ["Shadow_Ball", "projectile"],
  astonish: ["Shadow_Ball", "impact"],
  "dragon-claw": ["Metal_Burst_Hit", "impact"],
  "magical-leaf": ["Magical_Leaf", "projectile"],
  "leaf-blade": ["Leaf_Blade", "impact"],
  "water-pulse": ["Bubble_Pop_Blue", "projectile"],
  "fire-fang": ["Fire_Fang_Hit", "impact"],
  "iron-head": ["Metal_Burst_Hit", "impact"],
};
