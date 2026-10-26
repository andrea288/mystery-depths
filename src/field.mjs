import { Game as Adventure } from "./adventure.mjs";
export { DIFFICULTIES, TACTICS, WEATHER, GEAR } from "./adventure.mjs";
export const FIELD = {
  cut: {
    name: "Taglio",
    cost: 1,
    range: 1,
    element: "grass",
    feature: "vines",
    desc: "Recide i rovi che rallentano il movimento. Recupera 12 monete senza occupare uno slot mossa.",
  },
  fly: {
    name: "Volo",
    cost: 3,
    range: 4,
    element: "flying",
    travel: true,
    desc: "Sorvola gli ostacoli e atterra su una casella libera già esplorata, entro quattro caselle.",
  },
  surf: {
    name: "Surf",
    cost: 2,
    range: 3,
    element: "water",
    travel: true,
    feature: "water",
    desc: "Raggiunge una casella d’acqua entro tre caselle. Crea un guado, utile anche agli alleati.",
  },
  strength: {
    name: "Forza",
    cost: 2,
    range: 1,
    element: "normal",
    feature: "boulder",
    desc: "Spinge un masso di una casella: vicino a un alleato offre copertura e riduce i danni del 25%.",
  },
  flash: {
    name: "Flash",
    cost: 2,
    range: 0,
    element: "electric",
    desc: "Illumina le caselle entro cinque passi e disperde la nebbia vicina. Non rivela attraverso i muri.",
  },
  whirlpool: {
    name: "Mulinello",
    cost: 2,
    range: 3,
    element: "water",
    feature: "vortex",
    desc: "Dissipa un vortice. Su un nemico non boss a vista lo trascina di una casella verso chi agisce.",
  },
  waterfall: {
    name: "Cascata",
    cost: 2,
    range: 3,
    element: "water",
    travel: true,
    feature: "cascade",
    desc: "Risale una cascata entro tre caselle. La corrente protegge dagli attacchi durante il turno di arrivo.",
  },
  rockSmash: {
    name: "Spaccaroccia",
    cost: 1,
    range: 1,
    element: "fighting",
    feature: "rock",
    desc: "Frantuma rocce e massi; recupera monete dalle rocce integre.",
  },
  dive: {
    name: "Sub",
    cost: 3,
    range: 3,
    element: "water",
    travel: true,
    feature: "water",
    desc: "Da una casella d’acqua raggiunge altra acqua entro tre caselle, protetto dagli attacchi nel turno di arrivo.",
  },
  defog: {
    name: "Scacciabruma",
    cost: 2,
    range: 0,
    element: "flying",
    desc: "Disperde nebbia e vortici entro quattro caselle e annulla il tempo nebbioso fino al piano successivo.",
  },
  rockClimb: {
    name: "Scalaroccia",
    cost: 2,
    range: 2,
    element: "normal",
    travel: true,
    feature: "ledge",
    desc: "Raggiunge un appiglio entro due caselle, anche oltre una parete, guadagnando copertura nel turno di arrivo.",
  },
};
export const FIELD_HINTS = {
  vines: "Rallentato — Usa Taglio per rompere i rovi.",
  water: "Rallentato — Usa Surf per creare un guado.",
  vortex: "Rallentato — Usa Mulinello per disperdere il vortice.",
  boulder:
    "Copertura — Usa Forza per spostare il masso o Spaccaroccia per distruggerlo.",
  rock: "Roccia friabile — Usa Spaccaroccia per romperla.",
  fog: "Nebbia — Usa Flash o Scacciabruma per liberare la visuale.",
  cascade: "Cascata — Usa Cascata per risalirla.",
  ledge: "Appiglio — Usa Scalaroccia per raggiungerlo.",
  ford: "Guado — Qui l’acqua non rallenta.",
};
export const FEATURES = {
  vines: "Rovi",
  water: "Acqua",
  boulder: "Masso",
  vortex: "Vortice",
  cascade: "Cascata",
  rock: "Roccia friabile",
  fog: "Nebbia",
  ledge: "Appiglio",
  ford: "Guado",
};
const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const same = (a, b) => a.x === b.x && a.y === b.y;
export class Game extends Adventure {
  stairs() {
    const ok = super.stairs();
    if (!ok || this.run.state !== "reward") return ok;
    const members = this.members().filter((m) => m.hp > 0);
    if (members.length > 1) {
      const candidates = members.flatMap((m) =>
        this.D.pokemon[m.species].learnset
          .filter((id) => !this.availableMoves(m).includes(id))
          .map((id) => ({ m, id })),
      );
      const companions = candidates.filter((c) => c.m.uid !== 0);
      if (companions.length) {
        const chosen =
          companions[(this.run.floor + this.run.seed) % companions.length];
        this.run.reward[2] = {
          kind: "move",
          id: chosen.id,
          name: this.D.moves[chosen.id].name,
          desc: "Mossa permanente per " + chosen.m.name + ".",
          recipientUid: chosen.m.uid,
        };
        this.sync();
      }
    }
    return ok;
  }
  chooseReward(index, replace = 0) {
    const reward = this.run.reward?.[index],
      recipient =
        reward?.recipientUid &&
        this.members().find((m) => m.uid === reward.recipientUid);
    if (!recipient) return super.chooseReward(index, replace);
    const starter = this.run.player,
      originalBuild = this.buildFloor;
    this.run.player = recipient;
    this.buildFloor = function () {
      this.run.player = starter;
      return originalBuild.call(this);
    };
    try {
      return super.chooseReward(index, replace);
    } finally {
      this.run.player = starter;
      this.buildFloor = originalBuild;
    }
  }
  removeDead() {
    super.removeDead();
    if (!this.run?.companions) return;
    const fallen = this.run.companions.filter((m) => m.hp <= 0);
    if (!fallen.length) return;
    for (const m of fallen) {
      if (m.held && this.run.adventure?.gear?.[m.held] !== undefined)
        this.run.adventure.gear[m.held] = Math.min(
          999,
          this.run.adventure.gear[m.held] + 1,
        );
      this.run.log = this.run.log.filter(
        (e) =>
          e.text !== m.name + " è KO: resta in riserva fino al prossimo piano.",
      );
      this.log(m.name + " è KO e lascia la squadra.", "danger");
      if (this.run.controlUid === m.uid) this.run.controlUid = 0;
    }
    this.run.companions = this.run.companions.filter((m) => m.hp > 0);
  }
  recruit(species, replaceUid = null) {
    const ok = super.recruit(species, replaceUid);
    if (ok && replaceUid === this.run.controlUid) this.run.controlUid = 0;
    return ok;
  }
  controlled() {
    return (
      (!this.run.tactics &&
        this.active().find((m) => m.uid === this.run.controlUid)) ||
      this.run.player
    );
  }
  selectLeader(uid) {
    if (this.run.tactics || this.run.state !== "playing") return false;
    if (!this.active().some((m) => m.uid === uid)) return false;
    this.run.controlUid = uid;
    this.reveal();
    this.sync();
    return true;
  }
  move(dx, dy) {
    if (this.controlled().uid === 0) return super.move(dx, dy);
    if (
      !Number.isInteger(dx) ||
      !Number.isInteger(dy) ||
      Math.max(Math.abs(dx), Math.abs(dy)) !== 1
    )
      return false;
    return this.action({ type: "move", dx, dy });
  }
  useMove(slot, target) {
    const m = this.controlled();
    if (m.uid === 0) return super.useMove(slot, target);
    const s = m.moves[slot];
    if (!s || s.pp <= 0) return false;
    return this.action({ type: "moveAttack", slot, targetUid: target?.uid });
  }
  fieldState() {
    return (this.run.field ??= {
      version: 1,
      energy: 10,
      features: [],
      uses: 0,
    });
  }
  buildFloor() {
    super.buildFloor();
    const r = this.run,
      previous = r.field;
    r.field = {
      version: 1,
      energy: 10,
      uses: previous?.uses || 0,
      features: [],
    };
    const types = [
      "vines",
      "rock",
      "water",
      "boulder",
      "vortex",
      "cascade",
      "fog",
      "ledge",
    ];
    const favored =
      {
        grass: "vines",
        bug: "vines",
        fire: "rock",
        water: "water",
        ice: "cascade",
        electric: "boulder",
        normal: "rock",
        poison: "fog",
        ground: "rock",
        flying: "ledge",
        rock: "boulder",
        psychic: "fog",
        ghost: "fog",
        fighting: "boulder",
        steel: "rock",
        dark: "fog",
        dragon: "ledge",
        fairy: "vines",
      }[this.biome().type] || "rock";
    types.push(...Array(8).fill(favored));
    const candidates = [];
    for (let y = 2; y < r.map.length - 2; y++)
      for (let x = 2; x < r.map[y].length - 2; x++) {
        if (
          !this.floorTile(x, y) ||
          this.occupied(x, y) ||
          same({ x, y }, r.exit) ||
          distance({ x, y }, r.player) < 3
        )
          continue;
        if (
          r.adventure.sites.some((s) => same(s, { x, y })) ||
          r.items.some((s) => same(s, { x, y })) ||
          r.traps.some((s) => same(s, { x, y }))
        )
          continue;
        // Only room interiors: optional features never close a corridor or the main route.
        if (
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].every(([dx, dy]) => this.floorTile(x + dx, y + dy))
        )
          candidates.push({ x, y });
      }
    for (let i = 0; i < Math.min(16, candidates.length); i++) {
      const n = (r.seed + i * 47 + r.floor * 13) >>> 0,
        p = candidates.splice(n % candidates.length, 1)[0];
      r.field.features.push({
        ...p,
        kind: types[(i + r.floor) % types.length],
      });
    }
    for (const f of [...r.field.features].filter((f) => f.kind === "water"))
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        const q = { x: f.x + dx, y: f.y + dy };
        if (
          r.field.features.length < 32 &&
          this.floorTile(q.x, q.y) &&
          !this.featureAt(q) &&
          !this.occupied(q.x, q.y) &&
          !same(q, r.exit) &&
          !r.adventure.sites.some((s) => same(s, q)) &&
          !r.items.some((s) => same(s, q)) &&
          !r.traps.some((s) => same(s, q))
        )
          r.field.features.push({ ...q, kind: "water" });
      }
    this.sync();
  }
  prepareIntent() {
    super.prepareIntent();
    if (this.run.field)
      this.run.field.features = this.run.field.features.filter((f) =>
        this.floorTile(f.x, f.y),
      );
  }
  fieldSkills(m) {
    return this.D.expedition?.species[m.species]?.fieldSkills || [];
  }
  featureAt(p) {
    return this.run.field?.features.find((f) => same(f, p));
  }
  fieldCost(m, key) {
    return m && FIELD[key]
      ? FIELD[key].cost + (this.fieldSkills(m).includes(key) ? 0 : 2)
      : Infinity;
  }
  fieldAvailable(m, key) {
    return (
      this.fieldSkills(m).includes(key) || ["cut", "rockSmash"].includes(key)
    );
  }
  fieldValid(m, key, p, energy = this.fieldState().energy) {
    const d = FIELD[key],
      r = this.run;
    if (
      !d ||
      !m ||
      m.hp <= 0 ||
      !this.active().includes(m) ||
      !this.fieldAvailable(m, key) ||
      energy < this.fieldCost(m, key) ||
      !Number.isInteger(p?.x) ||
      !Number.isInteger(p?.y) ||
      !this.floorTile(p.x, p.y) ||
      !r.seen[p.y]?.[p.x] ||
      distance(m, p) > d.range
    )
      return false;
    if (d.range === 0) return same(m, p);
    if (!distance(m, p)) return false;
    const f = this.featureAt(p);
    if (d.travel) {
      if (this.occupied(p.x, p.y, m)) return false;
      if (key === "fly") return true;
      if (
        key === "dive" &&
        !["water", "ford"].includes(this.featureAt(m)?.kind)
      )
        return false;
      return f?.kind === d.feature;
    }
    if (!this.los(m, p)) return false;
    if (key === "whirlpool")
      return (
        f?.kind === "vortex" ||
        r.enemies.some(
          (e) =>
            same(e, p) &&
            e.hp > 0 &&
            !e.boss &&
            this.canStep(
              e,
              e.x + Math.sign(m.x - e.x),
              e.y + Math.sign(m.y - e.y),
            ),
        )
      );
    if (key === "rockSmash") return ["rock", "boulder"].includes(f?.kind);
    if (key === "strength") {
      const q = {
        x: p.x + Math.sign(p.x - m.x),
        y: p.y + Math.sign(p.y - m.y),
      };
      return (
        f?.kind === "boulder" &&
        this.floorTile(q.x, q.y) &&
        !this.occupied(q.x, q.y) &&
        !this.featureAt(q) &&
        !same(q, r.exit)
      );
    }
    return f?.kind === d.feature;
  }
  fieldTargets(m, key) {
    const d = FIELD[key];
    if (!d) return [];
    const out = [];
    for (let y = m.y - d.range; y <= m.y + d.range; y++)
      for (let x = m.x - d.range; x <= m.x + d.range; x++)
        if (this.fieldValid(m, key, { x, y })) out.push({ x, y });
    return out;
  }
  useField(uid, key, p) {
    const r = this.run,
      m = this.active().find((m) => m.uid === uid);
    if (
      r.state !== "playing" ||
      !this.fieldValid(m, key, p) ||
      r.tactics?.phase === "deploy"
    )
      return false;
    const a = { type: "field", uid, key, x: p.x, y: p.y };
    return r.tactics ? this.plan(uid, a) : this.action(a);
  }
  plan(uid, a) {
    if (a.type !== "field") return super.plan(uid, a);
    const r = this.run,
      m = this.active().find((m) => m.uid === uid);
    const reserved = Object.entries(r.tactics?.orders || {})
      .filter(([id, o]) => +id !== uid && o.type === "field")
      .reduce(
        (n, [id, o]) =>
          n +
          this.fieldCost(
            this.active().find((m) => m.uid === +id),
            o.key,
          ),
        0,
      );
    if (
      r.state !== "playing" ||
      r.tactics?.phase !== "plan" ||
      !this.fieldValid(m, a.key, a, this.fieldState().energy - reserved)
    )
      return false;
    r.tactics.orders[uid] = { type: "field", uid, key: a.key, x: a.x, y: a.y };
    this.sync();
    return true;
  }
  orderPreview() {
    const list = super.orderPreview();
    for (const o of list) {
      const a = this.run.tactics.orders[o.uid];
      if (a?.type === "field") {
        o.end = { x: a.x, y: a.y };
        if (FIELD[a.key]?.travel) o.to = o.end;
        o.conflict = !this.fieldValid(
          this.active().find((m) => m.uid === o.uid),
          a.key,
          a,
        );
      }
    }
    for (const o of list)
      if (o.to && list.some((p) => p.uid !== o.uid && p.to && same(p.to, o.to)))
        o.conflict = true;
    return list;
  }
  perform(m, a) {
    if (
      !this.run.tactics &&
      m.uid === 0 &&
      this.run.controlUid &&
      !["item", "interact", "openChest"].includes(a.type)
    ) {
      const selected = this.active().find((t) => t.uid === this.run.controlUid);
      if (selected) {
        this.fieldActor = selected.uid;
        return super.perform(selected, a);
      }
    }
    if (a.type === "openChest") {
      const chest = this.run.items.find(
        (i) => i.type === "chest" && i.x === a.x && i.y === a.y,
      );
      if (chest && distance(m, chest) <= 1) {
        const pos = { x: m.x, y: m.y };
        try {
          Object.assign(m, { x: chest.x, y: chest.y });
          this.pickup();
        } finally {
          Object.assign(m, pos);
        }
      }
      return;
    }
    if (a.type !== "field") return super.perform(m, a);
    const actor = this.run.tactics
      ? m
      : this.active().find((t) => t.uid === a.uid);
    if (!this.fieldValid(actor, a.key, a)) {
      this.log("La tecnica non è più eseguibile: energia conservata.");
      return;
    }
    if (!this.run.tactics && actor.uid !== m.uid)
      super.perform(m, { type: "wait" });
    this.regenerate(actor);
    if (this.statusBlock(actor)) return;
    if (!this.run.tactics) this.fieldActor = actor.uid;
    const d = FIELD[a.key],
      s = this.fieldState(),
      f = this.featureAt(a);
    s.energy -= this.fieldCost(actor, a.key);
    s.uses++;
    this.effect("attack", actor, a, {
      uid: actor.uid,
      actor: actor.name,
      move: d.name,
      slug: a.key === "rockSmash" ? "rock-smash" : a.key,
      element: d.element,
    });
    if (d.travel) {
      const from = { x: actor.x, y: actor.y };
      Object.assign(actor, { x: a.x, y: a.y });
      this.effect("step", from, actor, { uid: actor.uid });
      if (["dive", "waterfall", "rockClimb"].includes(a.key))
        actor.protectUntil = this.run.turn;
      if (a.key === "surf") f.kind = "ford";
      if (actor.uid === 0) {
        this.pickup();
        this.triggerTrap();
      }
      this.reveal();
    } else if (a.key === "strength") {
      f.x += Math.sign(a.x - actor.x);
      f.y += Math.sign(a.y - actor.y);
    } else if (["cut", "rockSmash"].includes(a.key)) {
      if (f.kind !== "boulder")
        this.run.adventure.coins = Math.min(
          999999,
          this.run.adventure.coins + 12,
        );
      s.features = s.features.filter((t) => t !== f);
    } else if (a.key === "flash" || a.key === "defog") {
      const radius = a.key === "flash" ? 5 : 4;
      s.features = s.features.filter(
        (t) =>
          !(
            distance(t, actor) <= radius &&
            ["fog", ...(a.key === "defog" ? ["vortex"] : [])].includes(t.kind)
          ),
      );
      if (a.key === "defog" && this.run.adventure.weather === "fog")
        this.run.adventure.weather = "clear";
      if (a.key === "flash")
        for (let y = actor.y - radius; y <= actor.y + radius; y++)
          for (let x = actor.x - radius; x <= actor.x + radius; x++)
            if (
              this.run.seen[y]?.[x] !== undefined &&
              this.los(actor, { x, y })
            )
              this.run.seen[y][x] = true;
    } else if (a.key === "whirlpool") {
      if (f?.kind === "vortex") s.features = s.features.filter((t) => t !== f);
      else {
        const e = this.run.enemies.find((e) => same(e, a)),
          x = e.x + Math.sign(actor.x - e.x),
          y = e.y + Math.sign(actor.y - e.y);
        if (this.canStep(e, x, y)) {
          const from = { x: e.x, y: e.y };
          e.x = x;
          e.y = y;
          this.effect("step", from, e, { uid: e.uid });
        }
      }
    }
    this.effect("fieldChange", actor, a, { field: structuredClone(s) });
    this.log(`${actor.name}: ${d.name}! Energia ${s.energy}/10.`);
  }
  regenerate(m) {
    if (this.fieldFollowing && this.fieldActor === m.uid) return;
    return super.regenerate(m);
  }
  statusBlock(m) {
    if (this.fieldActor === m.uid && this.fieldFollowing) return true;
    return super.statusBlock(m);
  }
  alliesTurn(fighting) {
    this.fieldFollowing = true;
    try {
      const result = super.alliesTurn(fighting);
      const leader = this.run.player,
        controlled = this.controlled();
      if (controlled.uid !== 0 && leader.hp > 0) {
        this.regenerate(leader);
        if (!this.statusBlock(leader)) {
          const foe =
            fighting &&
            this.run.enemies.find(
              (e) =>
                e.hp > 0 && distance(e, leader) <= 2 && this.los(leader, e),
            );
          if (foe) {
            const best = this.bestMove(leader, foe);
            if (best) {
              best.s.pp--;
              this.attack(leader, foe, best.m);
            }
          } else if (distance(leader, controlled) > 1) {
            const step = this.pathStep(leader, controlled);
            if (step) this.walkActor(leader, step.x, step.y);
          }
        }
      }
      return result;
    } finally {
      this.fieldFollowing = false;
    }
  }
  action(a) {
    try {
      const before = this.run.turn,
        ok = super.action(a);
      if (ok && this.run.turn > before && this.run.turn % 6 === 0) {
        const s = this.fieldState();
        s.energy = Math.min(10, s.energy + 1);
        this.sync();
      }
      return ok;
    } finally {
      this.fieldActor = null;
    }
  }
  matchup(a, t, m) {
    const previous = this.fieldCover;
    this.fieldCover = !!this.run.field?.features.some(
      (f) => f.kind === "boulder" && distance(f, t) <= 1,
    );
    try {
      return super.matchup(a, t, m);
    } finally {
      this.fieldCover = previous;
    }
  }
  damageResult(cfg) {
    const out = super.damageResult(cfg);
    if (this.fieldCover && out.damage > 0 && !out.healed)
      out.damage = Math.max(1, Math.floor(out.damage * 0.75));
    return out;
  }
  attack(a, t, m, ...args) {
    const previous = this.fieldCover;
    this.fieldCover = !!this.run.field?.features.some(
      (f) => f.kind === "boulder" && distance(f, t) <= 1,
    );
    try {
      return super.attack(a, t, m, ...args);
    } finally {
      this.fieldCover = previous;
    }
  }
  los(a, b) {
    if (!super.los(a, b)) return false;
    return (
      distance(a, b) <= 2 ||
      !this.run?.field?.features.some(
        (f) => f.kind === "fog" && (distance(f, a) <= 1 || distance(f, b) <= 1),
      )
    );
  }
  visible(x, y) {
    const p = this.controlled();
    if (distance(p, { x, y }) > 8 || !this.los(p, { x, y })) return false;
    return (
      distance(p, { x, y }) <= 2 ||
      !this.run.field?.features.some(
        (f) => f.kind === "fog" && distance(f, { x, y }) <= 1,
      )
    );
  }
  reveal() {
    const p = this.controlled(),
      r = this.run;
    for (let y = Math.max(0, p.y - 8); y < Math.min(r.h, p.y + 9); y++)
      for (let x = Math.max(0, p.x - 8); x < Math.min(r.w, p.x + 9); x++)
        if (this.visible(x, y)) r.seen[y][x] = true;
  }
  walkActor(m, x, y) {
    if (m.slowUntil >= this.run.turn) return false;
    const f = this.featureAt({ x, y }),
      ok = super.walkActor(m, x, y);
    if (
      m.x === x &&
      m.y === y &&
      ["vines", "water", "vortex"].includes(f?.kind)
    ) {
      m.slowUntil = this.run.turn + 1;
      if (m.uid === 0) this.log(FIELD_HINTS[f.kind]);
    }
    return ok;
  }
  validateRun(r) {
    const candidate = structuredClone(r);
    for (const [uid, o] of Object.entries(candidate.tactics?.orders || {}))
      if (o.type === "field") {
        if (
          !FIELD[o.key] ||
          !Number.isInteger(o.x) ||
          !Number.isInteger(o.y) ||
          !r.map[o.y] ||
          r.map[o.y][o.x] !== 0 ||
          o.uid !== +uid
        )
          throw Error("Ordine MN non valido.");
        candidate.tactics.orders[uid] = { type: "wait" };
      }
    super.validateRun(candidate);
    if (
      r.controlUid !== undefined &&
      ![0, ...(r.companions || []).map((m) => m.uid)].includes(r.controlUid)
    )
      throw Error("Pokémon controllato non valido.");
    if (r.field) {
      const s = r.field;
      if (
        s.version !== 1 ||
        !Number.isInteger(s.energy) ||
        s.energy < 0 ||
        s.energy > 10 ||
        !Number.isSafeInteger(s.uses) ||
        s.uses < 0 ||
        !Array.isArray(s.features) ||
        s.features.length > 32 ||
        s.features.some(
          (f) =>
            !FEATURES[f.kind] ||
            !Number.isInteger(f.x) ||
            !Number.isInteger(f.y) ||
            r.map[f.y]?.[f.x] !== 0,
        ) ||
        new Set(s.features.map((f) => `${f.x},${f.y}`)).size !==
          s.features.length
      )
        throw Error("Ambiente MN non valido.");
    }
  }
  restore(data) {
    if (data?.run) this.validateRun(data.run);
    const copy = structuredClone(data),
      orders = copy.run?.tactics?.orders;
    if (orders)
      copy.run.tactics.orders = Object.fromEntries(
        Object.entries(orders).map(([id, o]) => [
          id,
          o.type === "field" ? { type: "wait" } : o,
        ]),
      );
    super.restore(copy);
    if (this.run) {
      this.fieldState();
      if (orders) this.run.tactics.orders = orders;
    }
  }
}
