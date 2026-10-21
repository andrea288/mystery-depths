# Verifiche eseguite

Ambiente Linux, Node.js 24, Chromium di sistema 154, Playwright 1.56.1,
Emscripten 3.1.29, GCC 14.2.0. I comandi sono in README.

- 64 casi upstream C++ damage-eos: superati; report `native-tests.xml`.
- PRNG C/JS: 36.000 risultati/transizioni confrontati.
- WASM/C++ con RNG attivo: 256 configurazioni identiche, incluse mosse,
  statistiche e semi differenti. È parità fra build, non prova completa ROM.
- Mappe: 2.000 configurazioni del generatore isolato e altre 2.000 del runtime;
  raggiungibilità delle scale e validazione dei salvataggi.
- 29 starter: avvio, mosse valide, roundtrip e replay dopo ripresa.
- Ricompense, permanenza per specie, morte, reset provviste, importazioni
  invalide senza mutazioni, contatori oltre 2^53, crescita/recupero, multicolpo.
- Crescita: 5.000 righe da monster.md/m_level.bin contro levelup-stats DAMAGE.
- Asset: 50 specie, 922 file con hash, 770 PNG decodificati, 50 Walk a otto righe.
- Testi: 18.482 stringhe decodificate e ricodificate senza differenze; 5.042
  testi selezionati estratti in italiano.

## Browser reale

`tests/browser/smoke.mjs`: avvio, 29 schede, input, autosave/reload,
viewport desktop 1440×1100 e mobile 390×844. Nessun errore JavaScript.

`tests/browser/journey.mjs`: Treecko, seed 314159; esplorazione con tastiera,
combattimenti, ricompensa permanente, ripresa dopo reload, guardiano Onix al
piano 5, accesso al piano 6 (831 turni, 16 vittorie), morte attraverso azioni
normali, nuova spedizione. Mosse conservate; livello 5 e provviste iniziali
ripristinati. Nessuna mutazione dello stato della partita per vincere.
L'automazione legge una copia del salvataggio per scegliere i comandi.

Sono stati corretti difetti rilevati dalle prove: canvas che cambiava altezza
continuamente, Invio che selezionava involontariamente una ricompensa,
coordinate della mappa non aggiornate in tempo dopo un'azione e crescita/XP
provvisori provenienti dal handoff.

I primi tentativi persi durante il bilanciamento non sono spacciati per prove
superate. I log finali e screenshot riproducibili sono in `test-results/`.

Non provati: esecuzione su Windows, confronto integrale con ROM/emulatore,
interazioni di tutte le meccaniche elencate come aperte in CONFORMITA.md.
