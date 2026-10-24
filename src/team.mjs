import { Game as SoloGame, DIRS, BIOMES, rules } from "./game.mjs";
export const TYPE_NAMES = {
  normal: "Normale",
  fire: "Fuoco",
  water: "Acqua",
  grass: "Erba",
  electric: "Elettro",
  ice: "Ghiaccio",
  fighting: "Lotta",
  poison: "Veleno",
  ground: "Terra",
  flying: "Volante",
  psychic: "Psico",
  bug: "Coleottero",
  rock: "Roccia",
  ghost: "Spettro",
  dragon: "Drago",
  dark: "Buio",
  steel: "Acciaio",
  fairy: "Folletto",
};
export const GUARDIANS = [
  ["grass", 252, "Bosco dei germogli", "#38583c"],
  ["fire", 4, "Caldera ardente", "#694036"],
  ["water", 7, "Caverna delle maree", "#315c78"],
  ["electric", 25, "Grotte del tuono", "#6a6034"],
  ["normal", 133, "Prateria antica", "#686349"],
  ["poison", 41, "Palude velenosa", "#59436a"],
  ["ground", 95, "Deserto sepolto", "#78603e"],
  ["flying", 149, "Vette dei venti", "#567488"],
  ["bug", 12, "Bosco dei bozzoli", "#536735"],
  ["rock", 248, "Cava di granito", "#625a4e"],
  ["psychic", 280, "Santuario dei sogni", "#784b75"],
  ["ice", 87, "Ghiacciaio silente", "#53798c"],
  ["ghost", 94, "Rovine degli spiriti", "#473e65"],
  ["fighting", 448, "Arena dei valorosi", "#75473b"],
  ["steel", 304, "Forgia dimenticata", "#566575"],
  ["dark", 359, "Abisso della notte", "#343b50"],
  ["dragon", 445, "Cima dei draghi", "#4b5082"],
  ["fairy", 36, "Giardino lunare", "#7b5575"],
].map(([type, species, name, floor]) => ({
  type,
  species,
  name,
  floor,
  wall: "#19232d",
  edge: floor,
  accent: "#dfd8a0",
}));
const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const guardianFor = (floor) =>
  GUARDIANS[Number(((BigInt(floor) - 1n) / 5n) % 18n)];
export class Game extends SoloGame {
  constructor(data, core, meta) {
    const copy = {
      ...data,
      pokemon: Object.fromEntries(
        Object.entries(data.pokemon).map(([id, p]) => [
          id,
          { ...p, starter: true },
        ]),
      ),
    };
    super(copy, core, meta);
    this.originalStarters = [...data.starterIds];
    this.meta.recruited = this.cleanUnlocks(meta?.recruited);
  }
  cleanUnlocks(ids) {
    if (ids === undefined) return [];
    if (
      !Array.isArray(ids) ||
      ids.some((id) => !Number.isInteger(id) || !this.D.pokemon[id])
    )
      throw Error("Starter sbloccati non validi.");
    return [...new Set(ids)];
  }
  makeMon(species, level, boss = false) {
    const m = super.makeMon(species, level, boss);
    const ids = [
      ...new Set(
        this.D.pokemon[species].levelMoves
          .filter((x) => x.level <= m.level)
          .map((x) => x.move),
      ),
    ].slice(-4);
    m.moves = (ids.length ? ids : this.known(species).slice(0, 1)).map(
      (id) => ({ id, pp: this.D.moves[id].pp }),
    );
    return m;
  }
  starterIds() {
    return [...new Set([...this.originalStarters, ...this.meta.recruited])];
  }
  known(species) {
    const a = super.known(species);
    return a.length ? a : this.D.pokemon[species].learnset.slice(0, 1);
  }
  start(species, seed, loadout) {
    if (!this.starterIds().includes(species))
      throw Error("Questo Pokémon non è ancora stato reclutato.");
    const r = super.start(species, seed, loadout);
    r.mechanicsVersion = 6;
    return r;
  }
  visible(x, y) {
    return this.run?.tactics ? this.floorTile(x, y) : super.visible(x, y);
  }
  members() {
    return [this.run.player, ...(this.run.companions || [])];
  }
  active() {
    return this.members().filter((m) => m.hp > 0 && (m.uid === 0 || m.active));
  }
  isAlly(m) {
    return (
      !!m &&
      (m.uid === 0 || (this.run.companions || []).some((a) => a.uid === m.uid))
    );
  }
  occupied(x, y, except) {
    return [...this.active(), ...this.run.enemies].find(
      (m) => m !== except && m.hp > 0 && m.x === x && m.y === y,
    );
  }
  biome() {
    return guardianFor(this.run.floor);
  }
  buildFloor() {
    const r = this.run;
    r.companions ??= [];
    r.teamUid ??= 1000000;
    // Hide companions from collision checks while the new map is generated.
    const deployed = r.companions.filter((m) => m.active).map((m) => m.uid);
    for (const m of r.companions) m.active = false;
    r.tactics = null;
    super.buildFloor();
    r.floorKOs = [];
    r.recruitmentDone = false;
    r.tactics = null;
    const theme = this.biome(),
      boss = BigInt(r.floor) % 5n === 0n;
    if (boss) {
      const old = r.enemies[0];
      const e = this.makeMon(
        theme.species,
        Math.min(
          100,
          Number(BigInt(r.floor) > 96n ? 96n : BigInt(r.floor)) + 4,
        ),
        true,
      );
      const themed = this.D.pokemon[e.species].learnset.find(
        (id) => this.D.moves[id].type === theme.type,
      );
      if (
        themed &&
        !e.moves.some((s) => this.D.moves[s.id].type === theme.type)
      ) {
        if (e.moves.length === 4) e.moves.pop();
        e.moves.push({ id: themed, pp: this.D.moves[themed].pp });
      }
      Object.assign(e, { x: old.x, y: old.y, uid: old.uid, awake: true });
      // Boss durability grows with each completed circuit, within save limits.
      const tier = Number(
        (BigInt(r.floor) - 1n) / 90n > 20n ? 20n : (BigInt(r.floor) - 1n) / 90n,
      );
      e.maxHp = Math.min(
        999,
        e.maxHp +
          20 +
          Number(
            (BigInt(r.floor) - 1n) / 5n > 100n
              ? 100n
              : (BigInt(r.floor) - 1n) / 5n,
          ) *
            4 +
          tier * 20,
      );
      e.hp = e.maxHp;
      r.enemies = [e];
      r.tactics = { phase: "deploy", orders: {} };
    } else {
      const pool = Object.values(this.D.pokemon).filter(
        (p) => p.types.includes(theme.type) && !p.minEncounterLevel,
      );
      for (let i = 0; i < r.enemies.length; i++) {
        if (pool.length && i % 4 !== 3) {
          const old = r.enemies[i],
            e = this.makeMon(this.rng.pick(pool).id, old.level);
          Object.assign(e, { x: old.x, y: old.y, uid: old.uid, awake: false });
          r.enemies[i] = e;
        }
      }
    }
    for (const m of r.companions) {
      m.x = r.player.x;
      m.y = r.player.y;
      if (deployed.includes(m.uid) && m.hp > 0) {
        const pos = this.nearFree(r.player);
        if (pos) {
          Object.assign(m, pos);
          m.active = true;
        }
      }
    }
    if (r.tactics) r.seen = r.map.map((row) => row.map((v) => v === 0));
    this.reveal();
    this.sync();
  }
  nearFree(p) {
    const r = this.run;
    for (let radius = 1; radius < Math.max(r.w, r.h); radius++)
      for (let y = p.y - radius; y <= p.y + radius; y++)
        for (let x = p.x - radius; x <= p.x + radius; x++)
          if (
            distance(p, { x, y }) === radius &&
            this.floorTile(x, y) &&
            !this.occupied(x, y)
          )
            return { x, y };
    return null;
  }
  deploymentCells() {
    const r = this.run;
    let bottom = 0;
    for (let y = 0; y < r.h; y++) if (r.map[y].includes(0)) bottom = y;
    const cells = [];
    for (let y = bottom - 2; y <= bottom; y++)
      for (let x = 0; x < r.w; x++)
        if (this.floorTile(x, y)) cells.push({ x, y });
    return cells;
  }
  deploy(uid, x, y) {
    const r = this.run,
      m = this.active().find((m) => m.uid === uid);
    if (
      r.state !== "playing" ||
      r.tactics?.phase !== "deploy" ||
      !m ||
      !this.deploymentCells().some((p) => p.x === x && p.y === y) ||
      this.occupied(x, y, m)
    )
      return false;
    Object.assign(m, { x, y });
    this.sync();
    return true;
  }
  beginBoss() {
    const r = this.run;
    if (
      r.tactics?.phase !== "deploy" ||
      !this.active().every((m) =>
        this.deploymentCells().some((p) => p.x === m.x && p.y === m.y),
      )
    )
      return false;
    r.tactics.phase = "plan";
    r.tactics.orders = {};
    return true;
  }
  pathStep(e, target) {
    if (e.uid !== 0) return super.pathStep(e, target);
    const queue = [{ x: e.x, y: e.y, first: null }],
      seen = new Set([e.x + "," + e.y]);
    for (let i = 0; i < queue.length && i < 1400; i++) {
      const current = queue[i];
      for (const [dx, dy] of DIRS) {
        const x = current.x + dx,
          y = current.y + dy,
          key = x + "," + y;
        if (
          seen.has(key) ||
          !this.floorTile(x, y) ||
          (dx &&
            dy &&
            (!this.floorTile(current.x + dx, current.y) ||
              !this.floorTile(current.x, current.y + dy)))
        )
          continue;
        const occupant = this.occupied(x, y, e);
        if (occupant && occupant !== target && !this.isAlly(occupant)) continue;
        const first = current.first || { x, y };
        if (x === target.x && y === target.y) return first;
        seen.add(key);
        queue.push({ x, y, first });
      }
    }
    return null;
  }
  move(dx, dy) {
    const p = this.run.player,
      t = this.occupied(p.x + dx, p.y + dy, p);
    if (t && this.isAlly(t) && !this.run.tactics) {
      return this.action({ type: "exchange", uid: t.uid });
    }
    return super.move(dx, dy);
  }
  configMon(m) {
    const c = super.configMon(m);
    c.is_team_member = this.isAlly(m);
    const types = this.D.pokemon[m.species].types;
    c.type1 = types[0] === "fairy" ? "None" : types[0];
    c.type2 = types[1] || "None";
    return c;
  }
  damageResult(cfg) {
    // Explicit post-EoS extension. Swift supplies the EoS base damage for
    // Magibrillio; only its type matchup is replaced, preserving RNG calls.
    const fairyMove = cfg.move.id === "Swift";
    let factor = 1;
    let adapted = cfg;
    if (fairyMove) {
      for (const type of [cfg.defender.type1, cfg.defender.type2])
        factor *= ["dragon", "fighting", "dark"].includes(type)
          ? 1.4
          : ["fire", "poison", "steel"].includes(type)
            ? 0.7
            : 1;
      adapted = structuredClone(cfg);
      adapted.defender.type1 = "None";
      adapted.defender.type2 = "None";
      if (cfg.attacker.species === "Clefable")
        adapted.attacker.type1 = "normal";
    } else if (
      cfg.defender.type1 === "None" &&
      cfg.defender.species === "Clefable"
    ) {
      const type = Object.values(this.D.moves).find(
        (m) => m.eosName === cfg.move.id,
      )?.type;
      factor = ["poison", "steel"].includes(type)
        ? 1.4
        : ["fighting", "bug", "dark"].includes(type)
          ? 0.7
          : type === "dragon"
            ? 0.5
            : 1;
    }
    const result = super.damageResult(adapted);
    if (fairyMove || cfg.defender.species === "Clefable") {
      if (result.damage > 0 && !result.healed)
        result.damage = Math.max(1, Math.floor(result.damage * factor));
      result.matchup = factor > 1 ? 3 : factor < 1 ? 1 : 2;
    }
    return result;
  }
  attack(a, t, m, area = false) {
    if (this.isAlly(a) === this.isAlly(t)) return;
    if (m && !area && ["room", "nearby"].includes(rules(m).shape)) {
      for (const target of [
        ...(this.isAlly(a) ? this.run.enemies : this.active()),
      ])
        if (this.run.player.hp > 0 && this.validTarget(a, target, m)) {
          super.attack(a, target, m, true);
          if (this.run.player.hp <= 0) this.end();
        }
      return;
    }
    super.attack(a, t, m, true);
    if (this.run.player.hp <= 0) this.end();
  }
  bestMove(a, t) {
    return a.moves
      .map((s, slot) => ({ s, slot, m: this.D.moves[s.id] }))
      .filter((o) => o.s.pp > 0 && this.validTarget(a, t, o.m))
      .map((o) => {
        const result = this.damageResult({
          move: { id: o.m.eosName, pp: o.s.pp - 1 },
          attacker: this.configMon(a),
          defender: this.configMon(t),
          dungeon: { weather: "clear" },
          misc: { version: "NA" },
          rngState: 123456789,
        });
        return {
          ...o,
          score:
            (result.healed ? -10000 : result.matchup * 1000) +
            (result.damage || 0),
        };
      })
      .sort((a, b) => b.score - a.score)[0];
  }
  walkActor(m, x, y) {
    if (!this.canStep(m, x, y)) return false;
    const from = { x: m.x, y: m.y };
    this.face(m, x - m.x, y - m.y);
    Object.assign(m, { x, y });
    this.effect("step", from, m, { uid: m.uid });
    if (m.uid === 0) {
      this.pickup();
      this.triggerTrap();
    }
    return true;
  }
  perform(m, a) {
    if (m.hp <= 0) return;
    this.regenerate(m);
    if (this.statusBlock(m)) return;
    if (a.direction) this.face(m, ...a.direction);
    if (a.type === "exchange" && m.uid === 0) {
      const ally = this.run.companions.find((c) => c.uid === a.uid && c.active);
      if (ally && distance(m, ally) === 1) {
        const from = { x: m.x, y: m.y },
          to = { x: ally.x, y: ally.y };
        Object.assign(m, to);
        Object.assign(ally, from);
        this.effect("step", from, m, { uid: 0 });
        this.effect("step", to, ally, { uid: ally.uid });
        this.pickup();
        this.triggerTrap();
      }
    }
    if (a.type === "move") this.walkActor(m, m.x + a.dx, m.y + a.dy);
    if (a.type === "attack" || a.type === "moveAttack") {
      const slot = a.type === "moveAttack" ? m.moves[a.slot] : null;
      if (a.type === "moveAttack" && (!slot || slot.pp <= 0)) return;
      const move = slot ? this.D.moves[slot.id] : null;
      let target =
        a.targetUid !== undefined
          ? this.run.enemies.find((t) => t.uid === a.targetUid)
          : a.target;
      if (!target)
        target =
          move && ["room", "nearby"].includes(rules(move).shape)
            ? this.run.enemies.find((t) => this.validTarget(m, t, move))
            : this.findTarget(m, DIRS[m.facing], move ? rules(move).range : 1);
      if (slot) slot.pp--;
      if (
        target &&
        !this.isAlly(target) &&
        (move
          ? this.validTarget(m, target, move)
          : distance(m, target) === 1 &&
            this.canStep(m, target.x, target.y, true))
      )
        this.attack(m, target, move);
      else {
        this.effect("attack", m, m, {
          uid: m.uid,
          actor: m.name,
          move: move?.name || "Attacco",
          slug: move?.slug || "pound",
        });
        this.log(m.name + ": nessun bersaglio.");
      }
    }
    if (a.type === "item" && m.uid === 0) this.applyItem(a.item);
  }
  plan(uid, a) {
    const r = this.run,
      m = this.active().find((m) => m.uid === uid);
    if (
      r.state !== "playing" ||
      r.tactics?.phase !== "plan" ||
      !m ||
      !["move", "attack", "moveAttack", "wait", "item"].includes(a.type)
    )
      return false;
    if (
      a.type === "move" &&
      (!DIRS.some((d) => d[0] === a.dx && d[1] === a.dy) ||
        !this.floorTile(m.x + a.dx, m.y + a.dy))
    )
      return false;
    if (
      a.type === "moveAttack" &&
      (!Number.isInteger(a.slot) || !m.moves[a.slot] || m.moves[a.slot].pp <= 0)
    )
      return false;
    if (a.type === "item" && (uid !== 0 || !this.run.bag[a.item])) return false;
    if (
      a.direction &&
      (!Array.isArray(a.direction) ||
        !DIRS.some((d) => d[0] === a.direction[0] && d[1] === a.direction[1]))
    )
      return false;
    const order = { ...a };
    if (a.target) {
      order.targetUid = a.target.uid;
      delete order.target;
    }
    r.tactics.orders[uid] = structuredClone(order);
    this.sync();
    return true;
  }
  resolveOrders() {
    const r = this.run;
    if (
      r.tactics?.phase !== "plan" ||
      !this.active().every((m) => r.tactics.orders[m.uid])
    )
      return false;
    r.tactics.phase = "resolve";
    return this.action({ type: "orders" });
  }
  action(a) {
    const r = this.run;
    if (!r || r.state !== "playing") return false;
    if (r.tactics?.phase === "deploy" && !this.swapping) return false;
    if (r.tactics?.phase === "plan" && !this.swapping) return this.plan(0, a);
    this.events = [];
    if (this.pendingSwap) {
      const swap = this.pendingSwap;
      this.effect("teamSwap", swap.position, swap.position, {
        uid: swap.inUid ?? swap.outUid,
        ...swap,
      });
      this.pendingSwap = null;
    }
    r.turn++;
    if (!this.swapping) {
      if (a.type === "orders") {
        for (const m of this.active()) {
          this.perform(m, r.tactics.orders[m.uid] || { type: "wait" });
          this.removeDead();
          if (r.player.hp <= 0) break;
        }
      } else {
        this.perform(r.player, a);
        this.removeDead();
        if (r.player.hp > 0)
          this.alliesTurn(["attack", "moveAttack"].includes(a.type));
      }
    }
    this.removeDead();
    if (r.player.hp > 0) this.enemiesTurn();
    for (const m of this.active()) this.statusTick(m);
    r.belly = Math.max(0, r.belly - 0x199a / 65536);
    if (r.belly === 0) r.player.hp--;
    this.removeDead();
    if (r.player.hp <= 0) this.end();
    if (r.tactics) {
      r.tactics.orders = {};
      r.tactics.phase = r.enemies.some((e) => e.boss) ? "plan" : "won";
    }
    this.reveal();
    this.sync();
    return true;
  }
  alliesTurn(fighting) {
    const p = this.run.player;
    for (const a of this.active().filter((m) => m.uid !== 0)) {
      this.regenerate(a);
      if (this.statusBlock(a)) continue;
      const enemies = this.run.enemies.filter(
        (e) =>
          e.hp > 0 &&
          this.los(a, e) &&
          (distance(a, e) <= 1 ||
            distance(p, e) <= 2 ||
            (fighting && distance(p, e) <= 10)),
      );
      const t = enemies.sort((x, y) => distance(a, x) - distance(a, y))[0];
      if (t) {
        const best = this.bestMove(a, t);
        if (best) {
          best.s.pp--;
          this.attack(a, t, best.m);
        } else if (distance(a, t) === 1 && this.canStep(a, t.x, t.y, true))
          this.attack(a, t, null);
        else {
          const pos = this.pathStep(a, t);
          if (pos) this.walkActor(a, pos.x, pos.y);
        }
      } else if (distance(a, p) > 1) {
        const pos =
          this.pathStep(a, p) ||
          [...this.run.enemies]
            .filter((e) => e.hp > 0)
            .sort((x, y) => distance(a, x) - distance(a, y))
            .map((e) => this.pathStep(a, e))
            .find(Boolean);
        if (pos) this.walkActor(a, pos.x, pos.y);
      }
      this.removeDead();
    }
  }
  enemiesTurn() {
    for (const e of [...this.run.enemies]) {
      if (e.hp <= 0 || this.run.player.hp <= 0) break;
      const targets = this.active().sort(
        (a, b) => distance(e, a) - distance(e, b),
      );
      const t = targets[0];
      if (!t) break;
      if (distance(e, t) <= 7 && this.los(e, t)) e.awake = true;
      if (!e.awake) continue;
      if (!this.statusBlock(e)) {
        const available = e.moves
          .map((s, slot) => ({ s, slot, m: this.D.moves[s.id] }))
          .filter((o) => o.s.pp > 0 && this.validTarget(e, t, o.m));
        const best = e.boss
          ? this.bestMove(e, t)
          : available.length && this.rng.next() < 0.75
            ? this.rng.pick(available)
            : null;
        if (best) {
          best.s.pp--;
          this.attack(e, t, best.m);
        } else if (distance(e, t) === 1 && this.canStep(e, t.x, t.y, true))
          this.attack(e, t, null);
        else {
          const step = this.pathStep(e, t);
          if (step) this.walkActor(e, step.x, step.y);
        }
      }
      this.statusTick(e);
      this.removeDead();
    }
  }
  removeDead() {
    const r = this.run;
    for (const e of r.enemies.filter((e) => e.hp <= 0)) {
      r.floorKOs ??= [];
      const old = r.floorKOs.find((m) => m.species === e.species);
      if (!old) r.floorKOs.push({ species: e.species, level: e.level });
      else old.level = Math.max(old.level, e.level);
    }
    const starterFell = r.player.hp <= 0;
    super.removeDead();
    if (starterFell) {
      r.player.hp = 0;
      this.end();
    }
    for (const m of r.companions || [])
      if (m.hp <= 0) {
        m.hp = 0;
        if (m.active) {
          m.active = false;
          this.effect("defeat", m, m, { uid: m.uid, mon: structuredClone(m) });
          this.log(
            m.name + " è KO: resta in riserva fino al prossimo piano.",
            "danger",
          );
        }
      }
  }
  recruit(species, replaceUid = null) {
    const r = this.run;
    if (r.state !== "reward" || r.recruitmentDone) return false;
    if (species === null) {
      r.recruitmentDone = true;
      return true;
    }
    const offer = r.floorKOs.find((e) => e.species === species);
    if (!offer) return false;
    if (
      r.companions.length === 5 &&
      !r.companions.some((m) => m.uid === replaceUid)
    )
      return false;
    if (replaceUid === 0) return false;
    const old = r.companions.find((m) => m.uid === replaceUid);
    if (old) {
      r.companions = r.companions.filter((m) => m !== old);
      this.spendSwapTurn();
      if (r.state === "dead") return true;
    }
    const m = this.makeMon(species, offer.level);
    m.moves = [
      ...new Set(
        this.D.pokemon[species].levelMoves
          .filter((x) => x.level <= m.level)
          .map((x) => x.move),
      ),
    ]
      .slice(-4)
      .map((id) => ({ id, pp: this.D.moves[id].pp }));
    if (!m.moves.length)
      m.moves = this.known(species)
        .slice(0, 4)
        .map((id) => ({ id, pp: this.D.moves[id].pp }));
    Object.assign(m, {
      uid: r.teamUid++,
      active: false,
      x: r.player.x,
      y: r.player.y,
    });
    r.companions.push(m);
    if (this.active().length < 3) {
      const pos = this.nearFree(r.player);
      if (pos) {
        Object.assign(m, pos);
        m.active = true;
      }
    }
    this.meta.recruited = [...new Set([...this.meta.recruited, species])];
    r.recruitmentDone = true;
    this.log(
      m.name + " si unisce alla squadra ed è disponibile come starter!",
      "gold",
    );
    this.sync();
    return true;
  }
  spendSwapTurn() {
    const state = this.run.state;
    this.run.state = "playing";
    this.swapping = true;
    try {
      this.action({ type: "wait" });
    } finally {
      this.swapping = false;
    }
    if (this.run.state !== "dead") this.run.state = state;
  }
  withdraw(uid) {
    const r = this.run,
      m = r.companions.find((m) => m.uid === uid && m.active);
    if (r.state !== "playing" || uid === 0 || !m) return false;
    const deploy = r.tactics?.phase === "deploy";
    m.active = false;
    this.pendingSwap = {
      outUid: uid,
      inUid: null,
      position: { x: m.x, y: m.y },
    };
    this.spendSwapTurn();
    if (deploy && r.state === "playing") r.tactics.phase = "deploy";
    return true;
  }
  substitute(outUid, inUid) {
    const r = this.run;
    if (r.state !== "playing" || outUid === 0) return false;
    const incoming = r.companions.find(
        (m) => m.uid === inUid && !m.active && m.hp > 0,
      ),
      out = r.companions.find((m) => m.uid === outUid && m.active);
    if (
      !incoming ||
      (!out && this.active().length >= 3) ||
      (outUid !== null && !out)
    )
      return false;
    const pos = out ? { x: out.x, y: out.y } : this.nearFree(r.player);
    if (!pos) return false;
    if (out) out.active = false;
    Object.assign(incoming, pos, { active: true });
    this.pendingSwap = {
      outUid: out?.uid ?? null,
      inUid: incoming.uid,
      position: pos,
    };
    const deployment = r.tactics?.phase === "deploy";
    this.spendSwapTurn();
    if (deployment && r.state === "playing") r.tactics.phase = "deploy";
    return true;
  }
  chooseReward(index, replace = 0) {
    if (!this.run.recruitmentDone) return false;
    for (const m of this.run.companions) {
      if (m.hp === 0) {
        m.hp = m.maxHp;
        m.statuses = {};
      }
    }
    return super.chooseReward(index, replace);
  }
  validateRun(r) {
    if (!r || ![3, 4, 5, 6].includes(r.mechanicsVersion))
      throw Error("Versione squadra non valida.");
    super.validateRun({
      ...r,
      mechanicsVersion: Math.min(5, r.mechanicsVersion),
    });
    if (r.mechanicsVersion < 6) return;
    if (
      !Array.isArray(r.companions) ||
      r.companions.length > 5 ||
      !Number.isInteger(r.teamUid) ||
      r.teamUid < 1000000 ||
      typeof r.recruitmentDone !== "boolean" ||
      !Array.isArray(r.floorKOs) ||
      r.floorKOs.length > Object.keys(this.D.pokemon).length
    )
      throw Error("Squadra non valida.");
    const ids = new Set([0, ...r.enemies.map((m) => m.uid)]),
      cells = new Set([r.player, ...r.enemies].map((m) => m.x + "," + m.y));
    let active = 1;
    for (const m of r.companions) {
      if (
        !m ||
        typeof m.active !== "boolean" ||
        m.uid < 1000000 ||
        m.uid >= r.teamUid ||
        ids.has(m.uid) ||
        m.boss
      )
        throw Error("Compagno non valido.");
      ids.add(m.uid);
      const copy = structuredClone(r);
      copy.mechanicsVersion = 5;
      copy.enemies = [m];
      if (m.x === r.player.x && m.y === r.player.y) {
        copy.enemies = [{ ...m, x: r.exit.x, y: r.exit.y }];
        if (r.exit.x === r.player.x && r.exit.y === r.player.y) {
          const cell = r.map.flatMap((row, y) =>
            row.flatMap((v, x) =>
              v === 0 && (x !== r.player.x || y !== r.player.y)
                ? [{ x, y }]
                : [],
            ),
          )[0];
          Object.assign(copy.enemies[0], cell);
        }
      }
      super.validateRun(copy);
      if (m.active) {
        active++;
        const key = m.x + "," + m.y;
        if (m.hp <= 0 || cells.has(key))
          throw Error("Schieramento non valido.");
        cells.add(key);
      }
    }
    if (active > 3) throw Error("Massimo tre Pokémon in campo.");
    const species = new Set();
    for (const m of r.floorKOs) {
      if (
        !this.D.pokemon[m.species] ||
        species.has(m.species) ||
        !Number.isInteger(m.level) ||
        m.level < 1 ||
        m.level > 100
      )
        throw Error("Reclutamento non valido.");
      species.add(m.species);
    }
    if (BigInt(r.floor) % 5n === 0n && r.tactics === null)
      throw Error("Ordini del boss mancanti.");
    if (r.tactics !== null) {
      if (
        !r.tactics ||
        !["deploy", "plan", "won"].includes(r.tactics.phase) ||
        !r.tactics.orders ||
        typeof r.tactics.orders !== "object" ||
        Array.isArray(r.tactics.orders) ||
        BigInt(r.floor) % 5n !== 0n
      )
        throw Error("Tattica non valida.");
      for (const [uid, a] of Object.entries(r.tactics.orders)) {
        const m = [r.player, ...r.companions].find(
          (m) => String(m.uid) === uid && (m.uid === 0 || m.active),
        );
        if (
          !m ||
          !a ||
          !["wait", "move", "attack", "moveAttack", "item"].includes(a.type) ||
          a.target ||
          (a.type === "move" &&
            !DIRS.some((d) => d[0] === a.dx && d[1] === a.dy)) ||
          (a.type === "moveAttack" &&
            (!Number.isInteger(a.slot) || !m.moves[a.slot])) ||
          (a.direction &&
            !DIRS.some(
              (d) => d[0] === a.direction[0] && d[1] === a.direction[1],
            )) ||
          (a.type === "item" && (m.uid !== 0 || !Object.hasOwn(r.bag, a.item)))
        )
          throw Error("Ordine non valido.");
      }
    }
  }
  restore(data) {
    const oldVersion = data?.run?.mechanicsVersion;
    const recruited = this.cleanUnlocks(data?.meta?.recruited);
    super.restore(data);
    this.meta.recruited = recruited;
    if (this.run) {
      const r = this.run;
      r.companions ??= [];
      r.teamUid ??= 1000000;
      r.floorKOs ??= [];
      r.recruitmentDone ??= false;
      r.tactics ??=
        oldVersion < 6 && BigInt(r.floor) % 5n === 0n
          ? {
              phase: r.enemies.some((e) => e.boss) ? "plan" : "won",
              orders: {},
            }
          : null;
      r.mechanicsVersion = 6;
    }
  }
}
