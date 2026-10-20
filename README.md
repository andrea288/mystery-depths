# Mystery Depths

**Progetto in lavorazione: non è ancora un gioco utilizzabile.**
Il requisito di combattimento identico a *Pokémon Mystery Dungeon:
Esploratori del Cielo* rimane aperto. Non è stato pubblicato alcun sito.
Non esiste ancora un remoto privato verificato per questo progetto.

La specifica integrale è in [docs/SPECIFICA.md](docs/SPECIFICA.md).
La richiesta aggiuntiva dell'utente è vincolante: interfaccia in italiano,
terminologia Pokémon ufficiale, nessuna traduzione inventata.

## Materiale e codice presenti

- Calcolatore `damage-eos` fissato come submodule, compilato e testato in C++.
  È un riferimento parziale, **non** l'intero motore del combattimento.
- Port JavaScript del generatore casuale del dungeon originale, confrontato
  su 36.000 risultati e transizioni con le funzioni C di `pret/pmd-sky`.
- Generazione delle mappe roguelite separata dalle regole originali,
  riproducibile e verificata su 2.000 combinazioni seed/piano.
- Persistenza del profilo permanente, apprendimento per specie, quattro
  mosse equipaggiate, importazione/esportazione validata. Non comprende
  ancora il salvataggio dello stato completo di un combattimento.
- Asset locali dei 29 starter: ritratti, animazioni Idle/Walk/Attack/Hurt/Faint,
  offset, ombre, tempi XML, provenienza e crediti. Nessun servizio esterno
  serve per leggere questi file.
- 5.042 testi italiani estratti senza traduzioni da `text_i.str` di EoS.
  Decoder SkyTemple conservato con licenza; 18.482 stringhe decodificate
  e ricodificate con identità dei byte.
- Nomi italiani dei 29 starter da PokeAPI, utilizzata **solo per denominazioni**.

Le animazioni non sono ancora integrate in un renderer. Gli effetti delle
mosse, il sistema completo dei turni, l'IA, le schermate e il ciclo giocabile
non sono implementati. I test esistenti non attestano queste funzionalità.

## Verifica locale su Linux

Prerequisiti: Git, Python 3.12, Node.js 22 o superiore, compilatori C/C++,
Make. Nessun backend o account di gioco.

```sh
git submodule update --init --recursive
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python scripts/test_native.py
.venv/bin/python scripts/verify_assets.py
.venv/bin/python scripts/extract_italian.py
.venv/bin/python scripts/rng_reference.py
npm test
```

Il compilatore C viene invocato come `cc` per il confronto RNG.
`test-results/` contiene i risultati reali, incluso JUnit dei test C++.
Gli asset sono già presenti; `python3 scripts/fetch_assets.py` li riscarica
dal commit fissato se necessario.

## Windows

`verifica-windows.bat` prepara l'ambiente Python e verifica asset, testi e
calcolatore nativo. Richiede Python 3, Git e Visual Studio Build Tools con C++.
Il percorso Windows è predisposto ma **non eseguito in questo ambiente Linux**.
Non esiste ancora un comando di avvio del gioco: presentare uno script di
verifica come avvio del prodotto sarebbe scorretto.

## Blocchi attuali

Il proxy dell'ambiente rifiuta con `403 Forbidden`:

1. `api.github.com`: impossibile verificare l'account e creare/ispezionare
   il repository privato `mystery-depths`. `GH_TOKEN` è presente; non è stato
   stampato e non è ancora stato possibile provarne l'autorizzazione API.
2. `storage.googleapis.com`: download della toolchain Emscripten 3.1.29,
   richiesta per compilare il riferimento C++ in WebAssembly.

Le due aggiunte di rete sono salvate nella bozza dell'ambiente. Lo strumento
richiede revisione, salvataggio nelle impostazioni e pubblicazione
**dell'ambiente**, non del gioco. Il salvataggio della bozza non ha applicato
le modifiche alla rete della macchina.

Sbloccare questi accessi permette di proseguire; non completa automaticamente
il gioco né risolve tutte le attività elencate nella matrice.

## Continuità

Leggere [STATO.md](docs/STATO.md), [ARCHITETTURA.md](docs/ARCHITETTURA.md),
[FONTI.md](docs/FONTI.md) e [CONFORMITA.md](docs/CONFORMITA.md) prima di riprendere.
Non sostituire regole mancanti con formule generiche della serie principale.
Non pubblicare il progetto; verificare `private: true` prima di qualsiasi push.
