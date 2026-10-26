import { Game as TeamGame } from "./team.mjs";
import { DIRS, ITEMS, rules } from "./game.mjs";
export const DIFFICULTIES = {
  relaxed: { name: "Rilassata", damage: 0.75, reward: 1 },
  normal: { name: "Esploratore", damage: 1, reward: 1 },
  expert: { name: "Esperto", damage: 1.25, reward: 1.3 },
};
export const TACTICS = {
  follow: "Seguimi",
  guard: "Proteggimi",
  attack: "Attacca",
  conserve: "Conserva i PP",
};
export const WEATHER = {
  clear: "Sereno",
  rain: "Pioggia",
  sunny: "Sole",
  sandstorm: "Tempesta di sabbia",
  hail: "Grandine",
  fog: "Nebbia",
};
export const GEAR = {
  powerBand: { core: "Power Band", cost: 90, desc: "Potenzia l’Attacco." },
  specialBand: {
    core: "Special Band",
    cost: 90,
    desc: "Potenzia l’Attacco Speciale.",
  },
  defScarf: { core: "Def. Scarf", cost: 90, desc: "Potenzia la Difesa." },
  zincBand: {
    core: "Zinc Band",
    cost: 90,
    desc: "Potenzia la Difesa Speciale.",
  },
  detectBand: {
    core: "Detect Band",
    cost: 120,
    desc: "Aiuta a evitare gli attacchi.",
  },
  pechaScarf: {
    core: "Pecha Scarf",
    cost: 70,
    desc: "Protegge dall’avvelenamento.",
  },
  insomniscope: {
    core: "Insomniscope",
    cost: 70,
    desc: "Impedisce di addormentarsi.",
  },
  thunderStone: { core: "Thunderstone", cost: 160, evolution: true },
  fireStone: { core: "Fire Stone", cost: 160, evolution: true },
  waterStone: { core: "Water Stone", cost: 160, evolution: true },
  linkCable: { core: "Link Cable", cost: 180, evolution: true },
  metalCoat: { core: "Metal Coat", cost: 180, evolution: true },
  duskStone: { core: "Dusk Stone", cost: 180, evolution: true },
};
const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export class Game extends TeamGame {
  constructor(data, core, meta) {
    super(data, core, meta);
    this.meta.discoveries = this.normalizeDiscoveries(meta?.discoveries);
    this.meta.challengeRecords = this.normalizeRecords(meta?.challengeRecords);
  }
  normalizeDiscoveries(v) {
    const out = { species: [], items: [], bosses: [] };
    for (const k of Object.keys(out)) {
      if (v?.[k] !== undefined && !Array.isArray(v[k]))
        throw Error("Registro non valido.");
      out[k] = [
        ...new Set(
          (v?.[k] || []).filter((x) =>
            k === "species"
              ? !!this.D.pokemon[x]
              : k === "items"
                ? !!(ITEMS[x] || GEAR[x])
                : typeof x === "string",
          ),
        ),
      ].slice(0, 1000);
    }
    return out;
  }
  normalizeRecords(v) {
    if (v !== undefined && !Array.isArray(v)) throw Error("Sfide non valide.");
    return (v || [])
      .filter(
        (x) =>
          typeof x.code === "string" &&
          x.code.length < 200 &&
          Number.isSafeInteger(x.floor) &&
          x.floor > 0 &&
          Number.isSafeInteger(x.turn) &&
          x.turn >= 0,
      )
      .slice(0, 20);
  }
  gearName(key) {
    return (
      this.D.adventureLabels?.items[GEAR[key]?.core] || GEAR[key]?.core || key
    );
  }
  abilityName(key) {
    return this.D.adventureLabels?.abilities[key] || key;
  }
  makeMon(...args) {
    const m = super.makeMon(...args);
    return Object.assign(m, {
      tactic: "follow",
      disabledMoves: [],
      knownMoves: m.moves.map((s) => s.id),
      ppMemory: Object.fromEntries(m.moves.map((s) => [s.id, s.pp])),
      teamXp: 0,
      bond: 0,
      held: null,
      protectUntil: -1,
      charmUntil: -1,
      swiftUntil: -1,
      copiedAbility: null,
      flashFireBoost: 0,
      gender: [374, 375, 376].includes(args[0])
        ? "none"
        : ((this.run?.seed || 0) + (this.run?.uid || 0) + m.species) % 8 === 0
          ? "female"
          : "male",
    });
  }
  rememberMoves(m) {
    m.knownMoves = [...new Set([...m.knownMoves, ...m.moves.map((s) => s.id)])];
    for (const s of m.moves) m.ppMemory[s.id] = s.pp;
  }
  start(species, seed, loadout, options = {}) {
    if (!DIFFICULTIES[options.difficulty || "normal"])
      throw Error("Difficoltà non valida.");
    this.startOptions = options;
    const r = super.start(species, seed, loadout);
    r.mechanicsVersion = 7;
    r.adventure.initialMoves = r.player.moves.map((s) => s.id);
    r.adventure.initialSpecies = species;
    this.rememberMoves(r.player);
    this.startOptions = null;
    this.discover();
    return r;
  }
  defaultAdventure() {
    return {
      difficulty: this.startOptions?.difficulty || "normal",
      coins: 120,
      gear: Object.fromEntries(Object.keys(GEAR).map((k) => [k, 0])),
      weather: "clear",
      terrain: [],
      sites: [],
      bossIntent: null,
      bossPhase: 1,
      challenge: !!this.startOptions?.challenge,
      initialMoves: [],
      initialSpecies: this.run?.player?.species || 1,
    };
  }
  weatherFor(floor) {
    const type = this.biome().type;
    return (
      {
        water: "rain",
        fire: "sunny",
        ground: "sandstorm",
        rock: "sandstorm",
        ice: "hail",
        ghost: "fog",
        dark: "fog",
      }[type] || "clear"
    );
  }
  buildFloor() {
    super.buildFloor();
    const r = this.run;
    r.adventure ??= this.defaultAdventure();
    const a = r.adventure;
    a.weather = this.weatherFor(r.floor);
    a.terrain = [];
    a.sites = [];
    a.bossIntent = null;
    a.bossPhase = 1;
    for (const m of this.members()) {
      m.protectUntil = -1;
      m.charmUntil = -1;
      m.copiedAbility = null;
    }
    if (r.tactics) {
      this.prepareIntent();
    } else {
      const type = this.biome().type,
        kind = ["water"].includes(type)
          ? "water"
          : ["ice"].includes(type)
            ? "ice"
            : ["ground", "rock"].includes(type)
              ? "sand"
              : "grass";
      for (const room of r.rooms.slice(1))
        for (let y = room.y + 1; y < room.y + room.h - 1; y++)
          for (let x = room.x + 1; x < room.x + room.w - 1; x++)
            if ((x * 7 + y * 11 + r.seed) % 9 === 0 && !this.occupied(x, y))
              a.terrain.push({ x, y, kind });
      const kinds = ["treasure", "rest", "merchant", "trial", "rescue"];
      for (let i = 0; i < kinds.length; i++) {
        const room = r.rooms[(i + 1) % r.rooms.length],
          pos = this.freeSpot(room);
        if (pos) {
          const kind = kinds[i];
          a.sites.push({
            ...pos,
            kind,
            used: false,
            stock: kind === "merchant" ? this.shopStock() : [],
            species: kind === "rescue" ? this.rng.pick(this.D.enemyIds) : null,
          });
        }
      }
    }
    this.entryAbilities();
    this.discover();
    this.sync();
  }
  shopStock() {
    return [
      { key: "berry", price: 30, left: 3 },
      { key: "ether", price: 50, left: 2 },
      { key: "apple", price: 25, left: 3 },
      ...Object.keys(GEAR).map((key) => ({
        key,
        price: GEAR[key].cost,
        left: 1,
      })),
    ];
  }
  discover() {
    if (!this.run || !this.meta.discoveries) return;
    for (const m of [
      ...this.active(),
      ...this.run.enemies.filter((e) => this.visible(e.x, e.y)),
    ])
      if (!this.meta.discoveries.species.includes(m.species))
        this.meta.discoveries.species.push(m.species);
    for (const [key, n] of Object.entries({
      ...this.run.bag,
      ...this.run.adventure?.gear,
    }))
      if (n > 0 && !this.meta.discoveries.items.includes(key))
        this.meta.discoveries.items.push(key);
  }
  visible(x, y) {
    if (
      this.run?.adventure?.weather === "fog" &&
      !this.run.tactics &&
      dist(this.run.player, { x, y }) > 5
    )
      return false;
    return super.visible(x, y);
  }
  effectiveWeather() {
    return this.run?.adventure?.weather || "clear";
  }
  weatherPreview() {
    const next = String(BigInt(this.run.floor) + 1n);
    const current = this.run.floor;
    this.run.floor = next;
    const weather = this.weatherFor(next);
    this.run.floor = current;
    return WEATHER[weather];
  }
  configMon(m) {
    const c = super.configMon(m);
    if (m.held) c.held_item = { id: GEAR[m.held].core };
    if (m.copiedAbility)
      c[
        this.D.pokemon[m.species].abilities.indexOf("Trace") === 1
          ? "ability2"
          : "ability1"
      ] = m.copiedAbility;
    c.stat_modifiers.flash_fire_boost = m.flashFireBoost || 0;
    return c;
  }
  ability(m, key) {
    return m.copiedAbility === key || super.ability(m, key);
  }
  abilityNotice(m, key) {
    this.log(m.name + " · " + this.abilityName(key), "gold");
    this.effect("text", m, m, { uid: m.uid, label: this.abilityName(key) });
  }
  entryAbilities() {
    if (!this.run?.adventure) return;
    const mons = [...this.active(), ...this.run.enemies];
    const sand = mons.find((m) => this.ability(m, "Sand Stream"));
    if (sand && sand.enteredFloor !== String(this.run.floor)) {
      this.run.adventure.weather = "sandstorm";
      sand.enteredFloor = String(this.run.floor);
      this.abilityNotice(sand, "Sand Stream");
    }
    for (const m of mons)
      if (this.ability(m, "Trace") && !m.copiedAbility) {
        const foe = (this.isAlly(m) ? this.run.enemies : this.active()).find(
          (t) => this.los(m, t) && dist(m, t) <= 7,
        );
        const key =
          foe &&
          this.D.pokemon[foe.species].abilities.find(
            (a) => !["Trace", "Unknown"].includes(a),
          );
        if (key) {
          m.copiedAbility = key;
          this.abilityNotice(m, "Trace");
        }
      }
  }
  damageResult(cfg) {
    const adapted = structuredClone(cfg);
    adapted.dungeon = { ...adapted.dungeon, weather: this.effectiveWeather() };
    const result = super.damageResult(adapted);
    if (!this.predicting && result.damage > 0 && !result.healed) {
      const d = this.run?.adventure?.difficulty || "normal";
      if (!cfg.attacker.is_team_member && cfg.defender.is_team_member)
        result.damage = Math.max(
          1,
          Math.floor(result.damage * DIFFICULTIES[d].damage),
        );
    }
    return result;
  }
  matchup(a, t, m) {
    if (m?.ohko) return { label: "Mossa KO", score: 2 };
    if (!m || m.damageClass === "status")
      return { label: "Supporto", score: 2 };
    this.predicting = true;
    try {
      const result = this.damageResult({
        move: { id: m.eosName, pp: m.pp },
        attacker: this.configMon(a),
        defender: this.configMon(t),
        dungeon: { weather: "clear" },
        misc: { version: "NA" },
        rngState: 123456789,
      });
      if (result.error) throw Error(result.error);
      return {
        score: result.matchup,
        label: result.healed
          ? "Assorbita"
          : result.matchup === 3
            ? "Superefficace"
            : result.matchup < 2
              ? "Poco efficace"
              : "Normale",
      };
    } finally {
      this.predicting = false;
    }
  }
  bestMove(a, t) {
    const original = a.moves;
    a.moves = original.filter(
      (s) =>
        !a.disabledMoves?.includes(s.id) &&
        this.D.moves[s.id].damageClass !== "status" &&
        !this.D.moves[s.id].ohko &&
        (a.tactic !== "conserve" ||
          s.pp > Math.ceil(this.D.moves[s.id].pp * 0.4)),
    );
    try {
      const choice = super.bestMove(a, t);
      if (choice) choice.slot = original.indexOf(choice.s);
      return choice;
    } finally {
      a.moves = original;
    }
  }
  inflict(m, status, user = m) {
    if (
      (m.held === "pechaScarf" && status === "poison") ||
      (m.held === "insomniscope" && status === "sleep")
    ) {
      this.log(m.name + " è protetto da " + this.gearName(m.held) + ".");
      return;
    }
    const immunity = {
      sleep: "Insomnia",
      poison: "Immunity",
      burn: "Water Veil",
      flinch: "Inner Focus",
      paralysis: "Limber",
      confusion: "Own Tempo",
    }[status];
    if (
      immunity &&
      this.ability(m, immunity) &&
      !this.ability(user, "Mold Breaker")
    ) {
      this.abilityNotice(m, immunity);
      return;
    }
    const had = this.hasStatus(m, status);
    super.inflict(m, status, user);
    if (
      status === "flinch" &&
      !had &&
      this.hasStatus(m, status) &&
      this.ability(m, "Steadfast")
    ) {
      m.swiftUntil = this.run.turn + 4;
      this.abilityNotice(m, "Steadfast");
    }
    if (
      !had &&
      this.hasStatus(m, status) &&
      m !== user &&
      ["burn", "poison", "paralysis"].includes(status) &&
      this.ability(m, "Synchronize") &&
      !this.reflecting
    ) {
      this.reflecting = true;
      this.abilityNotice(m, "Synchronize");
      this.inflict(user, status, m);
      this.reflecting = false;
    }
  }
  statusBlock(m) {
    const blocked = super.statusBlock(m);
    if (m.charmUntil >= this.run.turn) {
      this.log(m.name + " è infatuato e non agisce.");
      return true;
    }
    return blocked;
  }
  statusTick(m) {
    if (this.ability(m, "Magic Guard")) {
      if (
        m.statuses.burn ||
        ["sandstorm", "hail"].includes(this.effectiveWeather())
      )
        this.abilityNotice(m, "Magic Guard");
      return;
    }
    super.statusTick(m);
    if (m.hp <= 0) return;
    const w = this.effectiveWeather();
    if (
      this.ability(m, "Hydration") &&
      w === "rain" &&
      Object.keys(m.statuses).length
    ) {
      m.statuses = {};
      this.abilityNotice(m, "Hydration");
    }
    if (
      this.ability(m, "Shed Skin") &&
      Object.keys(m.statuses).length &&
      this.combat.outcome(50)
    ) {
      m.statuses = {};
      this.abilityNotice(m, "Shed Skin");
    }
    const types = this.D.pokemon[m.species].types;
    if (
      (w === "sandstorm" &&
        !types.some((t) => ["rock", "ground", "steel"].includes(t))) ||
      (w === "hail" && !types.includes("ice"))
    ) {
      if (this.run.turn % 10 === 0) {
        m.hp = Math.max(0, m.hp - 2);
        this.effect("hit", m, m, { uid: m.uid, amount: 2 });
      }
    }
  }
  attack(a, t, m, area = false) {
    if (!t || t.hp <= 0) return;
    if (t.protectUntil >= this.run.turn) {
      this.log(t.name + " è protetto!");
      this.effect("text", t, t, { uid: t.uid, label: "Protezione" });
      return;
    }
    if (m?.ohko) {
      this.effect("attack", a, t, {
        uid: a.uid,
        actor: a.name,
        move: m.name,
        slug: m.slug,
      });
      if (this.ability(t, "Sturdy")) {
        this.abilityNotice(t, "Sturdy");
        return;
      }
      if (t.boss || !this.combat.outcome(m.accuracy1)) {
        this.log(m.name + ": il bersaglio resiste.");
        return;
      }
      const hp = t.hp;
      t.hp = 0;
      this.effect("hit", a, t, { uid: t.uid, amount: hp });
      if (t.uid === 0) this.end();
      return;
    }
    if (m?.type === "fire" && this.ability(t, "Flash Fire")) {
      t.flashFireBoost = clamp((t.flashFireBoost || 0) + 1, 0, 2);
      this.abilityNotice(t, "Flash Fire");
    }
    const hp = t.hp;
    if (m && this.ability(t, "Pressure")) {
      const slot = a.moves.find((s) => s.id === m.id);
      if (slot) slot.pp = Math.max(0, slot.pp - 1);
      this.abilityNotice(t, "Pressure");
    }
    super.attack(a, t, m, area);
    if (m?.recoil && t.hp < hp) {
      if (this.ability(a, "Rock Head") || this.ability(a, "Magic Guard"))
        this.abilityNotice(
          a,
          this.ability(a, "Rock Head") ? "Rock Head" : "Magic Guard",
        );
      else {
        const recoil = Math.max(1, Math.floor((hp - t.hp) / 4));
        a.hp = Math.max(0, a.hp - recoil);
        this.effect("hit", a, a, { uid: a.uid, amount: recoil });
        if (a.uid === 0 && a.hp === 0) this.end();
      }
    }
    if (t.hp < hp) {
      const boostedType = {
        Overgrow: "grass",
        Blaze: "fire",
        Torrent: "water",
      };
      for (const [key, type] of Object.entries(boostedType))
        if (this.ability(a, key) && m?.type === type && a.hp <= a.maxHp / 4)
          this.abilityNotice(a, key);
      if (this.ability(a, "Guts") && Object.keys(a.statuses).length)
        this.abilityNotice(a, "Guts");
      if (
        this.ability(a, "Adaptability") &&
        this.D.pokemon[a.species].types.includes(m?.type)
      )
        this.abilityNotice(a, "Adaptability");
      if (this.ability(t, "Intimidate") && (!m || m.damageClass === "physical"))
        this.abilityNotice(t, "Intimidate");
      if (this.ability(t, "Thick Fat") && ["fire", "ice"].includes(m?.type))
        this.abilityNotice(t, "Thick Fat");
      if (
        t.hp > 0 &&
        dist(a, t) === 1 &&
        (!m || m.damageClass === "physical")
      ) {
        if (this.ability(t, "Static") && this.combat.outcome(12)) {
          this.inflict(a, "paralysis", t);
          this.abilityNotice(t, "Static");
        }
        if (
          this.ability(t, "Cute Charm") &&
          a.gender !== t.gender &&
          a.gender !== "none" &&
          t.gender !== "none" &&
          this.combat.outcome(12)
        ) {
          a.charmUntil = this.run.turn + 2;
          this.abilityNotice(t, "Cute Charm");
        }
      }
    } else if (t.hp > hp) {
      for (const key of ["Water Absorb", "Volt Absorb"])
        if (this.ability(t, key)) this.abilityNotice(t, key);
    }
  }
  regenerate(m) {
    if (!this.isAlly(m)) return;
    const original = this.run.player;
    if (m !== original) {
      this.run.player = m;
      try {
        super.regenerate(m);
      } finally {
        this.run.player = original;
      }
    } else super.regenerate(m);
  }
  terrainAt(x, y) {
    return this.run.adventure?.terrain.find((t) => t.x === x && t.y === y)
      ?.kind;
  }
  walkActor(m, x, y) {
    const from = { x: m.x, y: m.y };
    const ok = super.walkActor(m, x, y);
    if (!ok) return false;
    const terrain = this.terrainAt(x, y),
      types = this.D.pokemon[m.species].types;
    const airborne = types.includes("flying") || this.ability(m, "Levitate");
    if (terrain === "ice" && !types.includes("ice") && !airborne) {
      const nx = x + Math.sign(x - from.x),
        ny = y + Math.sign(y - from.y);
      if (this.canStep(m, nx, ny)) {
        super.walkActor(m, nx, ny);
        this.log(m.name + " scivola sul ghiaccio.");
      }
    }
    if (
      (terrain === "water" && !types.includes("water") && !airborne) ||
      (terrain === "sand" &&
        !types.some((t) => ["ground", "rock"].includes(t)) &&
        !airborne)
    ) {
      m.slowUntil = this.run.turn + 1;
      this.log(m.name + " rallenta sul terreno.");
    }
    return true;
  }
  perform(m, a) {
    if (this.swapped?.has(m.uid)) return;
    if (a.type === "move" && this.run.tactics?.phase === "resolve") {
      const other = this.active().find(
          (t) => t.uid !== m.uid && t.x === m.x + a.dx && t.y === m.y + a.dy,
        ),
        o = other && this.run.tactics.orders[other.uid];
      if (
        o?.type === "move" &&
        other.x + o.dx === m.x &&
        other.y + o.dy === m.y
      ) {
        this.swapped ??= new Set();
        this.swapped.add(m.uid);
        this.swapped.add(other.uid);
        this.regenerate(m);
        this.regenerate(other);
        const blocked = this.statusBlock(m) | this.statusBlock(other);
        if (
          !blocked &&
          this.canStep(m, other.x, other.y, true) &&
          this.canStep(other, m.x, m.y, true)
        ) {
          const p = { x: m.x, y: m.y },
            q = { x: other.x, y: other.y };
          Object.assign(m, q);
          Object.assign(other, p);
          this.effect("step", p, m, { uid: m.uid });
          this.effect("step", q, other, { uid: other.uid });
          if (m.uid === 0 || other.uid === 0) {
            this.pickup();
            this.triggerTrap();
          }
        }
        return;
      }
    }
    if (a.type === "interact") {
      this.regenerate(m);
      if (!this.statusBlock(m)) this.resolveInteraction(a.index, a.choice);
      return;
    }
    if (
      a.type === "moveAttack" &&
      this.D.moves[m.moves[a.slot]?.id]?.damageClass === "status"
    ) {
      this.regenerate(m);
      if (this.statusBlock(m)) return;
      const slot = m.moves[a.slot];
      if (slot.pp <= 0) return;
      slot.pp--;
      this.castStatus(
        m,
        this.D.moves[slot.id],
        a.targetUid ?? a.target?.uid,
        a.direction,
      );
      return;
    }
    if (a.type === "item" && a.recipient !== undefined) {
      this.regenerate(m);
      if (!this.statusBlock(m)) this.applyTo(a.item, a.recipient);
      return;
    }
    if (a.type === "move" && m.slowUntil >= this.run.turn) {
      this.regenerate(m);
      this.statusBlock(m);
      this.log(m.name + " riprende il passo.");
      return;
    }
    super.perform(m, a);
  }
  castStatus(m, move, targetUid, direction) {
    if (direction) this.face(m, ...direction);
    const effect = move.statusEffect;
    let target = ["heal", "protect", "atk", "def", "spd"].includes(effect)
      ? [...this.members(), ...this.run.enemies].find(
          (t) => t.uid === targetUid,
        ) || m
      : this.run.enemies.find((t) => t.uid === targetUid) ||
        this.findTarget(m, DIRS[m.facing], 4);
    if (
      !target ||
      target.hp <= 0 ||
      dist(m, target) > 4 ||
      !this.los(m, target)
    ) {
      this.log(move.name + ": nessun bersaglio.");
      return;
    }
    this.effect("attack", m, target, {
      uid: m.uid,
      actor: m.name,
      move: move.name,
      slug: move.slug,
    });
    if (effect === "heal") {
      const heal = Math.min(
        Math.ceil(target.maxHp / 2),
        target.maxHp - target.hp,
      );
      target.hp += heal;
      this.effect("heal", target, target, { uid: target.uid, amount: heal });
    } else if (effect === "protect") target.protectUntil = this.run.turn + 1;
    else if (["atk", "def", "spd"].includes(effect)) {
      target.stages[effect] = clamp(target.stages[effect] + 2, -10, 10);
    } else if (effect === "lowerAtk") {
      if (this.ability(target, "Clear Body"))
        this.abilityNotice(target, "Clear Body");
      if (!this.ability(target, "Clear Body"))
        target.stages.atk = clamp(target.stages.atk - 1, -10, 10);
    } else this.inflict(target, effect, m);
    this.log(m.name + " usa " + move.name + " su " + target.name + ".");
  }
  useMove(slot, target) {
    const move = this.D.moves[this.run.player.moves[slot]?.id];
    if (move?.damageClass === "status") {
      if (this.run.player.moves[slot].pp <= 0) return false;
      return this.action({ type: "moveAttack", slot, targetUid: target?.uid });
    }
    return super.useMove(slot, target);
  }
  useItemOn(key, uid) {
    const target = this.members().find((m) => m.uid === uid);
    if (
      !ITEMS[key] ||
      !target ||
      target.hp <= 0 ||
      !this.run.bag[key] ||
      (key === "seed" && uid !== 0)
    )
      return false;
    return this.action({ type: "item", item: key, recipient: uid });
  }
  applyTo(key, uid) {
    const target = this.members().find((m) => m.uid === uid);
    if (!target || target.hp <= 0) return;
    const original = this.run.player;
    this.run.player = target;
    try {
      super.applyItem(key);
    } finally {
      this.run.player = original;
    }
    for (const e of this.events)
      if (
        (e.type === "item" && e.item === key) ||
        (e.type === "heal" && e.to.x === target.x && e.to.y === target.y)
      )
        e.uid = target.uid;
  }
  plan(uid, a) {
    if (
      a.type === "item" &&
      a.recipient !== undefined &&
      !this.members().some((m) => m.uid === a.recipient && m.hp > 0)
    )
      return false;
    return super.plan(uid, a);
  }
  orderPreview() {
    const r = this.run;
    if (!r.tactics) return [];
    return this.active().map((m) => {
      const a = r.tactics.orders[m.uid];
      if (!a) return { uid: m.uid, from: { x: m.x, y: m.y }, missing: true };
      const to =
        a.type === "move"
          ? { x: m.x + a.dx, y: m.y + a.dy }
          : { x: m.x, y: m.y };
      let conflict = false;
      if (a.type === "move") {
        for (const other of this.active().filter((t) => t.uid !== m.uid)) {
          const o = r.tactics.orders[other.uid];
          const q =
            o?.type === "move"
              ? { x: other.x + o.dx, y: other.y + o.dy }
              : other;
          if (q.x === to.x && q.y === to.y) conflict = true;
          if (
            other.x === to.x &&
            other.y === to.y &&
            !(o?.type === "move" && q.x === m.x && q.y === m.y) &&
            this.active().indexOf(other) > this.active().indexOf(m)
          )
            conflict = true;
        }
        if (
          !this.canStep(m, to.x, to.y, true) ||
          this.run.enemies.some((e) => e.x === to.x && e.y === to.y)
        )
          conflict = true;
      }
      const direction = a.direction || DIRS[m.facing];
      let end = to;
      if (["attack", "moveAttack"].includes(a.type)) {
        const move =
          a.type === "moveAttack" ? this.D.moves[m.moves[a.slot].id] : null;
        const range = Math.min(6, move ? rules(move).range : 1);
        end = { x: m.x + direction[0] * range, y: m.y + direction[1] * range };
      }
      return {
        uid: m.uid,
        from: { x: m.x, y: m.y },
        to,
        end,
        conflict,
        type: a.type,
      };
    });
  }
  resolveOrders() {
    if (this.orderPreview().some((o) => o.conflict)) {
      this.log("Correggi gli ordini: due Pokémon si ostacolano.", "danger");
      return false;
    }
    return super.resolveOrders();
  }
  alliesTurn(fighting) {
    if (this.rescueSwap) return;
    for (const a of this.active().filter((m) => m.uid !== 0)) {
      this.regenerate(a);
      if (this.statusBlock(a)) continue;
      const p = this.run.player,
        mode = a.tactic || "follow";
      const enemies = this.run.enemies.filter(
        (e) => e.hp > 0 && this.los(a, e) && dist(a, e) <= 10,
      );
      let target = enemies
        .filter((e) =>
          mode === "guard"
            ? dist(p, e) <= 2
            : mode === "attack"
              ? true
              : dist(a, e) <= 1 ||
                dist(p, e) <= 2 ||
                (fighting && dist(p, e) <= 10),
        )
        .sort((x, y) => dist(a, x) - dist(a, y))[0];
      const heal = a.moves.find(
        (s) =>
          s.pp > 0 &&
          !a.disabledMoves.includes(s.id) &&
          this.D.moves[s.id].statusEffect === "heal",
      );
      const wounded = this.active()
        .filter((m) => dist(a, m) <= 4 && m.hp < m.maxHp * 0.5)
        .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      if (heal && wounded) {
        heal.pp--;
        this.castStatus(a, this.D.moves[heal.id], wounded.uid);
        continue;
      }
      const protect = a.moves.find(
        (s) =>
          s.pp > 0 &&
          !a.disabledMoves.includes(s.id) &&
          this.D.moves[s.id].statusEffect === "protect",
      );
      if (protect && target && a.hp < a.maxHp * 0.3) {
        protect.pp--;
        this.castStatus(a, this.D.moves[protect.id], a.uid);
        continue;
      }
      if (target) {
        const best = this.bestMove(a, target);
        if (best) {
          best.s.pp--;
          this.attack(a, target, best.m);
        } else if (
          dist(a, target) === 1 &&
          this.canStep(a, target.x, target.y, true)
        )
          this.attack(a, target, null);
        else {
          const pos = this.pathStep(a, target);
          if (pos) this.walkActor(a, pos.x, pos.y);
        }
      } else if (dist(a, p) > 1) {
        const pos = this.pathStep(a, p);
        if (pos) this.walkActor(a, pos.x, pos.y);
      }
      this.removeDead();
    }
  }
  setTactic(uid, tactic) {
    const m = this.members().find((m) => m.uid === uid);
    if (!m || !TACTICS[tactic]) return false;
    m.tactic = tactic;
    return true;
  }
  availableMoves(m) {
    return [
      ...new Set([
        ...m.knownMoves,
        ...this.D.pokemon[m.species].levelMoves
          .filter((x) => x.level <= m.level)
          .map((x) => x.move),
        ...(this.meta.unlocks[m.species] || []),
      ]),
    ].filter((id) => this.D.pokemon[m.species].learnset.includes(id));
  }
  equipMove(uid, slot, id) {
    const m = this.members().find((m) => m.uid === uid);
    if (
      !m ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 3 ||
      !this.availableMoves(m).includes(id) ||
      m.moves.some((s) => s.id === id) ||
      this.run.tactics?.phase === "plan"
    )
      return false;
    for (const s of m.moves) m.ppMemory[s.id] = s.pp;
    const entry = { id, pp: m.ppMemory[id] ?? this.D.moves[id].pp };
    if (slot >= m.moves.length) m.moves.push(entry);
    else m.moves[slot] = entry;
    this.rememberMoves(m);
    this.run.tactics && (this.run.tactics.orders = {});
    return true;
  }
  toggleMove(uid, id) {
    const m = this.members().find((m) => m.uid === uid);
    if (!m || !m.moves.some((s) => s.id === id)) return false;
    m.disabledMoves = m.disabledMoves.includes(id)
      ? m.disabledMoves.filter((x) => x !== id)
      : [...m.disabledMoves, id];
    return true;
  }
  equipGear(uid, key) {
    const m = this.members().find((m) => m.uid === uid),
      a = this.run.adventure;
    if (
      !m ||
      (key !== null &&
        (!GEAR[key] || GEAR[key].evolution || a.gear[key] < 1)) ||
      this.run.tactics?.phase === "plan"
    )
      return false;
    if (m.held === key) return true;
    if (m.held && a.gear[m.held] >= 999) return false;
    if (m.held) a.gear[m.held]++;
    if (key) a.gear[key]--;
    m.held = key;
    return true;
  }
  evolutionOptions(uid) {
    const m = this.members().find((m) => m.uid === uid);
    if (!m) return [];
    return (this.D.evolutions?.[m.species] || []).map((e) => ({
      ...e,
      ready:
        m.hp > 0 &&
        m.level >= e.level &&
        (!e.bond || m.bond >= e.bond) &&
        (!e.item || this.run.adventure.gear[e.item] > 0),
    }));
  }
  evolve(uid, to) {
    const m = this.members().find((m) => m.uid === uid),
      e = this.evolutionOptions(uid).find((e) => e.to === to && e.ready);
    if (!m || !e || (this.run.tactics && this.run.tactics.phase !== "won"))
      return false;
    if (e.item) this.run.adventure.gear[e.item]--;
    const evolved = this.makeMon(to, m.level),
      oldName = m.name,
      oldMax = m.maxHp;
    for (const k of ["species", "name", "maxHp", "atk", "def", "spa", "spd"])
      m[k] = evolved[k];
    m.hp = clamp(m.hp + m.maxHp - oldMax, 1, m.maxHp);
    m.moves = m.moves.filter((s) => this.D.pokemon[to].learnset.includes(s.id));
    for (const s of evolved.moves)
      if (m.moves.length < 4 && !m.moves.some((t) => t.id === s.id))
        m.moves.push(s);
    m.knownMoves = [
      ...new Set([...m.knownMoves, ...m.moves.map((s) => s.id)]),
    ].filter((id) => this.D.pokemon[to].learnset.includes(id));
    m.disabledMoves = m.disabledMoves.filter((id) =>
      m.moves.some((s) => s.id === id),
    );
    this.rememberMoves(m);
    m.teamXp = 0;
    if (uid === 0) this.run.xp = 0;
    this.meta.recruited = [...new Set([...this.meta.recruited, to])];
    this.log(oldName + " si è evoluto in " + m.name + "!", "gold");
    this.discover();
    return true;
  }
  removeDead() {
    const r = this.run;
    if (!r.adventure) return super.removeDead();
    const dead = r.enemies.filter((e) => e.hp <= 0);
    let xp = 0;
    for (const e of dead) {
      const base = this.D.pokemon[e.species].expYield;
      xp += Math.max(
        1,
        Math.trunc(
          (base + Math.trunc((base * (e.level - 1)) / 10)) *
            (e.hitByMove ? 1 : 0.5),
        ),
      );
      r.adventure.coins = Math.min(
        999999,
        r.adventure.coins +
          Math.round(
            (e.boss ? 100 : 10) * DIFFICULTIES[r.adventure.difficulty].reward,
          ),
      );
      if (e.boss && !this.meta.discoveries.bosses.includes(this.biome().type))
        this.meta.discoveries.bosses.push(this.biome().type);
    }
    super.removeDead();
    if (xp)
      for (const m of r.companions) {
        m.teamXp += Math.max(1, Math.floor(xp * (m.active ? 1 : 0.5)));
        m.bond = Math.min(9999, m.bond + dead.length);
        while (m.level < 100) {
          const t = this.D.pokemon[m.species].expThresholds,
            need = t[m.level] - t[m.level - 1];
          if (m.teamXp < need) break;
          m.teamXp -= need;
          m.level++;
          const st = this.D.pokemon[m.species].levelStats[m.level - 1],
            old = m.maxHp;
          Object.assign(m, {
            maxHp: st.hp,
            atk: st.atk,
            def: st.def,
            spa: st.spa,
            spd: st.spd,
          });
          if (m.hp > 0)
            m.hp = Math.min(m.maxHp, m.hp + Math.max(0, m.maxHp - old));
          this.log(m.name + " raggiunge il livello " + m.level + "!", "good");
        }
        for (const x of this.D.pokemon[m.species].levelMoves.filter(
          (x) => x.level <= m.level,
        )) {
          if (!m.knownMoves.includes(x.move)) m.knownMoves.push(x.move);
          if (m.moves.length < 4 && !m.moves.some((s) => s.id === x.move))
            m.moves.push({ id: x.move, pp: this.D.moves[x.move].pp });
        }
      }
    if (xp) r.player.bond = Math.min(9999, r.player.bond + dead.length);
    for (const site of r.adventure.sites)
      if (
        site.pending &&
        site.enemyUids.every((uid) => !r.enemies.some((e) => e.uid === uid))
      ) {
        site.pending = false;
        r.adventure.coins = Math.min(999999, r.adventure.coins + 80);
        this.log("Sfida completata: 80 monete!", "gold");
      }
    this.discover();
  }
  prepareIntent() {
    const r = this.run,
      a = r.adventure,
      boss = r.enemies.find((e) => e.boss && e.hp > 0);
    if (!boss) {
      a.bossIntent = null;
      return;
    }
    const phase =
      boss.hp / boss.maxHp <= 0.33 ? 3 : boss.hp / boss.maxHp <= 0.66 ? 2 : 1;
    if (phase !== a.bossPhase) {
      a.bossPhase = phase;
      this.log("Il guardiano entra nella fase " + phase + "!", "danger");
      for (const x of [8, 16]) {
        if (phase === 2 && !this.occupied(x, 9)) r.map[9][x] = 1;
        else if (phase === 3) r.map[9][x] = 0;
      }
    }
    const target = this.active().sort(
      (x, y) => dist(boss, x) - dist(boss, y),
    )[0];
    if (!target) return;
    const best = this.bestMove(boss, target);
    if (!best && dist(boss, target) > 1) {
      const step = this.pathStep(boss, target);
      a.bossIntent = {
        uid: boss.uid,
        kind: "move",
        phase,
        tiles: step ? [step] : [],
        move: null,
      };
      return;
    }
    const center = { x: target.x, y: target.y },
      tiles = [center];
    if (phase >= 2)
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (this.floorTile(center.x + dx, center.y + dy))
          tiles.push({ x: center.x + dx, y: center.y + dy });
    if (phase === 3)
      for (const [dx, dy] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ])
        if (this.floorTile(center.x + dx, center.y + dy))
          tiles.push({ x: center.x + dx, y: center.y + dy });
    a.bossIntent = {
      uid: boss.uid,
      kind: "attack",
      phase,
      tiles,
      move: best?.m.id || null,
    };
  }
  beginBoss() {
    const ok = super.beginBoss();
    if (ok && !this.run.adventure.bossIntent) this.prepareIntent();
    return ok;
  }
  enemiesTurn() {
    const r = this.run;
    if (!r.tactics) return this.normalEnemies();
    const boss = r.enemies.find((e) => e.boss && e.hp > 0),
      intent = r.adventure.bossIntent;
    if (!boss || !intent || r.player.hp <= 0) return;
    if (!this.statusBlock(boss)) {
      if (intent.kind === "move") {
        const p = intent.tiles[0];
        if (p) this.walkActor(boss, p.x, p.y);
      } else {
        const slot = boss.moves.find((s) => s.id === intent.move),
          move = slot && slot.pp > 0 ? this.D.moves[slot.id] : null;
        if (move) slot.pp--;
        for (const m of this.active().filter((m) =>
          intent.tiles.some((p) => p.x === m.x && p.y === m.y),
        )) {
          if (r.player.hp <= 0) break;
          this.attack(boss, m, move, true);
        }
        if (
          !this.active().some((m) =>
            intent.tiles.some((p) => p.x === m.x && p.y === m.y),
          )
        )
          this.log("La squadra evita l’attacco del guardiano!", "good");
      }
    }
    this.statusTick(boss);
    this.removeDead();
  }
  normalEnemies() {
    for (const e of [...this.run.enemies]) {
      if (e.hp <= 0 || this.run.player.hp <= 0) continue;
      const target = this.active().sort((a, b) => dist(e, a) - dist(e, b))[0];
      if (!target) break;
      if (dist(e, target) <= 7 && this.los(e, target)) e.awake = true;
      if (!e.awake) continue;
      if (this.statusBlock(e)) {
        this.statusTick(e);
        continue;
      }
      if (this.ability(e, "Run Away") && e.hp < e.maxHp / 2) {
        const cell = DIRS.map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy }))
          .filter((p) => this.canStep(e, p.x, p.y))
          .sort((a, b) => dist(b, target) - dist(a, target))[0];
        if (cell) {
          this.walkActor(e, cell.x, cell.y);
          this.abilityNotice(e, "Run Away");
          this.statusTick(e);
          continue;
        }
      }
      const heal = e.moves.find(
        (s) => s.pp > 0 && this.D.moves[s.id].statusEffect === "heal",
      );
      if (heal && e.hp < e.maxHp * 0.5) {
        heal.pp--;
        this.castStatus(e, this.D.moves[heal.id], e.uid);
      } else {
        const available = e.moves.filter(
          (s) =>
            s.pp > 0 &&
            this.D.moves[s.id].damageClass !== "status" &&
            !this.D.moves[s.id].ohko &&
            this.validTarget(e, target, this.D.moves[s.id]),
        );
        if (available.length && this.rng.next() < 0.75) {
          const slot = this.rng.pick(available);
          slot.pp--;
          this.attack(e, target, this.D.moves[slot.id]);
        } else if (
          dist(e, target) === 1 &&
          this.canStep(e, target.x, target.y, true)
        )
          this.attack(e, target, null);
        else {
          const cell = this.pathStep(e, target);
          if (cell) this.walkActor(e, cell.x, cell.y);
        }
      }
      this.statusTick(e);
      this.removeDead();
    }
  }
  action(a) {
    this.swapped = new Set();
    const before = this.run?.turn,
      ok = super.action(a);
    this.swapped = null;
    this.rescueSwap = false;
    if (ok && this.run.turn !== before) {
      for (const m of this.members())
        for (const s of m.moves) m.ppMemory[s.id] = s.pp;
      this.entryAbilities();
      if (this.run.tactics) this.prepareIntent();
      this.discover();
    }
    return ok;
  }
  siteNearby() {
    return this.run.adventure?.sites.find(
      (s) => !s.used && dist(s, this.run.player) <= 1,
    );
  }
  interact(index, choice) {
    const s = this.run.adventure.sites[index];
    if (
      !s ||
      s.used ||
      dist(s, this.run.player) > 1 ||
      this.run.state !== "playing" ||
      this.run.tactics
    )
      return false;
    if (s.kind === "merchant") return false;
    if (
      s.kind === "rescue" &&
      this.run.companions.length >= 5 &&
      !this.run.companions.some((m) => m.uid === choice)
    )
      return false;
    return this.action({ type: "interact", index, choice });
  }
  resolveInteraction(index, choice) {
    const r = this.run,
      a = r.adventure,
      s = a.sites[index];
    if (!s || s.used || dist(s, r.player) > 1) return;
    if (s.kind === "rescue" && r.companions.length >= 5) {
      const old = r.companions.find((m) => m.uid === choice);
      if (!old) return;
      if (old.held) a.gear[old.held] = Math.min(999, a.gear[old.held] + 1);
      r.companions = r.companions.filter((m) => m !== old);
      this.rescueSwap = true;
      this.log(
        old.name +
          " lascia la squadra: la sostituzione occupa il turno di tutti gli alleati.",
      );
    }
    s.used = true;
    this.effect("item", r.player, r.player, {
      uid: 0,
      actor: r.player.name,
      move: {
        rest: "Ristoro",
        treasure: "Tesoro",
        trial: "Sfida",
        rescue: "Soccorso",
      }[s.kind],
    });
    if (s.kind === "rest") {
      for (const m of this.members()) {
        if (m.hp > 0) {
          const n = m.maxHp - m.hp;
          m.hp = m.maxHp;
          m.statuses = {};
          this.effect("heal", m, m, { uid: m.uid, amount: n });
        }
        for (const move of m.moves) move.pp = this.D.moves[move.id].pp;
      }
      r.belly = r.maxBelly;
      this.log("La squadra si riposa: PS, PP e Pancia recuperati.", "good");
    }
    if (s.kind === "treasure") {
      a.coins = Math.min(999999, a.coins + 40);
      const key = this.rng.pick(Object.keys(GEAR));
      a.gear[key] = Math.min(999, a.gear[key] + 1);
      this.log("Tesoro: 40 monete e " + this.gearName(key) + ".", "gold");
    }
    if (s.kind === "trial") {
      s.pending = true;
      s.enemyUids = [];
      for (let i = 0; i < 2; i++) {
        const pos = this.nearFree(s);
        if (pos) {
          const e = this.makeMon(
            this.rng.pick(this.D.enemyIds),
            Math.min(100, r.player.level + 2),
          );
          Object.assign(e, pos, { uid: r.uid++, awake: true });
          r.enemies.push(e);
          s.enemyUids.push(e.uid);
        }
      }
      this.log(
        "Sfida accettata: sconfiggi i due avversari per ottenere 80 monete.",
        "danger",
      );
    }
    if (s.kind === "rescue") {
      const m = this.makeMon(s.species, Math.max(5, r.player.level - 1));
      Object.assign(m, {
        uid: r.teamUid++,
        x: r.player.x,
        y: r.player.y,
        active: false,
      });
      r.companions.push(m);
      if (this.active().length < 3) {
        const pos = this.nearFree(r.player);
        if (pos) Object.assign(m, pos, { active: true });
      }
      this.meta.recruited = [...new Set([...this.meta.recruited, m.species])];
      this.log(m.name + " è stato soccorso e si unisce alla squadra!", "gold");
    }
  }
  recruit(species, replaceUid = null) {
    const old = this.run.companions.find((m) => m.uid === replaceUid);
    const result = super.recruit(species, replaceUid);
    if (result && old?.held && !this.run.companions.includes(old))
      this.run.adventure.gear[old.held] = Math.min(
        999,
        this.run.adventure.gear[old.held] + 1,
      );
    return result;
  }
  buy(index, key) {
    const s = this.run.adventure.sites[index],
      a = this.run.adventure;
    if (
      !s ||
      s.kind !== "merchant" ||
      dist(s, this.run.player) > 1 ||
      this.run.state !== "playing"
    )
      return false;
    const item = s.stock.find((x) => x.key === key && x.left > 0);
    if (!item || a.coins < item.price) return false;
    const bag = GEAR[key] ? a.gear : this.run.bag;
    if (bag[key] >= 999) return false;
    a.coins -= item.price;
    bag[key]++;
    item.left--;
    this.discover();
    return true;
  }
  sell(index, key) {
    const s = this.run.adventure.sites[index],
      a = this.run.adventure;
    if (
      !s ||
      s.kind !== "merchant" ||
      dist(s, this.run.player) > 1 ||
      this.run.state !== "playing"
    )
      return false;
    const bag = GEAR[key] ? a.gear : this.run.bag;
    if (!bag[key]) return false;
    bag[key]--;
    a.coins = Math.min(
      999999,
      a.coins +
        Math.floor(
          (GEAR[key]?.cost || { berry: 30, ether: 50, apple: 25 }[key] || 30) /
            2,
        ),
    );
    return true;
  }
  exportChallenge() {
    const r = this.run;
    return (
      "MD2:" +
      r.seed +
      ":" +
      r.adventure.initialSpecies +
      ":" +
      r.adventure.difficulty +
      ":" +
      r.adventure.initialMoves.join(",")
    );
  }
  startChallenge(code) {
    const m =
      /^MD2:(\d{1,10}):(\d{1,4}):(relaxed|normal|expert):([\d,]*)$/.exec(
        code.trim(),
      );
    if (!m) throw Error("Codice sfida non valido.");
    const seed = +m[1],
      species = +m[2],
      loadout = m[4] ? m[4].split(",").map(Number) : [];
    if (
      seed > 0xffffffff ||
      !this.D.pokemon[species] ||
      loadout.length > 4 ||
      new Set(loadout).size !== loadout.length ||
      loadout.some((id) => !this.D.pokemon[species].learnset.includes(id))
    )
      throw Error("Codice sfida incompatibile.");
    const original = [...this.originalStarters],
      unlocks = this.meta.unlocks[species];
    this.originalStarters.push(species);
    this.meta.unlocks[species] = loadout;
    try {
      return this.start(species, seed, loadout, {
        difficulty: m[3],
        challenge: true,
      });
    } finally {
      this.originalStarters = original;
      if (unlocks) this.meta.unlocks[species] = unlocks;
      else delete this.meta.unlocks[species];
    }
  }
  end() {
    const was = this.run.state;
    super.end();
    if (was !== "dead" && this.run.adventure?.challenge) {
      this.meta.challengeRecords.unshift({
        code: this.exportChallenge(),
        floor: Number(this.run.floor),
        turn: this.run.turn,
      });
      this.meta.challengeRecords = this.meta.challengeRecords.slice(0, 20);
    }
  }
  validateRun(r) {
    if (!r || ![3, 4, 5, 6, 7].includes(r.mechanicsVersion))
      throw Error("Versione avventura non valida.");
    super.validateRun({
      ...r,
      mechanicsVersion: Math.min(6, r.mechanicsVersion),
    });
    if (r.mechanicsVersion < 7) return;
    const a = r.adventure,
      int = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
    if (
      !a ||
      !DIFFICULTIES[a.difficulty] ||
      !WEATHER[a.weather] ||
      !int(a.coins, 0, 999999) ||
      !this.D.pokemon[a.initialSpecies] ||
      typeof a.challenge !== "boolean" ||
      !Array.isArray(a.initialMoves) ||
      a.initialMoves.length > 4 ||
      a.initialMoves.some((id) => !this.D.moves[id]) ||
      !int(a.bossPhase, 1, 3)
    )
      throw Error("Avventura non valida.");
    for (const key of Object.keys(GEAR))
      if (!int(a.gear?.[key], 0, 999))
        throw Error("Strumenti tenuti non validi.");
    for (const m of [r.player, ...r.companions, ...r.enemies]) {
      if (
        !TACTICS[m.tactic] ||
        !Array.isArray(m.disabledMoves) ||
        m.disabledMoves.some((id) => !this.D.moves[id]) ||
        !Array.isArray(m.knownMoves) ||
        m.knownMoves.length > Object.keys(this.D.moves).length ||
        m.knownMoves.some(
          (id) => !this.D.pokemon[m.species].learnset.includes(id),
        ) ||
        !int(m.teamXp, 0, Number.MAX_SAFE_INTEGER) ||
        !int(m.bond, 0, 9999) ||
        (m.held !== null && (!GEAR[m.held] || GEAR[m.held].evolution)) ||
        !m.ppMemory ||
        typeof m.ppMemory !== "object" ||
        Object.entries(m.ppMemory).some(
          ([id, pp]) => !this.D.moves[id] || !int(pp, 0, this.D.moves[id].pp),
        ) ||
        (m.copiedAbility !== null &&
          !Object.hasOwn(this.D.adventureLabels.abilities, m.copiedAbility))
      )
        throw Error("Gestione del compagno non valida.");
      if (
        !["male", "female", "none"].includes(m.gender) ||
        !int(m.flashFireBoost, 0, 2) ||
        (m.slowUntil !== undefined &&
          !int(m.slowUntil, -1, Number.MAX_SAFE_INTEGER))
      )
        throw Error("Abilità o terreno non valido.");
      for (const key of ["protectUntil", "charmUntil", "swiftUntil"])
        if (!int(m[key], -1, Number.MAX_SAFE_INTEGER))
          throw Error("Durata non valida.");
    }
    if (
      !Array.isArray(a.terrain) ||
      a.terrain.length > 1000 ||
      a.terrain.some(
        (t) =>
          !int(t.x, 0, r.w - 1) ||
          !int(t.y, 0, r.h - 1) ||
          !["water", "ice", "sand", "grass"].includes(t.kind),
      )
    )
      throw Error("Terreno non valido.");
    if (
      !Array.isArray(a.sites) ||
      a.sites.length > 10 ||
      a.sites.some(
        (s) =>
          !["merchant", "rest", "treasure", "trial", "rescue"].includes(
            s.kind,
          ) ||
          typeof s.used !== "boolean" ||
          (s.pending !== undefined && typeof s.pending !== "boolean") ||
          (s.enemyUids !== undefined &&
            (!Array.isArray(s.enemyUids) ||
              s.enemyUids.length > 2 ||
              s.enemyUids.some((uid) => !int(uid, 1, 999999)))) ||
          (s.pending && !Array.isArray(s.enemyUids)) ||
          !int(s.x, 0, r.w - 1) ||
          !int(s.y, 0, r.h - 1) ||
          !Array.isArray(s.stock) ||
          s.stock.length > 30 ||
          s.stock.some(
            (i) =>
              (!ITEMS[i.key] && !GEAR[i.key]) ||
              !int(i.price, 1, 9999) ||
              !int(i.left, 0, 99),
          ) ||
          (s.species !== null && !this.D.pokemon[s.species]),
      )
    )
      throw Error("Incontro non valido.");
    if (
      a.bossIntent !== null &&
      (!["move", "attack"].includes(a.bossIntent.kind) ||
        !int(a.bossIntent.uid, 1, 999999) ||
        !Array.isArray(a.bossIntent.tiles) ||
        a.bossIntent.tiles.length > 9 ||
        a.bossIntent.tiles.some(
          (p) => !int(p.x, 0, r.w - 1) || !int(p.y, 0, r.h - 1),
        ) ||
        (a.bossIntent.move !== null && !this.D.moves[a.bossIntent.move]))
    )
      throw Error("Intenzione non valida.");
  }
  restore(data) {
    const discoveries = this.normalizeDiscoveries(data?.meta?.discoveries),
      records = this.normalizeRecords(data?.meta?.challengeRecords),
      old = data?.run?.mechanicsVersion;
    const candidate = structuredClone(data);
    if (candidate.run?.mechanicsVersion === 7)
      candidate.run.mechanicsVersion = 6; // Validate the new fields before the legacy loader normalizes versions.
    if (data?.run?.mechanicsVersion === 7) this.validateRun(data.run);
    super.restore(candidate);
    this.meta.discoveries = discoveries;
    this.meta.challengeRecords = records;
    if (this.run) {
      const r = this.run;
      r.adventure ??= this.defaultAdventure();
      for (const m of [...this.members(), ...r.enemies]) {
        const fresh = this.makeMon(m.species, m.level, m.boss);
        for (const key of [
          "tactic",
          "disabledMoves",
          "knownMoves",
          "ppMemory",
          "teamXp",
          "bond",
          "held",
          "protectUntil",
          "charmUntil",
          "swiftUntil",
          "copiedAbility",
          "flashFireBoost",
          "gender",
        ])
          m[key] ??= fresh[key];
        m.knownMoves = [
          ...new Set([...m.knownMoves, ...m.moves.map((s) => s.id)]),
        ];
        for (const s of m.moves) m.ppMemory[s.id] = s.pp;
      }
      r.mechanicsVersion = 7;
      if (old < 7 && r.tactics) this.prepareIntent();
      this.discover();
    }
  }
}
