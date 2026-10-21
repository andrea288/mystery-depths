# Architettura

Il browser carica solo risorse locali. `scripts/serve.mjs` è un server statico
Node senza dipendenze runtime, limitato a localhost e ai percorsi pubblici.

- `src/app.mjs`: schermate, input, HUD, scelta ricompense, import/export e archivio
  atomico localStorage. Nessuna funzione di debug modifica la partita.
- `src/render.mjs`: Canvas 2D, nebbia, minimappa, animazioni SpriteCollab,
  frame a 60 Hz, ancoraggi ombra e numeri di danno. La logica non dipende dal frame rate.
- `src/game.mjs`: simulazione attiva, chiamata WASM, dati EoS, strumenti,
  crescita, ricompense e validazione dello stato completo.
- `src/engine.js`: mappe e IA dell'estensione roguelite, utilità geometriche,
  cronologia e normalizzazione del profilo. Derivato dal handoff, ma privato
  dei vecchi metodi di danno, statistiche della serie principale e reliquie.
- `src/core/live_damage.cpp`: adattatore nativo/WASM del calcolatore damage-eos.
  `build_live_wasm.py` applica RNG reale a una copia del submodule, mai al riferimento.
- `src/core/dungeon-rng.mjs`: PRNG originale, con test differenziale contro PRET.
- `assets/game/data.json`: 50 specie, crescita e apprendimenti EoS, 37 mosse,
  nomi italiani ufficiali e conversioni esplicite post-EoS.
- `assets/game/animations.json`: metadati derivati dai manifesti e dai fogli ombra.
- `data/source/`: dati sorgente necessari alla ricostruzione, con versioni nelle fonti.

I moduli `src/persistence/profile.mjs` e `src/roguelite/dungeon.mjs` conservano
le prove isolate precedenti. Il profilo isolato NON è il formato del salvataggio
integrato; il generatore isolato NON è quello usato dalla partita. La partita
riusa da dungeon.mjs soltanto l'incremento validato dei piani oltre 2^53.

## Casualità e salvataggi

Il generatore delle mappe e le scelte IA usano il PRNG roguelite del handoff;
il danno e gli effetti implementati usano il PRNG EoS. Questa separazione è una
differenza dichiarata dal motore originale. Entrambi gli stati sono salvati.
L'archivio contiene `version:1`, `meta` e `run.mechanicsVersion:3`.
I piani sono numeri interi sicuri, poi stringhe decimali fino a 128 cifre.
Livelli limitati a 100; ricompense monetarie limitate per evitare overflow.
La crescita conserva i limiti delle tabelle EoS.

La sequenza corrente è giocatore → nemici → stati/fame. Non è ancora lo
scheduler frazionario originale. Nessun risultato di test del calcolatore
certifica automaticamente questa sequenza.
