// Rearrange existing controls rather than duplicate interactive state.
export function installDexLayout() {
  const $ = (id) => document.getElementById(id),
    layout = document.querySelector(".game-layout"),
    column = document.querySelector(".map-column");
  const rail = document.createElement("aside");
  rail.className = "dex-rail";
  rail.setAttribute("aria-label", "Squadra e stato della spedizione");
  layout.prepend(rail);
  rail.innerHTML = '<span class="rail-label">LA SQUADRA</span>';
  for (const id of [
    "team-strip",
    "player-card",
    "status-list",
    "survival-warning",
  ])
    rail.append($(id));
  const console = document.createElement("div");
  console.className = "command-console";
  column.append(console);
  for (const selector of [
    "#move-bar",
    ".orientation-controls",
    ".touch-controls",
    "#tactics-panel",
    "#skip-animation",
  ])
    console.append(document.querySelector(selector));
  document.querySelector(".expedition-title").after($("adventure-bar"));
  const log = document.createElement("div");
  log.className = "dex-log";
  log.innerHTML =
    '<span class="signal-dot"></span><span id="dex-message">La spedizione ti aspetta.</span><button id="dex-journal" aria-label="Apri il diario">Diario</button>';
  column.append(log);
  $("dex-journal").onclick = () => $("journal-button").click();
  const bag = document.createElement("dialog");
  bag.id = "bag-dialog";
  bag.setAttribute("aria-label", "Zaino della spedizione");
  bag.innerHTML = '<button id="close-bag" aria-label="Chiudi zaino">✕</button>';
  bag.append(document.querySelector(".bag-panel"));
  document.body.append(bag);
  $("close-bag").onclick = () => bag.close();
  bag.addEventListener("click", (e) => {
    if (e.target === bag) {
      const r = bag.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        bag.close();
    }
  });
  const moved = document.createElement("button");
  moved.id = "movement-button";
  moved.textContent = "Muovi";
  document.querySelector(".orientation-controls").prepend(moved);
  const journal = document.querySelector(".sidebar");
  journal.hidden = true;
}
