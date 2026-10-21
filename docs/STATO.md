# Stato di ripresa — 21 ottobre 2026

Cartella attiva: `/workspace/mystery-depths`. Repository originale
`/workspace/andrea288` lasciato intatto. Non creare worktree o riclonare il lavoro.

## Funzionante

Interfaccia italiana, 29 starter con filtro regioni, selezione mosse, 50 specie,
37 mosse di danno, cinque biomi, mappe con seed, boss ogni cinque piani,
ricompense, livelli, fame, quattro strumenti, salvataggi e ripresa, import/export,
morte e nuova spedizione con progressi conservati. `npm start` avvia su localhost.
WASM e asset sono già inclusi. Avvio Windows via `avvia-windows.bat`.

La prova browser ha superato il boss del quinto piano in 831 turni/16 vittorie,
ripreso un salvataggio e completato morte/nuova run senza errori JavaScript.
Vedere `test-results/browser-journey.json` e `journey.log`.

Il requisito di fedeltà completa EoS resta aperto: leggere CONFORMITA.md prima di
qualunque affermazione. Non aggiungere probabilità o formule dalla serie principale.

## Blocchi di accesso reali

`gh api user` ha verificato l'account **andrea288**. Il repository
`andrea288/mystery-depths` ha risposto 404. La creazione privata ha fallito con
`GraphQL: Resource not accessible by integration (createRepository)`.
Anche POST user/repos via API REST ha restituito 403. Non esiste un remote
configurato e non è stato eseguito un push. Non sostituire
il repository con il profilo pubblico andrea288/andrea288.

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
modificatori di velocità; separare le classi di stato contemporanee; verificare
IA, movimento speciale, trappole e oggetti contro l'originale; aggiungere mosse
di stato, collegamenti, QI, meteo, strumenti tenuti, effetti visivi originali.
La matrice distingue prove dell'applicazione da equivalenza al gioco originale.
