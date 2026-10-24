# Stato di ripresa — 23 ottobre 2026

Cartella attiva: `/workspace/mystery-depths`. Repository originale
`/workspace/andrea288` lasciato intatto. Non creare worktree o riclonare il lavoro.

## Funzionante

Interfaccia italiana, 29 starter iniziali e sblocchi tramite reclutamento, selezione mosse, 53 specie,
47 mosse di danno (46 EoS + Magibrillio adattato), 18 biomi, mappe con seed, boss ogni cinque piani,
ricompense, livelli, fame, dodici strumenti, salvataggi e ripresa, import/export,
morte e nuova spedizione con progressi conservati. `npm start` avvia su localhost.
WASM e asset sono già inclusi. Avvio Windows via `avvia-windows.bat`.

La prova browser ha superato il boss del quinto piano in 716 turni/13 vittorie,
ripreso un salvataggio e completato morte/nuova run senza errori JavaScript.
Vedere `test-results/browser-journey.json` e `browser-journey.log`.

Il requisito di fedeltà completa EoS resta aperto: leggere CONFORMITA.md prima di
qualunque affermazione. Non aggiungere probabilità o formule dalla serie principale.

## Repository e accesso

Il proprietario ha creato `andrea288/mystery-depths` e autorizzato il push.
`origin` punta a quel repository; `main` è stata caricata e il commit remoto
è stato verificato. GitHub mostrava il repository come pubblico al momento
del caricamento. Il proprietario ha dichiarato che lo renderà privato.
L'integrazione GitHub non può cambiarne la visibilità: PATCH ha restituito 403.
Non confondere questo repository con il profilo `andrea288/andrea288`.

Il post Reddit richiesto dall'utente non è stato letto: inizialmente il proxy
restituiva CONNECT 403; ora la pagina restituisce solo una challenge e il JSON
risponde 403. Il dominio è stato aggiunto alla bozza di rete,
che richiede pubblicazione dell'ambiente per diventare effettiva. Non attribuire
al post consigli che non sono stati letti.

## Sorgenti, ambiente e riproduzione

- Riferimenti fissati in `/workspace/references/`; toolchain emsdk 3.1.29 installata.
- `scripts/test_native.py`: 64 test upstream; `build_live_wasm.py --native-only`:
  adattatore per confronto C++/WASM. Senza flag ricompila gli asset WASM.
- `scripts/prepare_game_data.py`: assembla dati EoS e conversioni moderne.
- `extract_growth.py`: decodifica PKDPX con skytemple-rust 1.8.5; verifica tutte
  le 5.000 righe di crescita contro una seconda rappresentazione (damage-eos).
- `extract_effects.py`: costanti dalle ASM PRET; sorgente al percorso references.
- `prepare_animation_data.py`: metadati e ancoraggi per i 50 Pokémon.
- `src/engine.js`: supporto mappe/IA/progressi; le vecchie formule e reliquie sono
  state rimosse dal runtime. Copia integrale originale in research/handoff.
- Archivio utente originale preservato in `/workspace/preservation/`.
- Chromium di sistema disponibile; il download del browser Playwright era
  bloccato, quindi i test usano `/usr/bin/chromium`.

## Priorità residue

Completare gli effetti specifici ancora mancanti, scheduler frazionario e
modificatori di velocità; completare le interazioni fra classi di stato; verificare
IA, movimento speciale, trappole e oggetti contro l'originale; aggiungere mosse
di stato, collegamenti, QI, meteo, strumenti tenuti, effetti visivi originali.
La matrice distingue prove dell'applicazione da equivalenza al gioco originale.

## Aggiornamento gruppi di stato

Meccaniche v4: stati separati per classi sleep/burn/frozen/cringe; timer
indipendenti e sostituzione esclusiva all’interno della stessa classe.
Costanti dei danni periodici estratte dalle ASM; countdown iniziale zero e
risveglio; Poison Heal gestito nel tick del veleno. Turbofuoco scongela prima
del danno. Nessuna nuova attivazione di confusione o rallentamento finché
non viene implementato il comportamento completo.

Import v3 validato prima di convertire, senza mutare l’input; durata e tempo
restante al prossimo danno preservati. La chiave browser resta
`mystery-depths-v3` per trovare i salvataggi esistenti. HUD mostra gli stati
simultanei. 37 test JS e percorso browser fino al piano 6 superati.

## Grafica pixel, comandi e bilanciamento

Interfaccia rifatta con VT323 locale, cornici pixel, HUD compatto e PS/Pancia
sopra la mappa su mobile. Icone strumenti PokeAPI fissate; SVG originali per
Semedormita e forziere. Provenienza e hash: assets/ui-sources.json.
Renderer con interpolazione dei passi, affondo, reazione ai colpi, particelle
per tipo e oggetti animati; rispetta prefers-reduced-motion. Le aree cliccabili
seguono i Pokémon durante il movimento. Non sono effetti originali di EoS.

Orienta attiva la rotazione gratuita tramite pad, mappa e tastiera; clic destro
sulla mappa sempre disponibile. Prova browser mouse/touch verifica invarianti
di turno, Pancia, PP, nemici e RNG, più persistenza dopo reload.

Bilanciamento del generatore roguelite: primi quattro piani con stanze alternate
senza nemici, specie resistenti introdotte più tardi, una Baccarancia, un Elisir
Max e una Mela garantiti nei piani normali. Trappole dal quarto piano al 25%
per stanza. Livelli nemici 2+floor(piano×0,85)+0..1, guardiani piano+4, limite
100. Formule del danno, crescita, PP e fame EoS non alterate.
Per rigenerare il download: python scripts/package_runtime.py.

## Aggiornamento animazioni

Sequenza visiva indipendente dalla simulazione, 25 fogli locali per 37 mosse,
otto nuovi strumenti e opzioni persistenti. Elenco completo delle 50 modifiche
in MIGLIORAMENTI-50.md. Salvataggi con meccaniche v5, migrazione da v3/v4.

Verifiche del 23 ottobre: 37/37 test automatici, percorso reale fino al piano 6
in 853 turni con 15 vittorie, ripresa, morte e nuova partita. Prove desktop/touch
e animazioni eseguite anche contro lo ZIP estratto: nessun errore JS o asset 404.

## Squadra e guardiani: aggiornamento completato

L'applicazione usa `src/team.mjs`, che estende il motore EoS di `src/game.mjs`.
Squadra di sei membri, tre attivi, starter obbligatorio, reclutamento deduplicato
a ogni piano e sblocco permanente degli starter. Alleati autonomi nei piani
ordinari; schieramento e ordini individuali nei boss, senza IA alleata.
Ogni cambio/ritiro consuma un turno della squadra. KO dello starter = fine run.
Salvataggi meccaniche v6 con migrazione dalle versioni 3–5.

18 guardiani, palette e incontri favoriti per tipo. Aggiunti Butterfree, Dewgong
e Clefable con sprite e crescita EoS; nove mosse EoS aggiuntive e l'estensione
Magibrillio/Folletto dichiarata in SQUADRA-E-GUARDIANI.md.

Verifiche finali: 50/50 test automatici; browser fino al piano 6 in 716 turni
con 13 vittorie e cinque compagni reclutati, ripresa, morte e nuova partita.
Test dello ZIP estratto: squadra desktop/touch, reclutamento (due Zubat = una
scelta), nuovo starter giocabile, orientamento gratuito, animazioni e preferenze.
Nessun errore JavaScript nelle prove completate.
