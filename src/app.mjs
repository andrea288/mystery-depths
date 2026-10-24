import { Game, TYPE_NAMES } from "./team.mjs";
import { ITEMS, BIOMES, itemIcon } from "./game.mjs";
import { Renderer } from "./render.mjs";
import { Playback } from "./presentation.mjs";
import createCore from "../assets/wasm/eos-core.mjs";
let playback = null,
  lastVisualEvent = -1;
const preferenceDefaults = {
  speed: 1,
  shake: true,
  sound: false,
  minimap: true,
  numbers: true,
  grid: false,
  confirmItems: false,
  range: true,
};
let preferences = { ...preferenceDefaults };
try {
  const saved = JSON.parse(
    localStorage.getItem("mystery-depths-options") || "{}",
  );
  for (const k of Object.keys(preferenceDefaults))
    if (typeof saved[k] === typeof preferenceDefaults[k])
      preferences[k] = saved[k];
  if (![0.35, 0.65, 1, 1.4].includes(preferences.speed)) preferences.speed = 1;
} catch {}
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const types = {
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
const KEY = "mystery-depths-v3";
let game,
  D,
  selected = 1,
  region = "Tutte",
  target = null,
  loadout = [],
  view = "camp",
  busy = false;
const renderer = new Renderer($("dungeon"), $("minimap")),
  campRenderer = new Renderer($("camp-canvas"));
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  setTimeout(() => ($("toast").hidden = true), 4500);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(game.export()));
    $("save-state").textContent = "Salvato";
  } catch {
    $("save-state").textContent = "Salvataggio non disponibile";
    toast("Impossibile salvare nel browser. Esporta la spedizione dal menu.");
  }
}
function modal(title, body, actions = []) {
  $("modal-content").innerHTML =
    `<span class="eyebrow">MYSTERY DEPTHS</span><h2>${esc(title)}</h2>${body}<div class="modal-actions"></div>`;
  for (const [label, fn] of actions) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => {
      $("modal").close();
      fn?.();
    };
    $("modal-content").querySelector(".modal-actions").append(b);
  }
  if (!$("modal").open) $("modal").showModal();
}
function camp() {
  if (busy) return;
  view = "camp";
  document.body.dataset.screen = "camp";
  $("camp").hidden = false;
  $("expedition").hidden = true;
  renderCamp();
}
function renderCamp() {
  const p = D.pokemon[selected];
  $("camp-stats").innerHTML =
    `<span><b>${game.meta.best}</b> piano record</span><span><b>${game.meta.runs}</b> spedizioni</span><span><b>${game.meta.kills}</b> vittorie</span>`;
  $("regions").innerHTML = [
    "Tutte",
    ...new Set(game.starterIds().map((id) => D.pokemon[id].region)),
  ]
    .map(
      (r) =>
        `<button class="${r === region ? "active" : ""}" data-region="${r}">${r}</button>`,
    )
    .join("");
  $("regions")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          region = b.dataset.region;
          renderCamp();
        }),
    );
  $("starter-grid").innerHTML = game
    .starterIds()
    .filter((id) => region === "Tutte" || D.pokemon[id].region === region)
    .map(
      (id) =>
        `<button class="starter-card ${id === selected ? "selected" : ""}" data-starter="${id}" aria-pressed="${id === selected}"><span class="starter-number">#${String(id).padStart(3, "0")}</span><img src="assets/portraits/${id}.png" alt=""><strong>${D.pokemon[id].name}</strong><span>${D.pokemon[id].types.map((t) => types[t]).join(" / ")}</span></button>`,
    )
    .join("");
  $("starter-grid")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          selected = +b.dataset.starter;
          loadout = game.known(selected).slice(0, 4);
          renderCamp();
        }),
    );
  $("starter-detail").innerHTML =
    `<span class="eyebrow">PRONTO A PARTIRE</span><img class="detail-portrait" src="assets/portraits/${selected}.png" alt="${p.name}"><h2>${p.name}</h2><p>${p.types.map((t) => types[t]).join(" · ")} · ${p.region}</p>${p.rulesModule !== "eos-na" ? '<p class="muted">Specie successiva a EoS: adattamento con statistiche e mosse di ' + p.eosSpecies + ".</p>" : ""}<h3>Mosse equipaggiate</h3><p class="muted">Scegline fino a quattro. Le nuove mosse si apprendono durante la discesa.</p><div class="loadout">${game
      .known(selected)
      .map(
        (id) =>
          `<label><input type="checkbox" value="${id}" ${loadout.includes(id) ? "checked" : ""}> ${D.moves[id].name} <small>${D.moves[id].pp} PP</small></label>`,
      )
      .join(
        "",
      )}</div><label class="seed-field">Seed della mappa <input id="seed-input" placeholder="Casuale" inputmode="numeric" maxlength="10"></label><button id="start-button" class="primary">Inizia la discesa</button>${game.run && game.run.state !== "dead" ? '<button id="resume-button">Riprendi la spedizione</button>' : ""}`;
  $("starter-detail")
    .querySelectorAll("[type=checkbox]")
    .forEach(
      (i) =>
        (i.onchange = () => {
          const n = +i.value;
          if (i.checked && loadout.length >= 4) {
            i.checked = false;
            toast("Puoi equipaggiare al massimo quattro mosse.");
            return;
          }
          loadout = i.checked
            ? [...loadout, n]
            : loadout.filter((x) => x !== n);
        }),
    );
  $("start-button").onclick = () => {
    const value = $("seed-input").value;
    const seed =
      value === ""
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Number(value);
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      toast("Inserisci un numero da 0 a 4294967295.");
      return;
    }
    const start = () => {
      game.start(selected, seed, loadout);
      target = null;
      save();
      expedition();
    };
    if (game.run && game.run.state !== "dead")
      modal(
        "Nuova spedizione?",
        "<p>La spedizione in corso terminerà. Le mosse permanenti resteranno disponibili.</p>",
        [
          ["Continua quella attuale", expedition],
          ["Nuova spedizione", start],
        ],
      );
    else start();
  };
  if ($("resume-button")) $("resume-button").onclick = expedition;
  const preview = new Game(D, game.core, game.meta);
  preview.start(selected, 123);
  campRenderer.preview = preview;
  campRenderer
    .prepare([selected, ...preview.run.enemies.map((e) => e.species)])
    .catch(console.error);
}
async function expedition() {
  view = "expedition";
  document.body.dataset.screen = "expedition";
  $("camp").hidden = true;
  $("expedition").hidden = false;
  await renderer.prepare([
    game.run.player.species,
    ...game.run.enemies.map((e) => e.species),
    ...game.members().map((m) => m.species),
  ]);
  hud();
  $("dungeon").focus();
  stateDialog();
}
function hud(displayGame = game) {
  const r = displayGame.run,
    p = r.player;
  if (!r) return;
  $("biome-kicker").textContent =
    displayGame.biome().name + " · " + TYPE_NAMES[displayGame.biome().type];
  $("floor-label").textContent =
    `Piano ${r.floor}${BigInt(r.floor) % 5n === 0n ? " · Il guardiano" : ""}`;
  $("map-location").textContent = p.name;
  $("turn-label").textContent = `Turno ${r.turn}`;
  $("seed-label").textContent = `SEED ${r.seed}`;
  $("kills-label").textContent = `${r.kills} VITTORIE`;
  $("player-card").innerHTML =
    `<div class="player-heading"><img src="assets/portraits/${p.species}.png" alt=""><div><h3>${p.name}</h3><span>Livello ${p.level}${game.statusNames(p).length ? " · " + game.statusNames(p).join(" · ") : ""}</span></div></div><p class="muted">Esperienza: ${p.level < 100 ? r.xp + "/" + game.xpNeeded() + " PE" : "Livello massimo"}</p><div class="meter-label"><span>PS</span><strong>${Math.max(0, p.hp)} / ${p.maxHp}</strong></div><div class="meter"><i style="width:${(Math.max(0, p.hp) / p.maxHp) * 100}%"></i></div><div class="meter-label"><span>Pancia</span><strong>${Math.floor(r.belly)} / ${r.maxBelly}</strong></div><div class="meter belly"><i style="width:${(r.belly / r.maxBelly) * 100}%"></i></div>`;
  const acting = tactical()
    ? displayGame.active().find((m) => m.uid === commandUid) || p
    : p;
  teamHud(displayGame);
  $("move-bar").innerHTML = Array.from({ length: 4 }, (_, i) => {
    const s = acting.moves[i],
      m = s && D.moves[s.id];
    return `<button title="${m ? m.name + ": potenza " + m.power + ", precisione " + m.accuracy : "Slot libero"}" data-move="${i}" ${!m || !s.pp ? "disabled" : ""}><kbd>${i + 1}</kbd><strong>${m ? m.name : "—"}</strong><span>${m ? types[m.type] + " · " + s.pp + "/" + m.pp + " PP" : "Mossa da apprendere"}</span><i class="pp-gauge" style="--pp:${m ? (s.pp / m.pp) * 100 : 0}%"></i></button>`;
  }).join("");
  $("move-bar")
    .querySelectorAll("button")
    .forEach((b) => {
      b.onclick = () => {
        if (tactical()) {
          commandMode = +b.dataset.move;
          hud();
        } else act(() => game.useMove(+b.dataset.move, target));
      };
      b.onmouseenter = b.onfocus = () => {
        renderer.rangeMove = preferences.range
          ? D.moves[p.moves[+b.dataset.move]?.id]
          : null;
      };
      b.onmouseleave = b.onblur = () => (renderer.rangeMove = null);
    });
  const bagFilter = $("bag-filter")?.value || "owned";
  $("bag-count").textContent =
    Object.values(r.bag).reduce((a, b) => a + b, 0) + " strumenti";
  $("player-card").classList.toggle("low-hp", p.hp / p.maxHp <= 0.25);
  $("survival-warning").textContent =
    p.hp / p.maxHp <= 0.25
      ? "PS bassi: cura il Pokémon!"
      : r.belly <= 20
        ? "La Pancia si sta svuotando."
        : "";
  $("status-list").innerHTML = Object.values(p.statuses)
    .map(
      (st) =>
        `<span class="status-chip">${esc(globalThis.MD.STATUS_NAMES[st.id])}${st.turns < 127 ? " · " + Math.max(0, st.turns - 1) : ""}</span>`,
    )
    .join("");
  $("bag").innerHTML = Object.entries(ITEMS)
    .filter(([key]) => bagFilter === "all" || r.bag[key] > 0)
    .sort((a, b) =>
      $("bag-sort")?.value === "quantity"
        ? r.bag[b[0]] - r.bag[a[0]]
        : a[1].name.localeCompare(b[1].name, "it"),
    )
    .map(
      ([key, item]) =>
        `<button data-item="${key}" title="${item.desc}" ${r.bag[key] ? "" : "disabled"}><img class="item-sprite" src="${itemIcon(key)}" alt=""><span>${item.name}<small>${item.desc}</small></span><b>×${r.bag[key]}</b></button>`,
    )
    .join("");
  $("bag")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const key = b.dataset.item;
          if (preferences.confirmItems)
            modal(ITEMS[key].name, "<p>" + ITEMS[key].desc + "</p>", [
              ["Usa", () => act(() => game.useItem(key))],
              ["Annulla"],
            ]);
          else act(() => game.useItem(key));
        }),
    );
  $("combat-log").innerHTML = r.log
    .slice(0, 12)
    .map(
      (l) =>
        `<li class="${esc(l.tone)}"><small>${l.turn}</small>${esc(l.text)}</li>`,
    )
    .join("");
  const visibleTarget = target && r.enemies.find((e) => e.uid === target.uid);
  if (target && !visibleTarget && !playback) target = null;
  $("target-label").hidden = !visibleTarget;
  if (visibleTarget)
    $("target-label").textContent =
      `${visibleTarget.name} · Lv ${visibleTarget.level} · ${D.pokemon[visibleTarget.species].types.map((t) => types[t]).join("/")} · ${visibleTarget.hp}/${visibleTarget.maxHp} PS`;
  renderer.draw(
    displayGame,
    playback ? playback.elapsed : performance.now(),
    target,
  );
}
function act(fn) {
  if (
    busy ||
    view !== "expedition" ||
    $("modal").open ||
    game.run.state !== "playing"
  )
    return;
  try {
    const before = structuredClone(game.run);
    fn();
    save();
    if (game.run.turn !== before.turn) {
      const relevant = game.events.filter(
        (e) =>
          e.uid === 0 || e.type === "attack" || game.visible(e.to.x, e.to.y),
      );
      playback = new Playback(game, before, relevant, preferences.speed);
      busy = true;
      renderer.events = [];
      document.body.classList.add("playing-action");
      hud(playback.game);
    } else {
      hud();
      stateDialog();
    }
  } catch (e) {
    console.error(e);
    modal("La spedizione è in pausa", `<p>${esc(e.message)}</p>`, [["Chiudi"]]);
  }
}
let commandUid = 0,
  commandMode = "move";
function tactical() {
  return ["deploy", "plan"].includes(game.run?.tactics?.phase);
}
function commanded() {
  return game.active().find((m) => m.uid === commandUid) || game.run.player;
}
function sendOrder(order) {
  if (busy) return;
  const ok = game.plan(commanded().uid, order);
  if (!ok) toast("Ordine non valido: controlla casella, PP e direzione.");
  save();
  hud();
}
function directionCommand(dx, dy) {
  if (busy) return true;
  if (!tactical()) return false;
  if (game.run.tactics.phase === "deploy") {
    const m = commanded();
    game.deploy(m.uid, m.x + dx, m.y + dy);
    save();
    hud();
    return true;
  }
  sendOrder(
    typeof commandMode === "number"
      ? { type: "moveAttack", slot: commandMode, direction: [dx, dy] }
      : commandMode === "attack"
        ? { type: "attack", direction: [dx, dy] }
        : { type: "move", dx, dy },
  );
  return true;
}
function orderLabel(order, m) {
  if (!order) return "In campo";
  const direction = order.direction || [order.dx, order.dy];
  const arrow =
    {
      "0,1": "↓",
      "0,-1": "↑",
      "1,0": "→",
      "-1,0": "←",
      "1,1": "↘",
      "-1,1": "↙",
      "1,-1": "↗",
      "-1,-1": "↖",
    }[String(direction)] || "";
  return (
    (order.type === "wait"
      ? "Attendi"
      : order.type === "move"
        ? "Muovi"
        : order.type === "moveAttack"
          ? D.moves[m.moves[order.slot].id].name
          : order.type === "item"
            ? ITEMS[order.item].name
            : "Attacco") +
    " " +
    arrow
  );
}
function teamHud(displayGame) {
  const r = displayGame.run;
  if (!r.companions) return;
  const active = displayGame.active();
  const phase = r.tactics?.phase;
  renderer.commandUid = tactical() ? commanded().uid : null;
  $("team-strip").innerHTML =
    active
      .map(
        (m) =>
          `<button data-command="${m.uid}" class="${m.uid === commandUid ? "selected" : ""}"><img src="assets/portraits/${m.species}.png" alt=""><span>${esc(m.name)}${m.uid === 0 ? " ★" : ""}<small>${m.hp}/${m.maxHp} PS · ${esc(orderLabel(r.tactics?.orders[m.uid], m))}</small></span></button>`,
      )
      .join("") +
    '<button id="manage-team">Squadra ' +
    (1 + r.companions.length) +
    "/6</button>";
  $("team-strip")
    .querySelectorAll("[data-command]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (busy) return;
          commandUid = +b.dataset.command;
          commandMode = "move";
          hud();
        }),
    );
  $("manage-team").onclick = teamMenu;
  $("tactics-panel").hidden = !["deploy", "plan"].includes(phase);
  if (phase === "deploy")
    $("tactics-panel").innerHTML =
      '<strong>Schieramento</strong><p>Seleziona un alleato e tocca una casella verde nelle tre righe inferiori. Lo starter è obbligatorio.</p><button id="begin-boss">Conferma schieramento</button>';
  if (phase === "plan")
    $("tactics-panel").innerHTML =
      `<strong>Ordini per ${esc(commanded().name)}</strong><p>${typeof commandMode === "number" ? "Mossa: " + esc(D.moves[commanded().moves[commandMode].id].name) + " — scegli bersaglio o direzione." : commandMode === "attack" ? "Attacco — scegli bersaglio o direzione." : "Movimento — tocca una casella adiacente o una freccia."} Ogni Pokémon agisce una volta, poi risponde il boss. Puoi correggere gli ordini prima della conferma.</p><button id="order-move">Muovi</button><button id="order-attack">Attacco</button><button id="order-wait">Attendi</button><button id="resolve-orders" ${active.every((m) => r.tactics.orders[m.uid]) ? "" : "disabled"}>Esegui turno (${Object.keys(r.tactics.orders).length}/${active.length})</button>`;
  if ($("begin-boss"))
    $("begin-boss").onclick = () => {
      if (!busy && game.beginBoss()) {
        save();
        hud();
      } else toast("Disponi tutti i Pokémon nelle tre righe verdi.");
    };
  if ($("order-move"))
    $("order-move").onclick = () => {
      commandMode = "move";
      hud();
    };
  if ($("order-attack"))
    $("order-attack").onclick = () => {
      commandMode = "attack";
      hud();
    };
  if ($("order-wait"))
    $("order-wait").onclick = () => sendOrder({ type: "wait" });
  if ($("resolve-orders"))
    $("resolve-orders").onclick = () => act(() => game.resolveOrders());
}
function teamMenu() {
  if (busy) return;
  const r = game.run;
  modal(
    "La tua squadra",
    `<p>Massimo 6 Pokémon, 3 in campo. ★ Lo starter non può essere sostituito: se va KO, la spedizione termina. Ogni cambio consuma un turno per tutta la squadra. I compagni KO recuperano al piano successivo.</p><div class="team-roster">${game
      .members()
      .map(
        (m) =>
          `<article><img src="assets/portraits/${m.species}.png" alt=""><strong>${esc(m.name)}${m.uid === 0 ? " ★" : ""}</strong><span>Lv ${m.level} · ${m.hp}/${m.maxHp} PS · ${m.uid === 0 || m.active ? "In campo" : "Riserva"}</span>${m.uid !== 0 && m.active ? `<button data-withdraw="${m.uid}">Ritira · 1 turno</button>` : ""}${m.uid !== 0 && !m.active && m.hp > 0 ? `<button data-bring="${m.uid}">Schiera · 1 turno</button>` : ""}</article>`,
      )
      .join("")}</div>`,
    [["Chiudi"]],
  );
  document.querySelectorAll("[data-withdraw]").forEach(
    (b) =>
      (b.onclick = () => {
        $("modal").close();
        act(() => game.withdraw(+b.dataset.withdraw));
      }),
  );
  document.querySelectorAll("[data-bring]").forEach(
    (b) =>
      (b.onclick = () => {
        const incoming = +b.dataset.bring;
        const choose = (uid) => {
          $("modal").close();
          act(() => game.substitute(uid, incoming));
          renderer
            .prepare(game.active().map((m) => m.species))
            .catch(console.error);
        };
        if (game.active().length < 3) choose(null);
        else
          modal(
            "Scegli chi sostituire",
            "<p>Lo starter resta in campo. Anche gli altri alleati rinunciano alla loro azione in questo turno.</p>",
            [
              ...game
                .active()
                .filter((m) => m.uid !== 0)
                .map((m) => [m.name, () => choose(m.uid)]),
              ["Annulla", teamMenu],
            ],
          );
      }),
  );
}
function recruitmentDialog() {
  const r = game.run;
  const finish = (id, replace = null) => {
    game.recruit(id, replace);
    save();
    hud();
    stateDialog();
  };
  modal(
    "Un nuovo compagno",
    `<p>Scegli un solo Pokémon mandato KO su questo piano. Ogni specie compare una volta. Il reclutamento sblocca anche lo starter per le prossime spedizioni.</p><div class="recruit-grid">${r.floorKOs.map((m) => `<button data-recruit="${m.species}"><img src="assets/portraits/${m.species}.png" alt=""><strong>${esc(D.pokemon[m.species].name)}</strong><span>Livello ${m.level}</span></button>`).join("") || "<p>Nessun Pokémon sconfitto su questo piano.</p>"}</div>`,
    [["Prosegui senza reclutare", () => finish(null)]],
  );
  document.querySelectorAll("[data-recruit]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = +b.dataset.recruit;
        if (r.companions.length < 5) finish(id);
        else
          modal(
            "Squadra al completo",
            "<p>Scegli un compagno da lasciare per reclutare il nuovo Pokémon. Costa un turno e i nemici ancora presenti possono agire. Lo starter non può essere sostituito.</p>",
            [
              ...r.companions.map((m) => [m.name, () => finish(id, m.uid)]),
              ["Annulla", recruitmentDialog],
            ],
          );
      }),
  );
}

function stateDialog() {
  const r = game.run;
  if (r.state === "reward" && !r.recruitmentDone) {
    recruitmentDialog();
    return;
  }
  if (r.state === "playing" && r.pendingMoves.length) {
    const id = r.pendingMoves[0];
    const choose = (i) => {
      if (i >= 0) r.player.moves[i] = { id, pp: D.moves[id].pp };
      r.pendingMoves.shift();
      save();
      hud();
      stateDialog();
    };
    modal(
      "Nuova mossa: " + D.moves[id].name,
      "<p>La mossa è ora disponibile anche nelle prossime spedizioni. Scegli quale sostituire.</p>",
      [
        ...r.player.moves.map((s, i) => [D.moves[s.id].name, () => choose(i)]),
        ["Non equipaggiare", () => choose(-1)],
      ],
    );
    return;
  }
  if (r.state === "reward") {
    modal(
      "Un passo più in profondità",
      `<p>Piano ${r.floor} completato. Scegli una ricompensa.</p><div class="reward-grid">${r.reward.map((v, i) => `<button data-reward="${i}"><span>${v.kind === "move" ? "MOSSA PERMANENTE" : "PROVVISTE"}</span><h3>${esc(v.name)}</h3><p>${esc(v.desc)}</p></button>`).join("")}</div>`,
    );
    $("modal-content")
      .querySelectorAll("[data-reward]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const n = +b.dataset.reward;
            const choose = (slot) => {
              game.chooseReward(n, slot);
              $("modal").close();
              save();
              expedition();
            };
            if (r.reward[n].kind === "move" && r.player.moves.length === 4)
              modal(
                "Sostituisci una mossa",
                "<p>La mossa sostituita resta disponibile al campo base.</p>",
                r.player.moves.map((s, i) => [
                  D.moves[s.id].name,
                  () => choose(i),
                ]),
              );
            else choose(0);
          }),
      );
  } else if (r.state === "dead")
    modal(
      "La spedizione si conclude",
      `<p>${r.player.name} ha raggiunto il piano <strong>${r.floor}</strong>, con ${r.kills} vittorie in ${r.turn} turni.</p><p>Le mosse apprese restano disponibili. Le provviste saranno rinnovate alla prossima partenza.</p>`,
      [["Torna al campo base", camp]],
    );
}
function menu() {
  modal(
    "La tua spedizione",
    "<p>I progressi vengono salvati dopo ogni azione, in questo browser. Esporta una copia per conservarli su un altro dispositivo.</p>",
    [
      [
        "Riprendi",
        () => {
          if (view === "expedition" && !busy) stateDialog();
        },
      ],
      ["Campo base", camp],
      ["Opzioni", optionsMenu],
      ["Diario completo", journal],
      ["Schermo intero", fullScreen],
      [
        "Esporta salvataggio",
        () => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(game.export(), null, 2)], {
              type: "application/json",
            }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = "mystery-depths.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
      ],
      ["Importa salvataggio", () => $("import-file").click()],
    ],
  );
}
function applyPreferences() {
  renderer.options = preferences;
  $("minimap").hidden = !preferences.minimap;
  try {
    localStorage.setItem("mystery-depths-options", JSON.stringify(preferences));
  } catch {}
}
function optionsMenu() {
  const labels = {
    shake: "Movimento quando si subisce un colpo",
    sound: "Suoni sintetici",
    minimap: "Minimappa",
    numbers: "Numeri dei danni",
    grid: "Griglia del dungeon",
    confirmItems: "Conferma prima di usare strumenti",
    range: "Mostra portata delle mosse",
  };
  modal(
    "Opzioni",
    `<label>Velocità animazioni <select id="animation-speed">${[
      [1.4, "Lenta"],
      [1, "Normale"],
      [0.65, "Rapida"],
      [0.35, "Molto rapida"],
    ]
      .map(
        ([v, label]) =>
          `<option value="${v}" ${v === preferences.speed ? "selected" : ""}>${label}</option>`,
      )
      .join("")}</select></label><div class="options-list">${Object.entries(
      labels,
    )
      .map(
        ([k, label]) =>
          `<label><input type="checkbox" data-option="${k}" ${preferences[k] ? "checked" : ""}>${label}</label>`,
      )
      .join(
        "",
      )}</div><p class="muted">Le preferenze di movimento ridotto del dispositivo sono rispettate. La velocità cambia dalla prossima azione.</p>`,
    [["Chiudi"]],
  );
  $("animation-speed").onchange = (e) => {
    preferences.speed = +e.target.value;
    applyPreferences();
  };
  document.querySelectorAll("[data-option]").forEach(
    (b) =>
      (b.onchange = () => {
        preferences[b.dataset.option] = b.checked;
        applyPreferences();
      }),
  );
}
function journal() {
  modal(
    "Diario completo",
    `<ol class="full-log">${(game.run?.log || []).map((l) => `<li><small>${l.turn}</small> ${esc(l.text)}</li>`).join("")}</ol>`,
    [["Chiudi"]],
  );
}
async function fullScreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    toast("Schermo intero non disponibile in questo browser.");
  }
}
let audioContext;
function soundEffect(e) {
  if (!preferences.sound || !["attack", "heal", "item"].includes(e?.type))
    return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const o = audioContext.createOscillator(),
      g = audioContext.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(
      e.type === "attack" ? 230 : 520,
      audioContext.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      e.type === "attack" ? 90 : 800,
      audioContext.currentTime + 0.16,
    );
    g.gain.setValueAtTime(0.025, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    o.connect(g).connect(audioContext.destination);
    o.start();
    o.stop(audioContext.currentTime + 0.21);
  } catch {}
}
$("bag-filter").onchange = $("bag-sort").onchange = () =>
  hud(playback?.game || game);
$("skip-animation").onclick = () => {
  if (playback) playback.advance(playback.duration);
};
$("full-screen").onclick = fullScreen;
$("journal-button").onclick = journal;
$("import-file").onchange = async (e) => {
  if (busy) {
    toast("Concludi l’animazione prima di importare.");
    e.target.value = "";
    return;
  }
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2000000) throw Error("File troppo grande.");
    const candidate = new Game(D, game.core);
    candidate.restore(JSON.parse(await f.text()));
    game = candidate;
    target = null;
    save();
    camp();
    toast("Salvataggio importato.");
  } catch (e) {
    toast("Importazione rifiutata: " + e.message);
  } finally {
    e.target.value = "";
  }
};
$("settings-button").onclick = menu;
$("pause-button").onclick = menu;
$("home-link").onclick = (e) => {
  e.preventDefault();
  camp();
};
$("help-button").onclick = () =>
  modal(
    "Guida alla discesa",
    "<p>Ogni azione consuma un turno. Muoviti con frecce o WASD; Q, E, Z e C permettono passi diagonali. Tieni premuto Maiusc per orientarti senza muoverti.</p><p>Spazio: attacco normale. Numeri 1–4: mosse. Punto: attendi. V: orientamento gratuito. Tab: cambia bersaglio. M: minimappa. F: schermo intero. L: diario. B: zaino. Invio: scendi quando sei sulle scale. Fai clic su un nemico per selezionarlo.</p><p>Controlla PS, PP e Pancia. Usa gli strumenti dallo zaino. Ogni cinque piani un guardiano custodisce l’uscita. Dopo ogni piano scegli una ricompensa.</p>",
    [["Ho capito", stateDialog]],
  );
$("credits-button").onclick = () =>
  modal(
    "Note e crediti",
    "<p>Progetto personale non ufficiale. Pokémon appartiene ai rispettivi titolari. Sprite e ritratti: collaboratori di SpriteCollab; attribuzioni complete nei file assets/spritebot_credits.txt e assets/tracker.json.</p><p>Icone degli strumenti: PokeAPI/sprites e PMDCollab/RawAsset. Effetti delle mosse: 25 fogli PMDCollab/RawAsset, con abbinamenti e tempi adattati per questo progetto; fonti in assets/effects/manifest.json. Semedormita, forziere e dettagli del dungeon: grafica originale del progetto. Carattere VT323: Peter Hull, licenza SIL OFL.</p><p>Testi ufficiali italiani estratti da Esploratori del Cielo. Calcolo dei danni: damage-eos. Mappe e progressione roguelite sono originali di questo progetto.</p><p>La riproduzione completa delle regole EoS è ancora in lavorazione: effetti secondari, recupero naturale, esperienza e gestione dei turni richiedono ulteriori verifiche. Le specie successive a EoS usano adattamenti dichiarati.</p>",
    [["Chiudi"]],
  );
$("stairs-button").onclick = () => act(() => game.stairs());
$("attack-button").onclick = () => {
  if (tactical()) {
    commandMode = "attack";
    hud();
  } else act(() => game.regularAttack());
};
$("wait-button").onclick = () => {
  if (tactical()) sendOrder({ type: "wait" });
  else act(() => game.wait());
};
$("bag-shortcut").onclick = () =>
  $("bag").scrollIntoView({ behavior: "smooth" });
let facingMode = false;
function orient(dx, dy) {
  if (
    busy ||
    view !== "expedition" ||
    $("modal").open ||
    game.run?.state !== "playing"
  )
    return;
  game.face(game.run.player, dx, dy);
  save();
  hud();
}
$("face-button").onclick = () => {
  facingMode = !facingMode;
  renderer.facingMode = facingMode;
  $("face-button").setAttribute("aria-pressed", String(facingMode));
  $("face-button").textContent = facingMode ? "Orienta: attivo" : "Orienta";
  document.body.classList.toggle("orienting", facingMode);
  $("face-hint").textContent = facingMode
    ? "Tocca una direzione o la mappa. Nessun turno consumato."
    : "Gira senza consumare turni · clic destro sulla mappa";
};
document.querySelectorAll("[data-direction]").forEach(
  (b) =>
    (b.onclick = () => {
      const [dx, dy] = b.dataset.direction.split(",").map(Number);
      if (directionCommand(dx, dy)) return;
      if (facingMode) orient(dx, dy);
      else act(() => game.move(dx, dy));
    }),
);
function mapPoint(e) {
  const r = $("dungeon").getBoundingClientRect(),
    c = renderer.camera;
  return {
    x: Math.floor((e.clientX - r.left - c.x) / c.size),
    y: Math.floor((e.clientY - r.top - c.y) / c.size),
  };
}
$("dungeon").onclick = (e) => {
  if (busy) return;
  const { x, y } = mapPoint(e),
    p = game.run.player;
  if (tactical()) {
    const ally = game.active().find((m) => m.x === x && m.y === y);
    if (ally) {
      commandUid = ally.uid;
      commandMode = "move";
      hud();
      return;
    }
    const actor = commanded();
    if (game.run.tactics.phase === "deploy") {
      game.deploy(actor.uid, x, y);
      save();
      hud();
      return;
    }
    const direction = [Math.sign(x - actor.x), Math.sign(y - actor.y)];
    if (typeof commandMode === "number" || commandMode === "attack") {
      sendOrder({
        type: typeof commandMode === "number" ? "moveAttack" : "attack",
        ...(typeof commandMode === "number" ? { slot: commandMode } : {}),
        direction,
      });
    } else if (Math.max(Math.abs(x - actor.x), Math.abs(y - actor.y)) === 1)
      sendOrder({ type: "move", dx: direction[0], dy: direction[1] });
    else toast("Scegli una casella adiacente: ogni ordine muove di un passo.");
    return;
  }
  if (facingMode) {
    orient(x - p.x, y - p.y);
    return;
  }
  const bounds = $("dungeon").getBoundingClientRect();
  const hit = renderer.hitAreas
    .filter(
      (h) =>
        h.uid !== 0 &&
        Math.abs(h.x - (e.clientX - bounds.left)) < 22 &&
        Math.abs(h.y - (e.clientY - bounds.top)) < 26,
    )
    .sort(
      (a, b) =>
        Math.hypot(
          a.x - e.clientX + bounds.left,
          a.y - e.clientY + bounds.top,
        ) -
        Math.hypot(b.x - e.clientX + bounds.left, b.y - e.clientY + bounds.top),
    )[0];
  target =
    game.run.enemies.find((m) =>
      hit ? m.uid === hit.uid : m.x === x && m.y === y && game.visible(x, y),
    ) || null;
  hud();
};
$("dungeon").oncontextmenu = (e) => {
  e.preventDefault();
  const { x, y } = mapPoint(e),
    p = game.run.player;
  orient(x - p.x, y - p.y);
};
window.addEventListener("keydown", (e) => {
  if (view !== "expedition" || $("modal").open || e.target.matches("input"))
    return;
  const k = e.key.toLowerCase(),
    dirs = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
      q: [-1, -1],
      e: [1, -1],
      z: [-1, 1],
      c: [1, 1],
    };
  if (tactical() && !busy) {
    if (dirs[k]) {
      e.preventDefault();
      directionCommand(...dirs[k]);
      return;
    }
    if (/^[1-4]$/.test(k)) {
      e.preventDefault();
      if (commanded().moves[+k - 1]) {
        commandMode = +k - 1;
        hud();
      }
      return;
    }
    if (k === " ") {
      e.preventDefault();
      commandMode = "attack";
      hud();
      return;
    }
    if (k === ".") {
      sendOrder({ type: "wait" });
      return;
    }
    if (k === "enter") {
      e.preventDefault();
      if (game.run.tactics.phase === "deploy") {
        game.beginBoss();
        save();
        hud();
      } else act(() => game.resolveOrders());
      return;
    }
  }
  if (k === "v") {
    e.preventDefault();
    $("face-button").click();
    return;
  }
  if (k === "m") {
    preferences.minimap = !preferences.minimap;
    applyPreferences();
    return;
  }
  if (k === "f") {
    fullScreen();
    return;
  }
  if (k === "l") {
    journal();
    return;
  }
  if (k === "b") {
    $("bag").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (k === "tab") {
    e.preventDefault();
    if (busy) return;
    const enemies = game.run.enemies.filter((m) => game.visible(m.x, m.y));
    target = enemies[(enemies.indexOf(target) + 1) % enemies.length] || null;
    hud();
    return;
  }
  if (dirs[k]) {
    e.preventDefault();
    if (e.shiftKey || facingMode) {
      orient(...dirs[k]);
    } else act(() => game.move(...dirs[k]));
  } else if (/^[1-4]$/.test(k)) {
    e.preventDefault();
    act(() => game.useMove(+k - 1, target));
  } else if (k === " ") {
    e.preventDefault();
    act(() => game.regularAttack());
  } else if (k === ".") act(() => game.wait());
  else if (k === "enter") {
    e.preventDefault();
    act(() => game.stairs());
  } else if (k === "escape") {
    e.preventDefault();
    menu();
  }
});
$("modal").addEventListener("cancel", (e) => {
  if (
    game.run &&
    ["reward", "dead"].includes(game.run.state) &&
    view === "expedition"
  )
    e.preventDefault();
});
async function init() {
  try {
    [D] = await Promise.all([(await fetch("assets/game/data.json")).json()]);
    const core = await createCore();
    game = new Game(D, core);
    applyPreferences();
    let stored;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      toast(
        "Archivio del browser non disponibile. Puoi giocare ed esportare una copia dal menu.",
      );
    }
    if (stored) {
      try {
        game.restore(JSON.parse(stored));
      } catch (e) {
        let backupSaved = false;
        try {
          localStorage.setItem(KEY + "-backup-nonvalido", stored);
          backupSaved = true;
        } catch {}
        toast(
          "Salvataggio non caricato: " +
            e.message +
            (backupSaved
              ? " Conservata una copia di recupero nel browser."
              : " Impossibile creare la copia di recupero."),
        );
      }
    }
    loadout = game.known(selected).slice(0, 4);
    $("loading").hidden = true;
    $("app").hidden = false;
    camp();
    let previousFrame = performance.now();
    function frame(t) {
      const delta = Math.min(80, Math.max(0, t - previousFrame));
      previousFrame = t;
      if (playback) {
        playback.advance(delta, $("modal").open || document.hidden);
        renderer.events = playback.events;
        $("action-banner").textContent = playback.current
          ? (playback.current.actor || "") +
            " · " +
            (playback.current.move || "Strumento")
          : "Turno in corso…";
        $("action-banner").hidden = false;
        if (playback.index !== lastVisualEvent) {
          lastVisualEvent = playback.index;
          soundEffect(playback.events.at(-1));
          hud(playback.game);
        }
        if (playback.done) {
          playback = null;
          busy = false;
          renderer.events = [];
          lastVisualEvent = -1;
          document.body.classList.remove("playing-action");
          $("action-banner").hidden = true;
          hud();
          stateDialog();
        }
      }
      if (view === "expedition")
        renderer.draw(
          playback?.game || game,
          playback ? playback.elapsed : t,
          target,
        );
      else if (campRenderer.preview) campRenderer.draw(campRenderer.preview, t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (e) {
    console.error(e);
    $("loading").querySelector("p").textContent =
      "Avvio non riuscito: " + e.message;
  }
}
init();
