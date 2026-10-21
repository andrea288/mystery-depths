# Mystery Depths — ripresa del progetto in Codex

## Incarico dell'utente
Realizza e completa un browser game roguelite Pokémon, ispirato al combattimento a griglia di Pokémon Mystery Dungeon: Esploratori del Cielo. Non limitarti a un piano: implementa, esegui, correggi e consegna un prodotto giocabile. Prendi autonomamente le decisioni tecniche, artistiche e di bilanciamento. Chiedi chiarimenti solo per impedimenti reali che non puoi risolvere con gli accessi disponibili.

Requisiti richiesti:
- Selezione di qualsiasi starter di qualsiasi regione; al minimo tutti i 27 starter delle nove regioni, più Pikachu ed Eevee già inclusi.
- Dungeon procedurale senza fine, stanze/corridoi sempre nuovi, difficoltà crescente e boss.
- Pokémon, mosse ed effetti autentici; combattimento il più fedelmente possibile a Esploratori del Cielo. L'utente ha richiesto il 100%: NON dichiararlo raggiunto senza dimostrazione.
- Alcune ricompense insegnano mosse permanentemente al Pokémon; altre danno bonus solo nella run. Mantieni separate le due progressioni.
- Uso personale locale, nessuna pubblicazione o deployment. L'utente non desidera un'analisi legale. Conserva comunque provenienza e crediti degli asset.
- Repository Git, avvio semplice sul computer dell'utente (Windows/browser), salvataggio e ripresa, gioco completo e controllato.

## Stato reale del materiale consegnato
Il lavoro è stato interrotto su richiesta dell'utente per passarlo a Codex.
NON è ancora un gioco giocabile. Non esistono index.html, renderer, interfaccia, integrazione dei controlli o test di gameplay.
Repository Git LOCALE inizializzato sul branch main, snapshot di handoff. Nessun repository GitHub remoto creato, nessun push, nessuna pubblicazione. Non confondere Git locale con GitHub.

### File già presenti
- `src/engine.js`: prima bozza del motore JavaScript puro, disponibile come globalThis.MD e CommonJS. Include generatore seedato, stanze/corridoi, cinque biomi, vista/fog, movimento a otto direzioni, IA/pathfinding, danni/stati, zaino, boss ogni cinque piani, ricompense, sblocchi permanenti, export/restore. Sono IMPLEMENTAZIONI PRELIMINARI, non funzionalità collaudate.
- `assets/data.js`: assegna globalThis.GAME_DATA. 50 Pokémon, 50 mosse selezionate, 29 starter, statistiche, compatibilità mosse, tabella tipi, metadata sprite.
- `assets/sprites/{id}/`: Idle, Walk e Attack, relativi fogli PNG e metadata. 150 fogli scaricati.
- `assets/portraits/{id}.png`: 50 ritratti.
- `assets/SOURCES.md`, file di crediti e tracker: provenienza delle risorse.
- `scripts/fetch_assets.py`: pipeline riproducibile per recuperare dati PokeAPI e SpriteCollab. Le cache di download sono escluse dal repository e dall'archivio.

### Verifiche già svolte
- `node --check src/engine.js` riuscito (solo sintassi).
- Il processo asset ha verificato fogli, dimensioni frame, righe direzionali e presenza dei file; ha terminato con successo.
- NESSUN test browser, NESSUNA partita di prova, NESSUNA verifica di equivalenza al gioco originale.

## Limiti e rischi da risolvere PRIMA di presentare il risultato come fedele
1. I parametri delle mosse, statistiche e tipi provengono da PokeAPI (serie principale), NON dai dati originali di Esploratori del Cielo. Anche la formula attuale del danno è una formula semplificata della serie principale; sostituirla/validarla per PMD.
2. Range, probabilità, stati, scelte dell'IA, crescita, fame, cure e alcuni effetti in engine.js sono adattamenti manuali. Non sono una ricostruzione fedele verificata. Alcune mosse nel dataset potrebbero non avere ancora tutti gli effetti implementati. Fai un audit completo prima di abilitarle.
3. Le 50 mosse sono un sottoinsieme, non il catalogo completo. Learnset filtrati dal dataset PokeAPI non provano compatibilità con le regole di EoS.
4. I Pokémon posteriori alla generazione IV non esistevano in EoS: definisci un'estensione esplicita per loro, separata dal nucleo fedele. Gli sprite di generazioni successive provengono dalla community PMDCollab, non sono tutti sprite originali Nintendo DS.
5. Direzioni: i fogli SpriteCollab usano giù, giù-destra, destra, su-destra, su, su-sinistra, sinistra, giù-sinistra. Il DIRS attuale del motore percorre l'altro verso: rimappa gli indici nel renderer o correggi coerentemente il motore. Non invertire i Pokémon.
6. Engine restore/validateRun è preliminare: verifica input ostili/malformati, limiti numerici, consistenza di ricompense, mappe e stato RNG; il motore va revisionato nel complesso.
7. La morte, le ricompense, PP, raggiungibilità scale, danni nel turno e persistenza devono essere testati. Non assumere correttezza perché la sintassi passa.

## Contratto dati di base
GAME_DATA.pokemon[id]: id, name, types (slug inglesi), type, stats (hp, attack, defense, special-attack, special-defense, speed), region, starter, learnset (ID numerici), sprite.
GAME_DATA.moves[id]: id, name (italiano), slug, type, power, pp, accuracy, damageClass, effectChance, meta.
GAME_DATA.typeChart[attackingType][defendingType]: moltiplicatore numerico.
GAME_DATA.starterIds, enemyIds, bossIds, regions.
Sprite metadata: sprite[action] con w, h, durations (tick a 60 Hz) e file. Leggere il file reale per i campi aggiuntivi.
Caricamento di base: assets/data.js, poi src/engine.js. Esempio Node: require('./assets/data.js'); const {Game}=require('./src/engine.js'); const g=new Game(globalThis.GAME_DATA); g.start(1,12345).

## Ricerca già individuata: verificare direttamente le fonti
- https://github.com/PMDCollab/SpriteCollab — sprite e ritratti.
- https://github.com/PokeAPI/pokeapi — dataset attualmente usato; non specifico di PMD.
- https://github.com/UsernameFodder/pmdsky-debug — documentazione reverse engineering di EoS.
- https://github.com/UsernameFodder/damage-eos — reimplementazione del danno EoS, anche web; valutare riuso/port/WASM e limiti dichiarati.
- https://github.com/pret/pmd-sky — disassembly/decompilazione WIP, non un engine browser pronto.
- https://github.com/SkyTemple/skytemple — editor ROM, non un engine browser.
- https://github.com/audinowho/PMDODump e https://github.com/PMDCollab/PMDC — motore/contenuti alternativi da valutare, non automaticamente equivalenti a EoS.
- https://github.com/Minemaker0430/ExplorersOfSkyOrigins — riferimento incompleto con regole modificate, non copia identica pronta.

## Come procedere
1. Leggi le istruzioni locali applicabili, questo handoff, SOURCES.md e tutto il codice. Verifica gli asset; mantieni ciò che è valido e correggi/rifattorizza il resto. Non ricominciare a scaricare tutto senza necessità.
2. Registra requisiti, architettura e stato in file di progetto persistenti. Prepara una matrice di fedeltà (funzione, fonte, test, differenze), senza usare il termine 100% per le parti non provate.
3. Scegli autonomamente lo stack browser appropriato. Canvas/Pixi/Phaser sono opzioni; nessun obbligo di React. Mantieni simulazione, rendering, dati e persistenza separati. Asset locali, nessun login o backend necessario.
4. Implementa menu iniziale, selezione starter per regione con anteprima, scelta delle mosse note, campagna infinita, controlli tastiera (incluse diagonali), mouse/touch se appropriato, HUD leggibile, bersagli/portate, animazioni e feedback degli effetti, nemici, boss e ricompense.
5. Implementa salvataggi versionati di meta-progressione e run, ripresa, export/import, pausa, morte e nuova partita. Una mossa permanente resta sbloccata per la specie; le reliquie di run non devono trasferirsi alla successiva.
6. Completa bilanciamento e varietà. I boss speciali possono avere meccaniche originali dichiarate, ma non attribuirle al gioco originale. Niente placeholder spacciati per asset autentici.
7. Testa invarianti e casi reali: molte mappe/seed con scale raggiungibili, collisioni/diagonali, PP, effetti, immunità, ordine turni, boss, ricompense, reset run, persistenza/import e morte. Esegui QA browser e una partita completa almeno fino al primo boss. Correggi gli errori rilevati.
8. Consegna repository pulito con commit, README italiano, comandi di installazione/avvio/test, avvio Windows semplice e limiti reali. Se un remoto privato è disponibile e autorizzato puoi configurarlo, altrimenti consegna Git locale e dichiaralo. Non pubblicare il gioco.

Non fermarti al piano o a una schermata dimostrativa. Procedi autonomamente fino a un risultato giocabile e verificato, fermandoti soltanto per impedimenti effettivi. Se un requisito non è raggiungibile, non occultarlo né sostituirlo silenziosamente: documenta l'esatto scostamento e completa il resto.
