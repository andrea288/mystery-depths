import { Game, ITEMS, BIOMES } from "./game.mjs";
import { Renderer } from "./render.mjs";
import createCore from "../assets/wasm/eos-core.mjs";
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
  view = "camp";
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
    ...new Set(D.starterIds.map((id) => D.pokemon[id].region)),
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
  $("starter-grid").innerHTML = D.starterIds
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
  const preview = new Game(D, game.core);
  preview.start(selected, 123);
  campRenderer.preview = preview;
  campRenderer
    .prepare([selected, ...preview.run.enemies.map((e) => e.species)])
    .catch(console.error);
}
async function expedition() {
  view = "expedition";
  $("camp").hidden = true;
  $("expedition").hidden = false;
  await renderer.prepare([
    game.run.player.species,
    ...game.run.enemies.map((e) => e.species),
  ]);
  hud();
  $("dungeon").focus();
  stateDialog();
}
function hud() {
  const r = game.run,
    p = r.player;
  if (!r) return;
  $("biome-kicker").textContent = BIOMES[r.biome].name;
  $("floor-label").textContent =
    `Piano ${r.floor}${BigInt(r.floor) % 5n === 0n ? " · Il guardiano" : ""}`;
  $("map-location").textContent = p.name;
  $("turn-label").textContent = `Turno ${r.turn}`;
  $("seed-label").textContent = `SEED ${r.seed}`;
  $("kills-label").textContent = `${r.kills} VITTORIE`;
  $("player-card").innerHTML =
    `<div class="player-heading"><img src="assets/portraits/${p.species}.png" alt=""><div><h3>${p.name}</h3><span>Livello ${p.level}${p.status ? " · " + globalThis.MD.STATUS_NAMES[p.status] : ""}</span></div></div><p class="muted">Esperienza: ${p.level < 100 ? r.xp + "/" + game.xpNeeded() + " PE" : "Livello massimo"}</p><div class="meter-label"><span>PS</span><strong>${Math.max(0, p.hp)} / ${p.maxHp}</strong></div><div class="meter"><i style="width:${(Math.max(0, p.hp) / p.maxHp) * 100}%"></i></div><div class="meter-label"><span>Pancia</span><strong>${Math.floor(r.belly)} / ${r.maxBelly}</strong></div><div class="meter belly"><i style="width:${(r.belly / r.maxBelly) * 100}%"></i></div>`;
  $("move-bar").innerHTML = Array.from({ length: 4 }, (_, i) => {
    const s = p.moves[i],
      m = s && D.moves[s.id];
    return `<button data-move="${i}" ${!m || !s.pp ? "disabled" : ""}><kbd>${i + 1}</kbd><strong>${m ? m.name : "—"}</strong><span>${m ? types[m.type] + " · " + s.pp + "/" + m.pp + " PP" : "Mossa da apprendere"}</span></button>`;
  }).join("");
  $("move-bar")
    .querySelectorAll("button")
    .forEach((b) => {
      b.onclick = () => act(() => game.useMove(+b.dataset.move, target));
      b.onmouseenter = b.onfocus = () => {
        renderer.rangeMove = D.moves[p.moves[+b.dataset.move]?.id];
      };
      b.onmouseleave = b.onblur = () => (renderer.rangeMove = null);
    });
  $("bag").innerHTML = Object.entries(ITEMS)
    .map(
      ([key, item]) =>
        `<button data-item="${key}" title="${item.desc}" ${r.bag[key] ? "" : "disabled"}><span>${item.name}</span><b>×${r.bag[key]}</b></button>`,
    )
    .join("");
  $("bag")
    .querySelectorAll("button")
    .forEach(
      (b) => (b.onclick = () => act(() => game.useItem(b.dataset.item))),
    );
  $("combat-log").innerHTML = r.log
    .slice(0, 12)
    .map(
      (l) =>
        `<li class="${esc(l.tone)}"><small>${l.turn}</small>${esc(l.text)}</li>`,
    )
    .join("");
  if (target && !r.enemies.includes(target)) target = null;
  $("target-label").hidden = !target;
  if (target)
    $("target-label").textContent =
      `${target.name} · ${target.hp}/${target.maxHp} PS`;
  renderer.draw(game, performance.now(), target);
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
    fn();
    renderer.animate(game.events);
    save();
    hud();
    stateDialog();
  } catch (e) {
    console.error(e);
    modal("La spedizione è in pausa", `<p>${esc(e.message)}</p>`, [["Chiudi"]]);
  }
}
function stateDialog() {
  const r = game.run;
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
          if (view === "expedition") stateDialog();
        },
      ],
      ["Campo base", camp],
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
$("import-file").onchange = async (e) => {
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
    "<p>Ogni azione consuma un turno. Muoviti con frecce o WASD; Q, E, Z e C permettono passi diagonali. Tieni premuto Maiusc per orientarti senza muoverti.</p><p>Spazio: attacco normale. Numeri 1–4: mosse. Punto: attendi. Invio: scendi quando sei sulle scale. Fai clic su un nemico per selezionarlo.</p><p>Controlla PS, PP e Pancia. Usa gli strumenti dallo zaino. Ogni cinque piani un guardiano custodisce l’uscita. Dopo ogni piano scegli una ricompensa.</p>",
    [["Ho capito", stateDialog]],
  );
$("credits-button").onclick = () =>
  modal(
    "Note e crediti",
    "<p>Progetto personale non ufficiale. Pokémon appartiene ai rispettivi titolari. Sprite e ritratti: collaboratori di SpriteCollab; attribuzioni complete nei file assets/spritebot_credits.txt e assets/tracker.json.</p><p>Testi ufficiali italiani estratti da Esploratori del Cielo. Calcolo dei danni: damage-eos. Mappe e progressione roguelite sono originali di questo progetto.</p><p>La riproduzione completa delle regole EoS è ancora in lavorazione: effetti secondari, recupero naturale, esperienza e gestione dei turni richiedono ulteriori verifiche. Le specie successive a EoS usano adattamenti dichiarati.</p>",
    [["Chiudi"]],
  );
$("stairs-button").onclick = () => act(() => game.stairs());
$("attack-button").onclick = () => act(() => game.regularAttack());
$("wait-button").onclick = () => act(() => game.wait());
$("bag-shortcut").onclick = () =>
  $("bag").scrollIntoView({ behavior: "smooth" });
document
  .querySelectorAll("[data-direction]")
  .forEach(
    (b) =>
      (b.onclick = () =>
        act(() => game.move(...b.dataset.direction.split(",").map(Number)))),
  );
$("dungeon").onclick = (e) => {
  const r = $("dungeon").getBoundingClientRect(),
    c = renderer.camera;
  const x = Math.floor((e.clientX - r.left - c.x) / c.size),
    y = Math.floor((e.clientY - r.top - c.y) / c.size);
  target =
    game.run.enemies.find(
      (m) => m.x === x && m.y === y && game.visible(x, y),
    ) || null;
  hud();
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
  if (dirs[k]) {
    e.preventDefault();
    if (e.shiftKey) {
      game.face(game.run.player, ...dirs[k]);
      save();
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
  } else if (k === "escape") menu();
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
        try {
          localStorage.setItem(KEY + "-backup-nonvalido", stored);
        } catch {}
        toast(
          "Salvataggio non caricato: " +
            e.message +
            " Conservata una copia di recupero nel browser.",
        );
      }
    }
    loadout = game.known(selected).slice(0, 4);
    $("loading").hidden = true;
    $("app").hidden = false;
    camp();
    function frame(t) {
      if (view === "expedition") renderer.draw(game, t, target);
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
