# Fonti, versioni e crediti

Esame iniziale del 20 ottobre 2026. I README recuperati sono conservati in
`research/`, con i commit in `research/sources.jsonl`.

| Progetto | Commit | Esito dell'esame |
| --- | --- | --- |
| PMDCollab/SpriteCollab | `9d905ec258c39b1846d33629e5ba47cb8e49dfa8` | Asset e metadati. Scaricati ritratti e cinque animazioni per 29 specie, offset/ombre e crediti. Non contiene il motore. |
| UsernameFodder/pmdsky-debug | `c72fe675919ec83cfe93f687973afae85e00d1a3` | Simboli, header e documentazione; non un eseguibile del gioco. |
| UsernameFodder/damage-eos | `a1fa84ce0f436e5a2887943e807839372f26a245` | C++17, CMake, nlohmann/json, CLI11, Catch2; binding Emscripten. Mancano casi speciali; usa MockDungeonRNG. Compilato e testato. |
| pret/pmd-sky | `e3f02199ebe9e263ee67b07f36b3f240f83ef5d9` | Disassembly/decompilazione WIP, C e ARM assembly; build DS con MWCC/Nitro SDK. Alcune routine di dungeon sono ancora assembly. Non è già un motore browser. Estratti PRNG C e testi italiani. |
| SkyTemple/skytemple | `f78d0ef387dbc121bad4c8f0186237f9a4ae035d` | Editor ROM desktop Python, non motore di combattimento. Rimanda a skytemple-files per i formati. |
| audinowho/PMDODump | `68965e74c2f627bcdcffae78c9e1ec1c1b13968a` | Dati, generatore e distribuzione PMDO; motore nei submodule, build .NET desktop. |
| PMDCollab/PMDC | `5f6f893746375e7ffb461eec14372956a740b8af` | Motore alternativo con RogueEssence, NuGet e target desktop. Non assunto equivalente a EoS. |
| Minemaker0430/ExplorersOfSkyOrigins | `0507c4a55b5841b1afe880c09f5c53afb77ca3f6` | README dichiara combattimento rielaborato, QI irrilevante, mosse collegate non supportate e storia incompleta. Non soddisfa il vincolo prioritario. |
| PokeAPI/pokeapi | `2bf639e5572812a67d2b94903fdcb9d095f5aeb2` | Dati integrativi; recuperati solo CSV lingue e nomi delle specie. Nessuna statistica o regola usata come fonte PMD. |
| SkyTemple/skytemple-files | `5ed359a2560a1f04666b9ea02b71649b89cb16d7` | Decoder stringhe e indice EU, usati per estrarre italiano senza traduzione manuale. |
| emscripten-core/emsdk | `0b2084f40444818e4478a93009e2dd4426e14762` | Tag 3.1.29, versione della CI di damage-eos. SDK installato e usato per compilare il modulo WebAssembly locale. |

I progetti alternativi sono stati esaminati per documentazione e requisiti:
non sono stati compilati e non se ne dichiara verificato il comportamento.

## Dipendenze di build

- CMake 3.31.6, GCC/G++ 14.2.0 nella macchina verificata.
- Catch2 `ab6c7375be9a8e71ee84c6f8537113f9f47daf99` (3.2.1).
- CLI11 `c2ea58c7f9bb2a1da2d3d7f5b462121ac6a07f16` (2.3.1).
- nlohmann/json 3.11.2, archivio release richiesto da CMake upstream.
- Header pmdsky-debug transitivi di DAMAGE:
  `81e5b681ed2d35049c44f2f0205ba962e9abb452`.
  Questo pin è distinto dal checkout di documentazione più recente.
- Pillow 12.3.0 per controllo PNG e tavola di QA.

La build iniziale di Catch2 con GCC 14 falliva per `cstdint` non incluso.
Il comando riproducibile passa `-include cstdint`, senza modificare il codice
upstream, rimuovere test o indebolire le verifiche.

## Crediti

Pokémon e materiale originale appartengono ai rispettivi titolari;
la provenienza è registrata, senza attribuire una licenza nuova al materiale.
I crediti Chunsoft e degli autori community per ogni sprite/ritratto sono in
`assets/pokemon/<numero>/sprite-credits.txt` e `portrait-credits.txt`.
La corrispondenza autore/contatto è in `assets/credits/SpriteCollab-authors.tsv`.
La policy del progetto SpriteCollab è conservata insieme ai crediti.

`damage-eos` conserva `LICENSE.txt` nel submodule e i propri riferimenti.
Il codec SkyTemple e il file di configurazione provengono da skytemple-files;
la licenza GPL-3.0 e gli avvisi originali sono conservati in
`third_party/skytemple-codec/`. Nessuna licenza generale del progetto viene
qui estesa automaticamente ad asset, testi o sorgenti di terzi.

## Integrazione del handoff e dati aggiuntivi

Il materiale dello ZIP è conservato in research/handoff. I dati principali
del handoff non sono una fonte valida per le regole EoS: le loro statistiche,
formule, reliquie e probabilità sono state sostituite o escluse dal runtime.

`waza_p.bin`, `monster.md`, `m_level.bin` provengono dal pin PRET sopra
indicato. Il decoder PKDPX è skytemple-rust 1.8.5. Il formato delle righe
di crescita è documentato in CODEC data/level_bin_entry/model.py. Gli estratti
ASM/C pertinenti sono conservati in research/pmd-sky. Le costanti degli effetti
sono estratte da questi file da scripts/extract_effects.py.

La conversione post-EoS usa specie donatrici dichiarate in
data/post-eos-conversions.json, senza presentarle come dati originali dei
Pokémon moderni. Il catalogo contiene 37 mosse offensive originali; non
contiene tutte le mosse o le abilità richieste dal progetto finale.

La guida Reddit richiesta non è stata acquisita: il primo accesso era bloccato
dal proxy; il successivo ha restituito soltanto una pagina challenge Reddit,
mentre l'endpoint JSON risponde 403. Nessun consiglio è attribuito al post.
