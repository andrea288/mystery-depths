# Verifiche eseguite

Macchina Linux, 20 ottobre 2026. I log sono in `test-results/`.

| Verifica | Risultato | Limite della prova |
| --- | --- | --- |
| Build nativa damage-eos, commit fissato | Superata | Non è una build del gioco completo |
| Suite upstream C++ | 64 test passati, 0 falliti, 0 saltati | Non è un confronto con l'originale indipendente dal port |
| Esempio CLI upstream | Danno 21–28, precisione 90%, critico 40% per il sample fornito | Valori del sample con modificatori, non statistiche universali |
| PRNG JS contro funzioni C PRET | 36.000 risultati e transizioni coincidenti | Nessuna verifica dell'ordine di chiamata nel motore o contro una ROM |
| Generatore mappe | 2.000 seed/piani con tutte le celle raggiungibili | Non prova il movimento originale |
| Profilo permanente | Test apprendimento, equipaggiamento, import/export, input invalido e quota superati | Nessuna run completa salvata/ripresa nel browser |
| Italiano | 18.482 stringhe roundtrip; 5.042 esportate, 29 starter nominati | Tag da rendere e copertura UI ancora da implementare |
| Asset | 553 file verificati, 464 PNG decodificati | Non prova animazione o effetti nel browser |
| Ispezione visiva | Tavola dei 29 ritratti e frame esaminata | Non è QA del gioco |
| API GitHub | Bloccata: CONNECT 403 Forbidden | Identità autenticata e visibilità repository non verificabili |
| Toolchain Emscripten 3.1.29 | Bloccata: CONNECT 403 verso storage.googleapis.com | Nessuna build WASM o QA browser completati |
| Windows | Non eseguito | Script fornito solo per verifiche di sviluppo, non avvio del gioco |

La suite JavaScript comprende 16 test: 4 generatore, 6 profilo, 3 RNG,
3 localizzazione. Le 36.000 righe di confronto RNG e le 2.000 mappe sono
iterazioni interne a questi test, non 38.000 test case distinti.

## Problema di build corretto

Catch2 3.2.1 dipendeva indirettamente dall'inclusione di `cstdint`.
Con GCC 14 il build falliva su `uint8_t` e `std::uint64_t`. Il flag
`-include cstdint` ripristina l'header standard mancante; codice, asserzioni
e dipendenze upstream sono rimasti invariati.

## Non eseguito

Il percorso starter → esplorazione → combattimento → boss → ricompensa →
salvataggio/ripresa → morte → nuova run non è eseguibile nello stato attuale.
Non è stata aperta un'app di gioco nel browser. La conformità dell'intero
combattimento resta non verificata, come indicato nella matrice.
