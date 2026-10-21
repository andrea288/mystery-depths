/* Mystery Depths — deterministic, browser-independent roguelite simulation. */
(function (root) {
  "use strict";
  const VERSION = 1,
    DIRS = [
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const validDepth = (n) =>
    (Number.isSafeInteger(n) && n >= 1) ||
    (typeof n === "string" && /^[1-9][0-9]{0,127}$/.test(n));
  const depthMax = (a, b) => (BigInt(a || 0) > BigInt(b || 0) ? a : b);
  const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const key = (x, y) => x + "," + y;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const BIOMES = [
    {
      name: "Bosco dei sussurri",
      floor: "#33473c",
      wall: "#192c28",
      edge: "#51614c",
      accent: "#a5cd82",
      motif: "forest",
    },
    {
      name: "Grotte di zaffiro",
      floor: "#293e50",
      wall: "#142430",
      edge: "#426078",
      accent: "#80d5ef",
      motif: "crystal",
    },
    {
      name: "Rovine del crepuscolo",
      floor: "#4a423c",
      wall: "#292624",
      edge: "#6a5c4b",
      accent: "#ebbe77",
      motif: "ruins",
    },
    {
      name: "Caldera dimenticata",
      floor: "#483535",
      wall: "#261d24",
      edge: "#725044",
      accent: "#f69a6a",
      motif: "lava",
    },
    {
      name: "Santuario boreale",
      floor: "#40505b",
      wall: "#202c3b",
      edge: "#6a8791",
      accent: "#bcdaed",
      motif: "ice",
    },
  ];
  const RELICS = [];
  class RNG {
    constructor(seed) {
      this.state = seed >>> 0 || 123456789;
    }
    next() {
      let t = (this.state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      this.state >>>= 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(a, b) {
      return a + Math.floor(this.next() * (b - a + 1));
    }
    pick(a) {
      return a[Math.floor(this.next() * a.length)];
    }
  }
  function freshMeta() {
    return {
      version: VERSION,
      shards: 0,
      best: 0,
      runs: 0,
      kills: 0,
      unlocks: {},
      records: [],
    };
  }
  function normalizeMeta(input, D) {
    let m = freshMeta();
    if (!input || input.version !== VERSION) return m;
    for (const k of ["shards", "runs", "kills"])
      m[k] = clamp(Math.floor(Number(input[k]) || 0), 0, 1e9);
    m.best = validDepth(input.best) ? input.best : 0;
    for (const [id, moves] of Object.entries(input.unlocks || {})) {
      if (D.pokemon[id] && Array.isArray(moves))
        m.unlocks[id] = [
          ...new Set(
            moves.filter(
              (x) =>
                Number.isInteger(x) &&
                D.moves[x] &&
                D.pokemon[id].learnset.includes(x),
            ),
          ),
        ].slice(0, 80);
    }
    m.records = Array.isArray(input.records)
      ? input.records
          .filter((x) => x && validDepth(x.floor) && D.pokemon[x.species])
          .slice(0, 10)
          .map((x) => ({
            floor: x.floor,
            species: x.species,
            kills: clamp(Number(x.kills) || 0, 0, 1e9),
            date: String(x.date || "").slice(0, 40),
          }))
      : [];
    return m;
  }
  const STATUS_NAMES = {
    burn: "Scottatura",
    poison: "Veleno",
    paralysis: "Paralisi",
    sleep: "Sonno",
    freeze: "Congelamento",
    confusion: "Confusione",
  };
  class Game {
    constructor(D, meta) {
      this.D = D;
      this.meta = normalizeMeta(meta, D);
      this.run = null;
      this.events = [];
      this.rng = new RNG(Date.now());
    }
    log(text, tone = "") {
      if (!this.run) return;
      this.run.log.unshift({ text, tone, turn: this.run.turn });
      this.run.log = this.run.log.slice(0, 50);
    }
    effect(type, from, to, extra = {}) {
      this.events.push({
        type,
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
        ...extra,
      });
    }
    start(species, seed = Date.now(), loadout) {
      if (!this.D.pokemon[species]?.starter) throw Error("Starter non valido");
      this.rng = new RNG(seed);
      const p = this.makeMon(species, 5);
      if (loadout?.length)
        p.moves = loadout
          .filter((id) => this.known(species).includes(id))
          .slice(0, 4)
          .map((id) => ({ id, pp: this.D.moves[id].pp }));
      this.run = {
        version: VERSION,
        seed: seed >>> 0,
        rngState: this.rng.state,
        floor: 1,
        turn: 0,
        kills: 0,
        earned: 0,
        xp: 0,
        player: p,
        bag: { berry: 3, ether: 2, apple: 2, seed: 1 },
        belly: 100,
        relics: [],
        log: [],
        state: "playing",
        reward: null,
        enemies: [],
        items: [],
        traps: [],
        telegraphs: [],
        seen: [],
        uid: 1,
      };
      this.meta.runs++;
      this.buildFloor();
      this.log("La discesa comincia. Ogni passo è un turno.", "gold");
      this.sync();
      return this.run;
    }
    sync() {
      if (this.run) this.run.rngState = this.rng.state;
    }
    floorTile(x, y) {
      return this.run?.map[y]?.[x] === 0;
    }
    occupied(x, y, except) {
      return [this.run.player, ...this.run.enemies].find(
        (e) => e !== except && e.hp > 0 && e.x === x && e.y === y,
      );
    }
    canStep(e, x, y, ignore = false) {
      if (!this.floorTile(x, y) || (!ignore && this.occupied(x, y, e)))
        return false;
      let dx = x - e.x,
        dy = y - e.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
      if (
        dx &&
        dy &&
        (!this.floorTile(e.x + dx, e.y) || !this.floorTile(e.x, e.y + dy))
      )
        return false;
      return true;
    }
    visible(x, y) {
      const p = this.run.player;
      if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) > 8) return false;
      return this.los(p, { x, y });
    }
    los(a, b) {
      let x = a.x,
        y = a.y,
        dx = Math.abs(b.x - x),
        dy = Math.abs(b.y - y),
        sx = x < b.x ? 1 : -1,
        sy = y < b.y ? 1 : -1,
        err = dx - dy;
      while (x !== b.x || y !== b.y) {
        let prevX = x,
          prevY = y,
          e = 2 * err;
        if (e > -dy) {
          err -= dy;
          x += sx;
        }
        if (e < dx) {
          err += dx;
          y += sy;
        }
        if (
          x !== prevX &&
          y !== prevY &&
          !this.floorTile(x, prevY) &&
          !this.floorTile(prevX, y)
        )
          return false;
        if (!this.floorTile(x, y) && !(x === b.x && y === b.y)) return false;
      }
      return true;
    }
    reveal() {
      const p = this.run.player;
      for (let y = Math.max(0, p.y - 8); y < Math.min(this.run.h, p.y + 9); y++)
        for (
          let x = Math.max(0, p.x - 8);
          x < Math.min(this.run.w, p.x + 9);
          x++
        )
          if (this.visible(x, y)) this.run.seen[y][x] = true;
    }
    buildFloor() {
      const r = this.run,
        depth = BigInt(r.floor),
        boss = depth % 5n === 0n;
      r.uid = 1;
      r.w = boss ? 25 : 43;
      r.h = boss ? 19 : 31;
      r.map = Array.from({ length: r.h }, () => Array(r.w).fill(1));
      r.rooms = [];
      r.enemies = [];
      r.items = [];
      r.traps = [];
      r.telegraphs = [];
      r.seen = Array.from({ length: r.h }, () => Array(r.w).fill(false));
      r.biome = Number(((depth - 1n) / 5n) % BigInt(BIOMES.length));
      const carve = (x, y, w, h) => {
        for (let j = y; j < y + h; j++)
          for (let i = x; i < x + w; i++) r.map[j][i] = 0;
      };
      if (boss) {
        carve(3, 3, 19, 13);
        r.rooms.push({ x: 3, y: 3, w: 19, h: 13, cx: 12, cy: 9 });
        r.player.x = 12;
        r.player.y = 14;
        r.exit = { x: 12, y: 4 };
        let ids = this.D.bossIds || [95, 94, 248, 445, 448, 635, 149, 373];
        ids = ids.filter((i) => this.D.pokemon[i]);
        const e = this.makeMon(
          ids[Number((depth / 5n - 1n) % BigInt(ids.length))],
          Math.min(100, 5 + Number(r.floor)),
          true,
        );
        Object.assign(e, {
          x: 12,
          y: 7,
          uid: r.uid++,
          awake: true,
          cooldown: 2,
        });
        r.enemies.push(e);
        this.log("Un guardiano custodisce le scale.", "danger");
      } else {
        for (let n = 0; n < 100 && r.rooms.length < 8; n++) {
          let w = this.rng.int(5, 9),
            h = this.rng.int(4, 7),
            x = this.rng.int(2, r.w - w - 2),
            y = this.rng.int(2, r.h - h - 2);
          if (
            r.rooms.some(
              (o) =>
                x < o.x + o.w + 2 &&
                x + w + 2 > o.x &&
                y < o.y + o.h + 2 &&
                y + h + 2 > o.y,
            )
          )
            continue;
          let room = {
            x,
            y,
            w,
            h,
            cx: x + Math.floor(w / 2),
            cy: y + Math.floor(h / 2),
          };
          carve(x, y, w, h);
          if (r.rooms.length) {
            let prev = r.rooms.at(-1),
              cx = prev.cx,
              cy = prev.cy;
            while (cx !== room.cx) {
              r.map[cy][cx] = 0;
              cx += Math.sign(room.cx - cx);
            }
            while (cy !== room.cy) {
              r.map[cy][cx] = 0;
              cy += Math.sign(room.cy - cy);
            }
            r.map[cy][cx] = 0;
          }
          r.rooms.push(room);
        }
        let first = r.rooms[0],
          last = r.rooms.at(-1);
        r.player.x = first.cx;
        r.player.y = first.cy;
        r.exit = { x: last.cx, y: last.cy };
        let ids = (
          this.D.enemyIds || [
            19, 41, 74, 92, 246, 280, 304, 447, 443, 570, 624, 679,
          ]
        ).filter((i) => this.D.pokemon[i]);
        for (let i = 1; i < r.rooms.length; i++) {
          let room = r.rooms[i],
            count = this.rng.int(1, Math.min(3, 1 + Math.floor(r.floor / 4)));
          for (let j = 0; j < count; j++) {
            const pos = this.freeSpot(room);
            if (!pos) continue;
            let species =
              ids[
                this.rng.int(
                  0,
                  Math.min(ids.length - 1, 3 + Math.floor(r.floor / 2)),
                )
              ];
            let e = this.makeMon(
              species,
              Math.min(100, 1 + Number(r.floor) + this.rng.int(0, 1)),
            );
            Object.assign(e, pos, { uid: r.uid++, awake: false });
            r.enemies.push(e);
          }
          if (i % 2 === 1) {
            let pos = this.freeSpot(room);
            if (pos)
              r.items.push({
                ...pos,
                type: this.rng.pick(["berry", "ether", "apple", "chest"]),
              });
          }
          if (r.floor > 2 && this.rng.next() < 0.5) {
            let pos = this.freeSpot(room);
            if (pos)
              r.traps.push({
                ...pos,
                revealed: false,
                type: this.rng.pick(["poison", "damage"]),
              });
          }
        }
      }
      r.player.status = null;
      r.player.statusTurns = 0;
      r.player.stages = { atk: 0, def: 0, spa: 0, spd: 0 };
      r.player.guard = 0;
      r.player.focus = 0;
      this.reveal();
      this.sync();
    }
    freeSpot(room) {
      for (let i = 0; i < 60; i++) {
        let p = {
          x: this.rng.int(room.x, room.x + room.w - 1),
          y: this.rng.int(room.y, room.y + room.h - 1),
        };
        if (
          this.floorTile(p.x, p.y) &&
          !this.occupied(p.x, p.y) &&
          !this.run.items.some((e) => e.x === p.x && e.y === p.y) &&
          !this.run.traps.some((e) => e.x === p.x && e.y === p.y) &&
          !(this.run.exit.x === p.x && this.run.exit.y === p.y)
        )
          return p;
      }
      return null;
    }
    face(e, dx, dy) {
      const i = DIRS.findIndex(
        (d) => d[0] === Math.sign(dx) && d[1] === Math.sign(dy),
      );
      if (i >= 0) e.facing = i;
    }
    earn(n) {
      this.meta.shards = Math.min(1e9, this.meta.shards + n);
      this.run.earned = Math.min(1e9, this.run.earned + n);
    }
    move(dx, dy) {
      const r = this.run;
      if (!r || r.state !== "playing") return false;
      const p = r.player;
      this.face(p, dx, dy);
      let target = this.occupied(p.x + dx, p.y + dy, p);
      if (target) {
        if (!this.canStep(p, p.x + dx, p.y + dy, true)) return false;
        return this.action({ type: "attack", target });
      }
      if (!this.canStep(p, p.x + dx, p.y + dy)) return false;
      return this.action({ type: "move", dx, dy });
    }
    wait() {
      return this.action({ type: "wait" });
    }
    findTarget(p, d, range) {
      for (let n = 1; n <= range; n++) {
        let x = p.x + d[0] * n,
          y = p.y + d[1] * n;
        if (!this.floorTile(x, y) || !this.los(p, { x, y })) break;
        let t = this.occupied(x, y, p);
        if (t) return t;
      }
      return null;
    }
    pathStep(e, target) {
      let queue = [{ x: e.x, y: e.y, first: null }],
        seen = new Set([key(e.x, e.y)]);
      for (let i = 0; i < queue.length && i < 1400; i++) {
        const cur = queue[i];
        for (const [dx, dy] of DIRS) {
          let x = cur.x + dx,
            y = cur.y + dy,
            k = key(x, y);
          if (seen.has(k) || !this.floorTile(x, y)) continue;
          if (
            dx &&
            dy &&
            (!this.floorTile(cur.x + dx, cur.y) ||
              !this.floorTile(cur.x, cur.y + dy))
          )
            continue;
          let occupant = this.occupied(x, y, e);
          if (occupant && occupant !== target) continue;
          let first = cur.first || { x, y };
          if (x === target.x && y === target.y) return first;
          seen.add(k);
          queue.push({ x, y, first });
        }
      }
      return null;
    }
    enemiesTurn() {
      const r = this.run,
        p = r.player;
      for (const e of r.enemies) {
        if (e.hp <= 0 || p.hp <= 0) continue;
        if (dist(e, p) <= 7 && this.los(e, p)) e.awake = true;
        if (!e.awake) continue;
        if (this.statusBlock(e)) {
          this.statusTick(e);
          continue;
        }
        if (e.flinch) {
          e.flinch = false;
          continue;
        }
        let usable = e.moves.filter(
          (s) => s.pp > 0 && this.validTarget(e, p, this.D.moves[s.id]),
        );
        if (usable.length && this.rng.next() < 0.75) {
          let s = this.rng.pick(usable);
          s.pp--;
          this.attack(e, p, this.D.moves[s.id]);
        } else if (dist(e, p) === 1 && this.canStep(e, p.x, p.y, true))
          this.attack(e, p, null);
        else {
          const step = this.pathStep(e, p);
          if (step && this.canStep(e, step.x, step.y)) {
            let from = { x: e.x, y: e.y };
            this.face(e, step.x - e.x, step.y - e.y);
            e.x = step.x;
            e.y = step.y;
            this.effect("step", from, e, { uid: e.uid });
          }
        }
        this.statusTick(e);
        if (e.guard > 0) e.guard--;
        if (e.focus > 0) e.focus--;
      }
    }
    pickup() {
      const r = this.run,
        p = r.player;
      let it = r.items.find((i) => i.x === p.x && i.y === p.y);
      if (!it) return;
      r.items = r.items.filter((i) => i !== it);
      if (it.type === "chest") {
        let n = this.rng.int(3, 7);
        this.earn(n);
        const item = this.rng.pick(["berry", "ether", "apple", "seed"]);
        r.bag[item]++;
        this.log(
          "Scrigno: " + n + " frammenti e " + ITEMS[item].name + ".",
          "gold",
        );
      } else {
        r.bag[it.type]++;
        this.log("Raccolto: " + ITEMS[it.type].name + ".", "good");
      }
    }
    triggerTrap() {
      const p = this.run.player,
        t = this.run.traps.find((t) => t.x === p.x && t.y === p.y && !t.spent);
      if (!t) return;
      t.revealed = true;
      t.spent = true;
      if (t.type === "poison") this.inflict(p, "poison");
      else {
        p.hp -= 8;
        this.effect("hit", p, p, { amount: 8 });
        this.log("Trappola a spuntoni! −8 PS.", "danger");
      }
    }
    useItem(item) {
      const r = this.run;
      if (!r || r.state !== "playing" || !ITEMS[item] || !r.bag[item])
        return false;
      if (item === "berry" && r.player.hp === r.player.maxHp) {
        this.log("Hai già tutti i PS.");
        return false;
      }
      return this.action({ type: "item", item });
    }
    end() {
      const r = this.run;
      if (r.state === "dead") return;
      r.player.hp = 0;
      this.effect("defeat", r.player, r.player, { uid: 0, mon: clone(r.player) });
      r.state = "dead";
      this.meta.best = depthMax(this.meta.best, r.floor);
      this.meta.records.unshift({
        floor: r.floor,
        species: r.player.species,
        kills: r.kills,
        date: new Date().toISOString(),
      });
      this.meta.records = this.meta.records.slice(0, 10);
      this.log(
        "La spedizione finisce. Le mosse apprese e i frammenti restano.",
        "gold",
      );
    }
    export() {
      this.sync();
      return {
        version: VERSION,
        meta: clone(this.meta),
        run: this.run ? clone(this.run) : null,
      };
    }
    validateRun(r) {
      if (
        !r ||
        r.version !== VERSION ||
        !validDepth(r.floor) ||
        !["playing", "dead", "reward"].includes(r.state) ||
        !this.D.pokemon[r.player?.species]?.starter
      )
        throw Error("Salvataggio non valido");
      if (
        !Number.isInteger(r.w) ||
        !Number.isInteger(r.h) ||
        r.w < 10 ||
        r.w > 60 ||
        r.h < 10 ||
        r.h > 60 ||
        r.map?.length !== r.h ||
        r.map.some(
          (row) =>
            !Array.isArray(row) ||
            row.length !== r.w ||
            row.some((t) => t !== 0 && t !== 1),
        )
      )
        throw Error("Mappa non valida");
      if (
        !Array.isArray(r.seen) ||
        r.seen.length !== r.h ||
        r.seen.some((row) => !Array.isArray(row) || row.length !== r.w)
      )
        throw Error("Visibilità non valida");
      for (const e of [r.player, ...(r.enemies || [])]) {
        if (
          !this.D.pokemon[e.species] ||
          !Number.isInteger(e.x) ||
          !Number.isInteger(e.y) ||
          r.map[e.y]?.[e.x] !== 0 ||
          !Number.isFinite(e.hp) ||
          !Number.isFinite(e.maxHp) ||
          e.maxHp <= 0 ||
          !Array.isArray(e.moves) ||
          e.moves.length > 4 ||
          e.moves.some(
            (m) => !this.D.moves[m.id] || !Number.isFinite(m.pp) || m.pp < 0,
          ) ||
          !e.stages
        )
          throw Error("Pokémon non valido");
      }
      for (const k of ["items", "traps", "telegraphs", "log", "relics"])
        if (!Array.isArray(r[k])) throw Error("Dati incompleti");
      if (r.relics.some((id) => !RELICS.some((e) => e.id === id)))
        throw Error("Reliquia non valida");
      for (const k of Object.keys(ITEMS))
        if (!Number.isFinite(r.bag?.[k]) || r.bag[k] < 0)
          throw Error("Zaino non valido");
      if (!r.exit || r.map[r.exit.y]?.[r.exit.x] !== 0)
        throw Error("Scale non valide");
      if (
        r.state === "reward" &&
        (!Array.isArray(r.reward) ||
          r.reward.length !== 3 ||
          r.reward.some(
            (x) =>
              !["relic", "move", "supply"].includes(x.kind) ||
              (x.kind === "move" && !this.D.moves[x.id]) ||
              (x.kind === "relic" && !RELICS.some((y) => x.id === y.id)),
          ))
      )
        throw Error("Ricompensa non valida");
    }
  }
  const ITEMS = {
    berry: { name: "Baccarancia", desc: "Recupera fino a 100 PS.", icon: "●" },
    ether: { name: "Elisir Max", desc: "Ripristina tutti i PP.", icon: "♜" },
    apple: { name: "Mela", desc: "Recupera 50 punti di Pancia.", icon: "◆" },
    seed: {
      name: "Semedormita",
      desc: "Lancia al primo nemico nella direzione scelta.",
      icon: "✦",
    },
  };
  root.MD = {
    Game,
    RNG,
    DIRS,
    BIOMES,
    RELICS,
    ITEMS,
    STATUS_NAMES,
    freshMeta,
    dist,
  };
  if (typeof module !== "undefined") module.exports = root.MD;
})(globalThis);
