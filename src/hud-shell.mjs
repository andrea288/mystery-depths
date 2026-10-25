// Lightweight map-side panels. Inventory and management use native modal dialogs.
export function installHudShell() {
  const $ = (id) => document.getElementById(id);
  const directions = {
    "0,-1": "in alto",
    "1,-1": "in alto a destra",
    "1,0": "a destra",
    "1,1": "in basso a destra",
    "0,1": "in basso",
    "-1,1": "in basso a sinistra",
    "-1,0": "a sinistra",
    "-1,-1": "in alto a sinistra",
  };
  for (const b of document.querySelectorAll("[data-direction]"))
    b.setAttribute(
      "aria-label",
      "Direzione " + directions[b.dataset.direction],
    );
  $("bag-shortcut").setAttribute("aria-haspopup", "dialog");
  const frame = document.querySelector(".map-frame"),
    deck = document.querySelector(".command-console");
  const flyout = document.createElement("section");
  flyout.id = "moves-panel";
  flyout.hidden = true;
  flyout.setAttribute("aria-label", "Mosse disponibili");
  flyout.innerHTML =
    '<div class="flyout-heading"><strong>Le mosse</strong><button id="close-moves" aria-label="Chiudi mosse">✕</button></div><p>Scegli una mossa. Nei boss, indica poi la direzione.</p>';
  flyout.append($("move-bar"));
  frame.append(flyout);
  const actions = document.createElement("div");
  actions.className = "primary-actions";
  deck.append(actions);
  const moves = document.createElement("button");
  moves.id = "moves-button";
  moves.textContent = "Mosse";
  moves.setAttribute("aria-controls", "moves-panel");
  moves.setAttribute("aria-expanded", "false");
  for (const el of [
    $("movement-button"),
    moves,
    $("attack-button"),
    $("face-button"),
    $("bag-shortcut"),
  ])
    actions.append(el);
  const tools = document.createElement("button");
  tools.id = "hud-tools-button";
  tools.textContent = "Esplora";
  tools.setAttribute("aria-expanded", "false");
  tools.setAttribute("aria-controls", "adventure-bar");
  document.querySelector(".floor-actions").prepend(tools);
  const setTools = (open) => {
    document.body.classList.toggle("tools-open", open);
    tools.setAttribute("aria-expanded", String(open));
    if (open)
      $("adventure-bar").querySelector("button:not(:disabled)")?.focus();
  };
  tools.onclick = () =>
    setTools(!document.body.classList.contains("tools-open"));
  const closeMoves = (focus = false) => {
    flyout.hidden = true;
    moves.setAttribute("aria-expanded", "false");
    if (focus) moves.focus();
  };
  moves.onclick = () => {
    const open = flyout.hidden;
    flyout.hidden = !open;
    moves.setAttribute("aria-expanded", String(open));
    if (open) flyout.querySelector("[data-move]:not(:disabled)")?.focus();
  };
  $("close-moves").onclick = () => closeMoves(true);
  document.addEventListener("pointerdown", (e) => {
    if (!flyout.contains(e.target) && !moves.contains(e.target)) closeMoves();
    if (!tools.contains(e.target) && !$("adventure-bar").contains(e.target))
      setTools(false);
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (
        !document.body.classList.contains("tools-open") ||
        $("modal").open ||
        $("bag-dialog").open
      )
        return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const bs = [
          ...$("adventure-bar").querySelectorAll("button:not(:disabled)"),
        ];
        if (bs.length)
          bs[
            (bs.indexOf(document.activeElement) +
              (["ArrowUp", "ArrowLeft"].includes(e.key) ? -1 : 1) +
              bs.length) %
              bs.length
          ].focus();
      } else if (["Enter", " "].includes(e.key)) e.stopImmediatePropagation();
      else if (/^[wasdqezc1-4.]$/i.test(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (flyout.hidden) return;
      const keys = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };
      if (keys[e.key]) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const buttons = [
          ...flyout.querySelectorAll("[data-move]:not(:disabled)"),
        ];
        if (buttons.length)
          buttons[
            (buttons.indexOf(document.activeElement) +
              keys[e.key] +
              buttons.length * 2) %
              buttons.length
          ]?.focus();
      } else if (["Enter", " "].includes(e.key)) e.stopImmediatePropagation();
      else if (/^[wasdqezc]$/i.test(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && !$("modal").open && !$("bag-dialog").open) {
        if (!flyout.hidden || document.body.classList.contains("tools-open")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const wasTools = document.body.classList.contains("tools-open");
          closeMoves(!wasTools);
          setTools(false);
          if (wasTools) tools.focus();
        }
      }
    },
    true,
  );
  for (const dialog of [$("modal"), $("bag-dialog")])
    dialog.addEventListener("close", () => {
      document.body.classList.remove("tools-open");
      tools.setAttribute("aria-expanded", "false");
    });
  const empty = document.querySelector(".orientation-controls");
  empty.hidden = true;
  return { closeMoves, setTools };
}
