# Asset and data provenance

- Pokémon dungeon sprites and portraits: https://github.com/PMDCollab/SpriteCollab (downloaded 2026-10-20). These include community-contributed sprites, especially later generations; they are not all original Nintendo DS assets. Individual credits are retained in spritebot_credits.txt and tracker.json.
- Pokémon names, base stats, types, move names, move data, type efficacy and learnset membership: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv (downloaded 2026-10-20).
- Learnset membership is the union across available PokeAPI version groups and methods, restricted to the curated moves implemented by this game. It does not imply a move is available in every generation.
- Move power, accuracy, PP, effects and type chart are main-series data; they are NOT the original Explorers of Sky move data. Game combat is a custom adaptation.
- Sprite direction row order follows PMDCollab: down, down-right, right, up-right, up, up-left, left, down-left. Frame durations are in 1/60-second ticks.
- Rebuild with python3 scripts/fetch_assets.py (requires internet). Gameplay uses only local bundled assets.

## Missing or substituted actions
None: every Pokémon has Idle, Walk and Attack art plus a portrait. Action aliases, if any, are recorded in data.js sourceAction/file fields.
