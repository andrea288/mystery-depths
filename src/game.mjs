import "./engine.js";
import { nextFloor, validateFloor } from "./roguelite/dungeon.mjs";
import { DungeonRng } from "./core/dungeon-rng.mjs";
// PRET include/enums.h: independent status classes, one condition per class.
const STATUS_GROUP = {
  sleep: "sleep",
  burn: "burn",
  poison: "burn",
  paralysis: "burn",
  freeze: "frozen",
  confusion: "cringe",
  flinch: "cringe",
};
const STATUS_RANGE = {
  sleep: "SLEEP_TURN_RANGE",
  freeze: "FROZEN_TURN_RANGE",
  paralysis: "PARALYSIS_TURN_RANGE",
  confusion: "CONFUSED_TURN_RANGE",
  flinch: "CRINGE_TURN_RANGE",
};
const { Game: Base, DIRS, BIOMES, dist } = globalThis.MD;
export { DIRS, BIOMES };
export const ITEMS = {
  berry: {
    name: "Baccarancia",
    desc: "Recupera fino a 100 PS.",
    color: "#e99b63",
  },
  ether: {
    name: "Elisir Max",
    desc: "Ripristina i PP di tutte le mosse.",
    color: "#a48ee1",
  },
  apple: {
    name: "Mela",
    desc: "Recupera 50 punti di Pancia.",
    color: "#a3c777",
  },
  seed: {
    name: "Semedormita",
    desc: "Lancia il seme al primo nemico nella direzione scelta.",
    color: "#e1cc8c",
  },
};
Object.assign(ITEMS, {
  pecha: { name: "Baccapesca", desc: "Cura il veleno.", cure: "poison" },
  cheri: { name: "Baccaliegia", desc: "Cura la paralisi.", cure: "paralysis" },
  rawst: { name: "Baccafrago", desc: "Cura la scottatura.", cure: "burn" },
  healSeed: {
    name: "Semesalute",
    desc: "Guarisce gli stati alterati negativi.",
  },
  lifeSeed: {
    name: "Semevita",
    desc: "Aumenta di 3 i PS massimi durante la spedizione.",
  },
  sitrus: {
    name: "Baccacedro",
    desc: "Recupera 100 PS; a PS pieni aumenta di 2 i PS massimi.",
  },
  bigApple: {
    name: "Melagrande",
    desc: "Recupera 100 di Pancia; a Pancia piena aumenta di 10 la capacità.",
  },
  hugeApple: {
    name: "Gigantomela",
    desc: "Riempie la Pancia; a Pancia piena aumenta di 10 la capacità.",
  },
});
Object.assign(globalThis.MD.ITEMS, ITEMS);
export const itemIcon = (key) =>
  `assets/items/${key}.${["seed", "chest"].includes(key) ? "svg" : "png"}`;
export const PROVISIONS = {
  recovery: { berry: 2 },
  pp: { ether: 2, apple: 1 },
  journey: { apple: 2, seed: 1 },
};
export function rules(move) {
  const c = move.rangeCode;
  return {
    range: [0, 1, 2, 8].includes(c)
      ? 1
      : [4, 9].includes(c)
        ? 2
        : c === 5
          ? 10
          : c === 7
            ? 0
            : 60,
    shape: c === 7 ? "self" : c === 3 ? "room" : c === 2 ? "nearby" : "line",
    cut: [1, 4, 8, 9].includes(c),
  };
}
export class Game extends Base {
  constructor(data, core, meta) {
    super(data, meta);
    this.core = core;
    this.combat = new DungeonRng(1);
  }
  known(species) {
    const p = this.D.pokemon[species];
    return [
      ...new Set([
        ...p.levelMoves.filter((m) => m.level <= 5).map((m) => m.move),
        ...(this.meta.unlocks[species] || []),
      ]),
    ];
  }
  makeMon(species, level, boss = false) {
    const d = this.D.pokemon[species];
    level = Math.max(1, Math.min(100, Math.floor(level)));
    const stats = d.levelStats[level - 1];
    const learned = [
      ...new Set(
        d.levelMoves.filter((m) => m.level <= level).map((m) => m.move),
      ),
    ];
    const moves = (
      d.starter && !boss ? this.known(species) : learned.slice(-4)
    ).slice(0, 4);
    return {
      species,
      name: d.name,
      level,
      hp: stats.hp,
      maxHp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spa: stats.spa,
      spd: stats.spd,
      moves: moves.map((id) => ({ id, pp: this.D.moves[id].pp })),
      statuses: {},
      stages: { atk: 0, def: 0, spa: 0, spd: 0 },
      facing: 0,
      boss,
      guard: 0,
      focus: 0,
      uid: 0,
      regenCounter: 0,
      hitByMove: false,
    };
  }
  start(species, seed = Date.now(), loadout) {
    if (
      loadout &&
      (!Array.isArray(loadout) ||
        new Set(loadout).size !== loadout.length ||
        loadout.length > 4 ||
        loadout.some((m) => !this.known(species).includes(m)))
    )
      throw Error("Mosse equipaggiate non valide.");
    this.combat = new DungeonRng(seed >>> 0);
    const r = super.start(species, seed, loadout);
    r.mechanicsVersion = 5;
    for (const key of Object.keys(ITEMS)) r.bag[key] ??= 0;
    r.bag.healSeed = 1;
    r.combatRng = this.combat.snapshot();
    r.maxBelly = 100;
    r.pendingMoves = [];
    return r;
  }
  buildFloor() {
    super.buildFloor();
    const r = this.run;
    if (r.rooms.length > 1) {
      const pos = this.freeSpot(r.rooms[2] || r.rooms[1]);
      if (pos)
        r.items.push({
          ...pos,
          type: this.rng.pick([
            "pecha",
            "cheri",
            "rawst",
            "healSeed",
            "lifeSeed",
            "sitrus",
            "bigApple",
            "hugeApple",
          ]),
        });
    }
    this.sync();
  }
  sync() {
    super.sync();
    if (this.run && this.combat) this.run.combatRng = this.combat.snapshot();
  }
  has() {
    return 0;
  }
  move(dx, dy) {
    if (!DIRS.some((d) => d[0] === dx && d[1] === dy)) return false;
    return super.move(dx, dy);
  }
  roomFor(e) {
    return this.run.rooms.find(
      (o) => e.x >= o.x && e.y >= o.y && e.x < o.x + o.w && e.y < o.y + o.h,
    );
  }
  validTarget(a, t, m) {
    if (!t || t.hp <= 0) return false;
    const rule = rules(m),
      range = dist(a, t);
    if (rule.shape === "self") return a === t;
    if (a === t) return false;
    if (rule.shape === "room") {
      const room = this.roomFor(a);
      return room ? this.roomFor(t) === room : range <= 1;
    }
    if (range > rule.range) return false;
    if (rule.shape === "nearby") return true;
    let dx = t.x - a.x,
      dy = t.y - a.y;
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return false;
    if (rule.cut) return true;
    if (!this.los(a, t)) return false;
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    if (
      dx &&
      dy &&
      (!this.floorTile(a.x + dx, a.y) || !this.floorTile(a.x, a.y + dy))
    )
      return false;
    for (let i = 1; i < range; i++)
      if (this.occupied(a.x + dx * i, a.y + dy * i, a)) return false;
    return true;
  }
  useMove(slot, target) {
    const r = this.run;
    if (!r || r.state !== "playing") return false;
    const move = r.player.moves[slot];
    if (!move || move.pp <= 0) {
      this.log("PP esauriti. Usa un Elisir Max.");
      return false;
    }
    const m = this.D.moves[move.id],
      rule = rules(m);
    if (rule.shape === "self") target = r.player;
    else if (!target)
      target = ["room", "nearby"].includes(rule.shape)
        ? r.enemies.find((t) => this.validTarget(r.player, t, m))
        : this.findTarget(r.player, DIRS[r.player.facing], rule.range);
    if (target && !this.validTarget(r.player, target, m)) {
      this.log("Il bersaglio non è a portata.");
      return false;
    }
    return this.action({ type: "moveAttack", slot, target });
  }
  regularAttack() {
    const p = this.run?.player;
    if (!p) return false;
    const d = DIRS[p.facing];
    const target = this.occupied(p.x + d[0], p.y + d[1], p);
    return this.action({
      type: "attack",
      target:
        target && this.canStep(p, target.x, target.y, true) ? target : null,
    });
  }
  action(a) {
    const r = this.run;
    if (!r || r.state !== "playing") return false;
    const p = r.player;
    this.events = [];
    r.turn++;
    this.regenerate(p);
    if (!this.statusBlock(p)) {
      if (a.type === "move") {
        const from = { x: p.x, y: p.y };
        p.x += a.dx;
        p.y += a.dy;
        this.effect("step", from, p, { uid: 0 });
        this.pickup();
        this.triggerTrap();
      }
      if (a.type === "attack") {
        if (a.target) this.attack(p, a.target, null);
        else {
          this.effect("attack", p, p, { uid: 0 });
          this.log("L’attacco non colpisce nessuno.");
        }
      }
      if (a.type === "moveAttack") {
        const s = p.moves[a.slot];
        s.pp--;
        const m = this.D.moves[s.id];
        if (a.target) {
          this.face(p, a.target.x - p.x, a.target.y - p.y);
          this.attack(p, a.target, m);
        } else this.log(m.name + ": nessun bersaglio.");
      }
      if (a.type === "item") this.applyItem(a.item);
    }
    this.removeDead();
    if (p.hp <= 0) {
      this.end();
      this.sync();
      return true;
    }
    this.enemiesTurn();
    this.statusTick(p);
    r.belly = Math.max(0, r.belly - 0x199a / 65536);
    if (r.belly === 0) {
      p.hp--;
      if (r.turn % 10 === 0) this.log("La Pancia è vuota. Perdi PS!", "danger");
    }
    this.removeDead();
    if (p.hp <= 0) this.end();
    this.reveal();
    this.sync();
    return true;
  }
  configMon(mon) {
    const names = {
      burn: "burn",
      poison: "poisoned",
      paralysis: "paralysis",
      sleep: "sleep",
      confusion: "confused",
    };
    const statuses = Object.values(mon.statuses)
      .map((s) => names[s.id])
      .filter(Boolean);
    return {
      species: this.D.pokemon[mon.species].eosSpecies,
      level: mon.level,
      hp: Math.max(0, mon.hp),
      max_hp: mon.maxHp,
      atk: mon.atk,
      def: mon.def,
      sp_atk: mon.spa,
      sp_def: mon.spd,
      is_team_member: mon === this.run.player,
      is_team_leader: mon === this.run.player,
      belly: mon === this.run.player ? Math.floor(this.run.belly) : 100,
      statuses,
      stat_modifiers: {
        stages: {
          atk: 10 + mon.stages.atk,
          def: 10 + mon.stages.def,
          sp_atk: 10 + mon.stages.spa,
          sp_def: 10 + mon.stages.spd,
        },
      },
    };
  }
  attack(a, target, m, area = false) {
    if (!target || target.hp <= 0) return;
    if (m && !area && ["room", "nearby"].includes(rules(m).shape)) {
      const targets =
        a === this.run.player ? this.run.enemies : [this.run.player];
      for (const t of [...targets])
        if (this.validTarget(a, t, m)) this.attack(a, t, m, true);
      return;
    }
    this.face(a, target.x - a.x, target.y - a.y);
    this.effect("attack", a, target, {
      element: m?.type || "normal",
      move: m?.name || "Attacco",
      slug: m?.slug || "pound",
      actor: a.name,
      uid: a.uid,
    });
    if (
      ["ember", "flamethrower", "fire-fang", "fire-spin"].includes(m?.slug) &&
      this.hasStatus(target, "freeze")
    )
      delete target.statuses.frozen;
    // PRET ov29_02324514: zero means uniform DungeonRandRange(2,6).
    // Skill Link selects five; unlike main-series weighted 2–5 distributions.
    const hits =
      m?.strikes === 0
        ? this.ability(a, "Skill Link")
          ? 5
          : this.combat.range(2, 6)
        : m?.strikes || 1;
    for (let i = 0; i < hits && target.hp > 0; i++) {
      const cfg = {
        move: {
          id: m?.eosName || "Regular Attack",
          pp: m ? Math.max(0, a.moves.find((x) => x.id === m.id)?.pp ?? 0) : 0,
        },
        attacker: this.configMon(a),
        defender: this.configMon(target),
        dungeon: { weather: "clear" },
        misc: { version: "NA" },
        rngState: this.combat.primary,
      };
      const result = JSON.parse(this.core.singleDamage(JSON.stringify(cfg)));
      if (result.error) throw Error("Errore nel nucleo EoS: " + result.error);
      this.combat.primary = result.rngState;
      this.combat.sequence = (this.combat.sequence + result.rngCalls) >>> 0;
      if (result.healed) {
        target.hp = Math.min(target.maxHp, target.hp + result.damage);
        this.effect("heal", target, target, { amount: result.damage });
        continue;
      }
      if (result.damage === 0) {
        this.log((m?.name || "Attacco") + ": nessun danno.");
        this.effect("text", target, target, { label: "NESSUN DANNO" });
        continue;
      }
      target.hp -= result.damage;
      if (m) target.hitByMove = true;
      this.effect("hit", a, target, {
        uid: target.uid,
        amount: result.damage,
        critical: result.critical,
        element: m?.type || "normal",
      });
      this.log(
        a.name +
          " · " +
          (m?.name || "Attacco") +
          " → " +
          target.name +
          " −" +
          result.damage +
          " PS" +
          (result.critical ? " · Brutto colpo!" : ""),
        target === this.run.player ? "danger" : "",
      );
      if (m && ["absorb", "mega-drain", "giga-drain"].includes(m.slug)) {
        const heal = Math.max(1, Math.floor(result.damage / 2));
        if (
          this.ability(target, "Liquid Ooze") &&
          !this.ability(a, "Mold Breaker")
        ) {
          a.hp -= heal;
          this.effect("hit", a, a, { amount: heal });
        } else {
          a.hp = Math.min(a.maxHp, a.hp + heal);
          this.effect("heal", a, a, { amount: heal });
        }
      }
      if (m && target.hp > 0) this.secondaryEffect(a, target, m);
    }
  }
  ability(mon, name) {
    return this.D.pokemon[mon.species].abilities.includes(name);
  }
  secondaryRoll(a, t, constant) {
    // DungeonRandOutcomeUserTargetInteraction, NA 0x02324934.
    if (a.hp <= 0 || t.hp <= 0) return false;
    const chance = this.D.effects[constant];
    if (!Number.isInteger(chance))
      throw Error("Costante effetto mancante: " + constant);
    const outcome =
      chance === 0 ||
      this.combat.outcome(chance * (this.ability(a, "Serene Grace") ? 2 : 1));
    return (
      outcome &&
      !(
        a !== t &&
        this.ability(t, "Shield Dust") &&
        !this.ability(a, "Mold Breaker")
      )
    );
  }
  secondaryEffect(a, t, m) {
    const entries = {
      ember: ["burn", "FLAMETHROWER_BURN_CHANCE"],
      flamethrower: ["burn", "FLAMETHROWER_BURN_CHANCE"],
      "ice-beam": ["freeze", "POWDER_SNOW_FREEZE_CHANCE"],
      "powder-snow": ["freeze", "POWDER_SNOW_FREEZE_CHANCE"],
      "thunder-shock": ["paralysis", "THUNDERSHOCK_PARALYZE_CHANCE"],
      thunderbolt: ["paralysis", "THUNDERBOLT_PARALYZE_CHANCE"],
      lick: ["paralysis", "LICK_PARALYZE_CHANCE"],
      "dragon-breath": ["paralysis", "LICK_PARALYZE_CHANCE"],
      bite: ["flinch", "BITE_CRINGE_CHANCE"],
      "rock-slide": ["flinch", "ROCK_SLIDE_CRINGE_CHANCE"],
      astonish: ["flinch", "ROCK_SLIDE_CRINGE_CHANCE"],
      "iron-head": ["flinch", "ROCK_SLIDE_CRINGE_CHANCE"],
      "fire-fang": ["burn", "FLARE_BLITZ_BURN_CHANCE"],
    };
    const entry = entries[m.slug];
    if (entry && this.secondaryRoll(a, t, entry[1]))
      this.inflict(t, entry[0], a);
    if (
      m.slug === "fire-fang" &&
      this.secondaryRoll(a, t, "FIRE_FANG_CRINGE_CHANCE")
    )
      this.inflict(t, "flinch", a);
    if (
      m.slug === "metal-claw" &&
      this.secondaryRoll(a, a, "METAL_CLAW_BOOST_ATTACK_CHANCE")
    ) {
      a.stages.atk = Math.min(10, a.stages.atk + 1);
      this.log(a.name + ": Attacco aumentato.");
    }
    const stat =
      m.slug === "crunch" ? "def" : m.slug === "shadow-ball" ? "spd" : null;
    if (
      stat &&
      this.secondaryRoll(
        a,
        t,
        stat === "def"
          ? "CRUNCH_LOWER_DEFENSE_CHANCE"
          : "SHADOW_BALL_LOWER_SPECIAL_DEFENSE_CHANCE",
      )
    ) {
      if (
        !this.ability(a, "Mold Breaker") &&
        (this.ability(t, "Clear Body") || this.ability(t, "White Smoke"))
      )
        return;
      t.stages[stat] = Math.max(-10, t.stages[stat] - 1);
      this.log(
        t.name +
          ": " +
          (stat === "def" ? "Difesa" : "Difesa Speciale") +
          " diminuita.",
      );
    }
  }
  hasStatus(e, id) {
    return e.statuses[STATUS_GROUP[id]]?.id === id;
  }
  statusNames(e) {
    return Object.values(e.statuses).map(
      (s) => globalThis.MD.STATUS_NAMES[s.id],
    );
  }
  // All independent timers advance, even when another class blocks the action.
  // Fractional-turn scheduling remains separate work (see CONFORMITA.md).
  statusBlock(e) {
    let blocked = false;
    for (const [group, state] of Object.entries(e.statuses)) {
      if (
        !["sleep", "freeze", "paralysis", "flinch", "confusion"].includes(
          state.id,
        )
      )
        continue;
      if (--state.turns <= 0) delete e.statuses[group];
      else if (state.id !== "confusion") blocked = true;
    }
    if (blocked) this.log(e.name + " non riesce ad agire.");
    return blocked;
  }
  inflict(e, status, user = e) {
    const ignores = user !== e && this.ability(user, "Mold Breaker");
    const immune =
      {
        flinch: ["Inner Focus"],
        burn: ["Water Veil"],
        freeze: ["Magma Armor"],
        sleep: ["Insomnia", "Vital Spirit"],
        paralysis: ["Limber"],
        poison: ["Immunity"],
        confusion: ["Own Tempo"],
      }[status] || [];
    if (!ignores && immune.some((a) => this.ability(e, a))) return;
    const group = STATUS_GROUP[status];
    if (!group || this.hasStatus(e, status)) return;
    const types = this.D.pokemon[e.species].types;
    if (
      (status === "burn" && types.includes("fire")) ||
      (status === "poison" &&
        (types.includes("poison") || types.includes("steel"))) ||
      (status === "freeze" && types.includes("ice"))
    )
      return;
    const range = STATUS_RANGE[status]
      ? this.D.effects[STATUS_RANGE[status]]
      : [127, 127];
    let duration = this.combat.range(...range);
    if (duration !== 127 && this.ability(e, "Natural Cure"))
      duration = Math.min(duration, 5);
    e.statuses[group] = {
      id: status,
      turns: Math.max(1, duration) + 1,
      clock: 0,
    };
    this.log(
      e.name + ": " + globalThis.MD.STATUS_NAMES[status] + "!",
      "danger",
    );
  }
  statusTick(e) {
    if (e.hp <= 0) return;
    const state = e.statuses.burn;
    if (!state || !["burn", "poison"].includes(state.id)) return;
    // TickStatusAndHealthRegen: countdown starts at zero, then reloads.
    if (state.clock > 0) state.clock--;
    if (state.clock === 0) {
      const poison = state.id === "poison";
      state.clock =
        this.D.effects[
          poison ? "POISON_DAMAGE_COOLDOWN" : "BURN_DAMAGE_COOLDOWN"
        ];
      const damage = this.D.effects[poison ? "POISON_DAMAGE" : "BURN_DAMAGE"];
      delete e.statuses.sleep;
      if (poison && this.ability(e, "Poison Heal")) {
        e.hp = Math.min(e.maxHp, e.hp + damage);
        this.effect("heal", e, e, { amount: damage });
      } else {
        e.hp -= damage;
        this.effect("hit", e, e, { amount: damage });
      }
    }
  }
  regenerate(e) {
    // TickStatusAndHealthRegen (NA 0x02311088): per eligible player action.
    // Enemy monsters (is_not_team_member) do not naturally regenerate.
    if (
      e !== this.run.player ||
      e.hp <= 0 ||
      this.run.belly <= 0 ||
      this.hasStatus(e, "poison")
    )
      return;
    const speed = Math.min(
      500,
      Math.max(30, this.D.pokemon[e.species].regenSpeed),
    );
    e.regenCounter += e.maxHp;
    while (e.regenCounter >= speed) {
      e.regenCounter -= speed;
      e.hp = Math.min(e.maxHp, e.hp + 1);
    }
  }
  xpNeeded() {
    const p = this.run.player,
      t = this.D.pokemon[p.species].expThresholds;
    return p.level < 100 ? t[p.level] - t[p.level - 1] : 0;
  }
  removeDead() {
    const r = this.run,
      p = r.player;
    for (const e of r.enemies.filter((e) => e.hp <= 0)) {
      r.kills++;
      this.meta.kills++;
      const fragments = e.boss ? 12 : 1;
      this.earn(fragments);
      const base = this.D.pokemon[e.species].expYield;
      let xp = base + Math.trunc((base * (e.level - 1)) / 10);
      if (!e.hitByMove) xp = Math.trunc(xp / 2);
      r.xp += Math.max(1, xp);
      this.log(e.name + " sconfitto. +" + Math.max(1, xp) + " PE.", "good");
      if (e.boss) {
        r.bag.berry = Math.min(999, r.bag.berry + 2);
        r.bag.ether = Math.min(999, r.bag.ether + 1);
        this.log("Guardiano sconfitto! Le scale sono libere.", "gold");
      }
      this.effect("defeat", e, e, { uid: e.uid, mon: structuredClone(e) });
    }
    r.enemies = r.enemies.filter((e) => e.hp > 0);
    while (p.level < 100 && r.xp >= this.xpNeeded()) {
      r.xp -= this.xpNeeded();
      p.level++;
      const st = this.D.pokemon[p.species].levelStats[p.level - 1];
      p.hp = Math.min(st.hp, p.hp + (st.hp - p.maxHp));
      p.maxHp = st.hp;
      for (const s of ["atk", "def", "spa", "spd"]) p[s] = st[s];
      this.log("Livello " + p.level + "! Statistiche aumentate.", "gold");
      for (const entry of this.D.pokemon[p.species].levelMoves.filter(
        (x) => x.level === p.level,
      )) {
        this.meta.unlocks[p.species] = [
          ...new Set([...(this.meta.unlocks[p.species] || []), entry.move]),
        ];
        if (!p.moves.some((x) => x.id === entry.move)) {
          if (p.moves.length < 4)
            p.moves.push({ id: entry.move, pp: this.D.moves[entry.move].pp });
          else r.pendingMoves.push(entry.move);
        }
      }
    }
    if (p.level === 100) r.xp = 0;
  }
  applyItem(item) {
    const r = this.run,
      p = r.player;
    if (!ITEMS[item] || !r.bag[item]) return;
    r.bag[item]--;
    this.effect("item", p, p, {
      uid: 0,
      actor: p.name,
      move: ITEMS[item].name,
      item,
    });
    const heal = (amount) => {
      const n = Math.min(amount, p.maxHp - p.hp);
      p.hp += n;
      this.effect("heal", p, p, { uid: 0, amount: n });
    };
    if (ITEMS[item].cure && this.hasStatus(p, ITEMS[item].cure))
      delete p.statuses[STATUS_GROUP[ITEMS[item].cure]];
    if (item === "healSeed") p.statuses = {};
    if (item === "lifeSeed") {
      const n = Math.min(3, 999 - p.maxHp);
      p.maxHp += n;
      heal(n);
    }
    if (item === "sitrus") {
      if (p.hp === p.maxHp) {
        const n = Math.min(2, 999 - p.maxHp);
        p.maxHp += n;
        heal(n);
      } else heal(100);
    }
    if (["bigApple", "hugeApple"].includes(item)) {
      if (r.belly === r.maxBelly) r.maxBelly = Math.min(200, r.maxBelly + 10);
      r.belly = Math.min(
        r.maxBelly,
        r.belly + (item === "bigApple" ? 100 : 999),
      );
    }
    if (item === "berry") {
      const restored = Math.min(100, p.maxHp - p.hp);
      p.hp += restored;
      this.effect("heal", p, p, { amount: restored });
    }
    if (item === "ether") for (const m of p.moves) m.pp = this.D.moves[m.id].pp;
    if (item === "apple") {
      if (r.belly === r.maxBelly) r.maxBelly = Math.min(200, r.maxBelly + 5);
      r.belly = Math.min(r.maxBelly, r.belly + 50);
    }
    if (item === "seed") {
      const t = this.findTarget(p, DIRS[p.facing], 10);
      if (t) this.inflict(t, "sleep");
      else this.log("Il seme non colpisce nessuno.");
    }
    this.log("Usato: " + ITEMS[item].name + ".", "good");
  }
  stairs() {
    const r = this.run;
    if (!r || r.state !== "playing") return false;
    if (r.player.x !== r.exit.x || r.player.y !== r.exit.y) {
      this.log("Raggiungi le scale per scendere.");
      return false;
    }
    if (r.enemies.some((e) => e.boss)) {
      this.log("Sconfiggi il guardiano per proseguire.");
      return false;
    }
    this.meta.best =
      BigInt(this.meta.best) > BigInt(r.floor) ? this.meta.best : r.floor;
    this.earn(3 + Math.floor(r.floor / 5));
    r.state = "reward";
    const learn = this.D.pokemon[r.player.species].learnset.filter(
      (id) => !this.known(r.player.species).includes(id),
    );
    r.reward = [
      {
        kind: "supply",
        id: "recovery",
        name: "Scorta di Baccarance",
        desc: "Due Baccarance, solo per questa spedizione.",
      },
      {
        kind: "supply",
        id: "pp",
        name: "Provviste per la discesa",
        desc: "Due Elisir Max e una Mela, solo per questa spedizione.",
      },
    ];
    if (learn.length) {
      const id = this.rng.pick(learn);
      r.reward.push({
        kind: "move",
        id,
        name: this.D.moves[id].name,
        desc: "Mossa permanente per " + r.player.name + ".",
      });
    } else
      r.reward.push({
        kind: "supply",
        id: "journey",
        name: "Scorta di Mele",
        desc: "Due Mele e un Semedormita.",
      });
    this.sync();
    return true;
  }
  chooseReward(index, replace = 0) {
    const r = this.run;
    if (
      !r ||
      r.state !== "reward" ||
      !Number.isInteger(index) ||
      !r.reward[index] ||
      !Number.isInteger(replace) ||
      replace < 0 ||
      replace > 3
    )
      return false;
    const reward = r.reward[index],
      p = r.player;
    if (reward.kind === "move") {
      this.meta.unlocks[p.species] = [
        ...new Set([...(this.meta.unlocks[p.species] || []), reward.id]),
      ];
      const move = { id: reward.id, pp: this.D.moves[reward.id].pp };
      if (p.moves.length < 4) p.moves.push(move);
      else p.moves[replace] = move;
    } else
      for (const [key, n] of Object.entries(PROVISIONS[reward.id]))
        r.bag[key] = Math.min(999, r.bag[key] + n);
    const next = nextFloor(String(r.floor));
    r.floor =
      BigInt(next) <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(next) : next;
    r.state = "playing";
    r.reward = null;
    this.buildFloor();
    this.log("Piano " + r.floor + " · " + BIOMES[r.biome].name, "gold");
    this.sync();
    return true;
  }
  validateRun(r) {
    if (!r || ![3, 4, 5].includes(r.mechanicsVersion))
      throw Error("Salvataggio di una versione incompatibile.");
    // The handoff validator assumes invented relics: validate our strict reward schema separately.
    const reward = r.reward;
    const copy = {
      ...r,
      bag:
        r.mechanicsVersion < 5
          ? Object.fromEntries(
              Object.keys(ITEMS).map((k) => [
                k,
                r.bag?.[k] ??
                  (["berry", "ether", "apple", "seed"].includes(k)
                    ? undefined
                    : 0),
              ]),
            )
          : r.bag,
      reward:
        r.state === "reward"
          ? [{ kind: "supply" }, { kind: "supply" }, { kind: "supply" }]
          : null,
    };
    super.validateRun(copy);
    if (
      !Array.isArray(r.pendingMoves) ||
      r.pendingMoves.length > 37 ||
      r.pendingMoves.some(
        (id) => !this.D.pokemon[r.player.species].learnset.includes(id),
      )
    )
      throw Error("Apprendimento non valido.");
    const integer = (n, min, max) =>
      Number.isInteger(n) && n >= min && n <= max;
    for (const key of ["turn", "kills", "earned", "xp", "uid"])
      if (!integer(r[key], 0, Number.MAX_SAFE_INTEGER))
        throw Error("Contatore non valido.");
    if (!integer(r.seed, 0, 0xffffffff) || !integer(r.rngState, 0, 0xffffffff))
      throw Error("Seed non valido.");
    DungeonRng.restore(r.combatRng);
    if (
      !Number.isFinite(r.belly) ||
      r.belly < 0 ||
      r.belly > r.maxBelly ||
      !integer(r.maxBelly, 100, 200)
    )
      throw Error("Pancia non valida.");
    if (
      r.enemies.length > 100 ||
      r.items.length > 100 ||
      r.traps.length > 100 ||
      r.log.length > 50 ||
      r.relics.length ||
      r.telegraphs.length
    )
      throw Error("Stato fuori limite.");
    if (r.seen.some((row) => row.some((v) => typeof v !== "boolean")))
      throw Error("Mappa esplorata non valida.");
    if (
      !Array.isArray(r.rooms) ||
      r.rooms.length > 20 ||
      r.rooms.some(
        (o) =>
          !integer(o.x, 1, r.w - 1) ||
          !integer(o.y, 1, r.h - 1) ||
          !integer(o.w, 1, r.w - o.x) ||
          !integer(o.h, 1, r.h - o.y),
      )
    )
      throw Error("Stanze non valide.");
    if (
      !integer(r.biome, 0, BIOMES.length - 1) ||
      !integer(r.exit.x, 0, r.w - 1) ||
      !integer(r.exit.y, 0, r.h - 1)
    )
      throw Error("Piano non valido.");
    for (const item of r.items)
      if (
        !integer(item.x, 0, r.w - 1) ||
        !integer(item.y, 0, r.h - 1) ||
        r.map[item.y][item.x] !== 0 ||
        ![...Object.keys(ITEMS), "chest"].includes(item.type)
      )
        throw Error("Strumento a terra non valido.");
    for (const trap of r.traps)
      if (
        !integer(trap.x, 0, r.w - 1) ||
        !integer(trap.y, 0, r.h - 1) ||
        !["poison", "damage"].includes(trap.type) ||
        typeof trap.revealed !== "boolean"
      )
        throw Error("Trappola non valida.");
    for (const line of r.log)
      if (
        !line ||
        typeof line.text !== "string" ||
        line.text.length > 500 ||
        !["", "good", "gold", "danger"].includes(line.tone) ||
        !integer(line.turn, 0, r.turn)
      )
        throw Error("Diario non valido.");
    const cells = new Set(),
      uids = new Set();
    for (const e of [r.player, ...r.enemies]) {
      if (
        e.name !== this.D.pokemon[e.species].name ||
        typeof e.boss !== "boolean"
      )
        throw Error("Dati Pokémon non validi.");
      if (
        !integer(e.level, 1, 100) ||
        !integer(e.maxHp, 1, 999) ||
        !integer(e.hp, 0, e.maxHp) ||
        !integer(e.facing, 0, 7) ||
        !integer(e.uid, 0, 1000000000)
      )
        throw Error("Pokémon fuori limite.");
      for (const s of ["atk", "def", "spa", "spd"])
        if (!integer(e[s], 0, 255) || !integer(e.stages[s], -10, 10))
          throw Error("Statistica non valida.");
      if (
        e.moves.some(
          (m) =>
            !integer(m.pp, 0, this.D.moves[m.id].pp) ||
            !this.D.pokemon[e.species].learnset.includes(m.id),
        ) ||
        new Set(e.moves.map((m) => m.id)).size !== e.moves.length
      )
        throw Error("Mosse non valide.");
      if (!integer(e.regenCounter, 0, 999) || typeof e.hitByMove !== "boolean")
        throw Error("Recupero o esperienza non validi.");
      if (r.mechanicsVersion === 3) {
        if (
          (e.status !== null && !Object.hasOwn(STATUS_GROUP, e.status)) ||
          !integer(e.statusTurns, 0, 128) ||
          !integer(e.statusClock || 0, 0, 1000) ||
          (e.flinch !== undefined && typeof e.flinch !== "boolean")
        )
          throw Error("Stato precedente non valido.");
      } else {
        if (
          !e.statuses ||
          typeof e.statuses !== "object" ||
          Array.isArray(e.statuses) ||
          Object.keys(e.statuses).length > 4
        )
          throw Error("Gruppi di stato non validi.");
        for (const [group, state] of Object.entries(e.statuses)) {
          if (
            !state ||
            !Object.hasOwn(STATUS_GROUP, state.id) ||
            STATUS_GROUP[state.id] !== group ||
            !integer(state.turns, 1, 128) ||
            !integer(state.clock, 0, 1000)
          )
            throw Error("Stato non valido.");
        }
      }
      const cell = e.x + "," + e.y;
      if (cells.has(cell) || uids.has(e.uid))
        throw Error("Pokémon sovrapposti.");
      cells.add(cell);
      uids.add(e.uid);
    }
    if (
      (r.state === "dead" && r.player.hp !== 0) ||
      (r.state !== "dead" && r.player.hp <= 0)
    )
      throw Error("PS incompatibili con la spedizione.");
    for (const key of Object.keys(ITEMS))
      if (
        !integer(r.bag[key], 0, 999) &&
        !(
          r.mechanicsVersion < 5 &&
          !["berry", "ether", "apple", "seed"].includes(key) &&
          r.bag[key] === undefined
        )
      )
        throw Error("Zaino fuori limite.");
    if (
      r.state === "reward" &&
      (!Array.isArray(reward) ||
        reward.length !== 3 ||
        reward.some(
          (x) =>
            !x ||
            !(
              (x.kind === "supply" && PROVISIONS[x.id]) ||
              (x.kind === "move" &&
                this.D.pokemon[r.player.species].learnset.includes(x.id))
            ),
        ))
    )
      throw Error("Ricompensa non valida.");
  }
  restore(data) {
    const text = JSON.stringify(data);
    if (text.length > 2000000) throw Error("Salvataggio troppo grande.");
    if (data?.version !== 1) throw Error("Versione non supportata.");
    if (data.run) this.validateRun(data.run);
    // Validation happens before mutating current progress.
    const candidate = new Base(this.D, data.meta);
    this.meta = candidate.meta;
    this.run = data.run ? structuredClone(data.run) : null;
    if (this.run) {
      if (this.run.mechanicsVersion === 3) {
        for (const e of [this.run.player, ...this.run.enemies]) {
          e.statuses = {};
          if (e.status && e.statusTurns > 0) {
            const cooldown =
              e.status === "burn"
                ? this.D.effects.BURN_DAMAGE_COOLDOWN
                : e.status === "poison"
                  ? this.D.effects.POISON_DAMAGE_COOLDOWN
                  : 0;
            e.statuses[STATUS_GROUP[e.status]] = {
              id: e.status,
              turns: e.statusTurns,
              clock: cooldown
                ? Math.max(0, cooldown - (e.statusClock || 0))
                : 0,
            };
          }
          if (e.flinch)
            e.statuses.cringe = { id: "flinch", turns: 2, clock: 0 };
          delete e.status;
          delete e.statusTurns;
          delete e.statusClock;
          delete e.flinch;
        }
        this.run.mechanicsVersion = 4;
      }
      for (const key of Object.keys(ITEMS)) this.run.bag[key] ??= 0;
      this.run.mechanicsVersion = 5;
      this.rng = new globalThis.MD.RNG(this.run.rngState);
      this.rng.state = this.run.rngState;
      this.combat = DungeonRng.restore(this.run.combatRng);
    }
    this.events = [];
  }
}
