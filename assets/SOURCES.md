# Asset and data provenance

**Nota sul runtime attuale:** le prime righe descrivono i dati del prototipo
archiviato. Il runtime usa `assets/game/data.json`, le tabelle EoS estratte da
PRET e `damage-eos` in WASM. Per statistiche, mosse, tipi e learnset correnti
valgono `docs/CONFORMITA.md` e i relativi moduli dichiarati, non i dati
main-series del prototipo.

## Provenienza storica del prototipo

- Pokémon dungeon sprites and portraits: https://github.com/PMDCollab/SpriteCollab (downloaded 2026-10-20). These include community-contributed sprites, especially later generations; they are not all original Nintendo DS assets. Individual credits are retained in spritebot_credits.txt and tracker.json.
- Pokémon names, base stats, types, move names, move data, type efficacy and learnset membership: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv (downloaded 2026-10-20).
- Learnset membership is the union across available PokeAPI version groups and methods, restricted to the curated moves implemented by this game. It does not imply a move is available in every generation.
- Move power, accuracy, PP, effects and type chart are main-series data; they are NOT the original Explorers of Sky move data. Game combat is a custom adaptation.
- Sprite direction row order follows PMDCollab: down, down-right, right, up-right, up, up-left, left, down-left. Frame durations are in 1/60-second ticks.
- Rebuild with python3 scripts/fetch_assets.py (requires internet). Gameplay uses only local bundled assets.

## Missing or substituted actions
None: every Pokémon has Idle, Walk and Attack art plus a portrait. Action aliases, if any, are recorded in data.js sourceAction/file fields.

## Interfaccia pixel e strumenti (22 ottobre 2026)

Le icone Baccarancia, Elisir Max e Mela provengono da PokeAPI/sprites, al commit
97a7832d307311c0e1c6ea9035308bf80cc94f81. Sono icone Pokémon, non una dichiarazione
di identità con gli sprite strumenti di EoS. I diritti delle immagini Pokémon
restano dei rispettivi titolari. Semedormita e forziere sono piccoli disegni SVG
originali del progetto, realizzati su griglia 32×32. Pavimenti, pareti ed effetti
sono disegnati dal renderer; non sono estrazioni dal gioco originale.

VT323 di Peter Hull, Google Fonts commit 45e3d5269e4a17d823f6d84470bc084dc5ae46f6:
licenza SIL Open Font License 1.1 conservata in `fonts/OFL.txt`.
URL fissati e SHA-256 sono in `ui-sources.json`; script riproducibile:
`python scripts/fetch_ui_assets.py`. Tutto viene servito localmente.

## Effetti e nuovi strumenti (23 ottobre 2026)

25 fogli da PMDCollab/RawAsset, commit
`03c80dad937911572f8fb19903771a47956fc696`, cartella Particle.
URL, dimensioni, numero di frame e SHA-256: `effects/manifest.json`.
Scaricamento riproducibile: `scripts/fetch_move_effects.py`.
Le associazioni alle mosse e le sequenze temporali sono adattamenti del progetto,
non animazioni EoS certificate identiche all'originale.
Le nuove icone provengono da PokeAPI/sprites (bacche) e PMDCollab/RawAsset
(semi e mele), con URL fissati e SHA-256 in `items/sources-extra.json`.
La disponibilità pubblica non costituisce una licenza MIT per tutta la grafica:
i diritti Pokémon restano dei rispettivi titolari; non si estende la licenza
del codice PMDC alle immagini. Tutti questi asset sono serviti localmente.

## Squadra e nuovi tipi (23 ottobre 2026)

Butterfree (#12), Clefable (#36) e Dewgong (#87): SpriteCollab, commit
9d905ec258c39b1846d33629e5ba47cb8e49dfa8. Sprite, ritratti e crediti individuali
sono conservati nelle cartelle assets/pokemon; manifesti in data/assets-extra.json.
Nuove estrazioni di crescita EoS in data/eos-growth.json.
Nome italiano Magibrillio: PokeAPI, fonte e hash in data/fairy-move-source.json.
Effetto visivo: foglio Healing_Wish_Hit già attribuito a PMDCollab/RawAsset,
adattato al progetto. La mossa e il tipo Folletto sono estensioni dichiarate.
