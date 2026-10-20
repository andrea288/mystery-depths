# Architettura e decisioni

## Confini presenti

| Percorso | Responsabilità |
| --- | --- |
| `src/core/dungeon-rng.mjs` | Port del PRNG originale, stato serializzabile |
| `third_party/damage-eos/` | Riferimento C++ parziale; test e binding WASM upstream |
| `src/roguelite/dungeon.mjs` | Generazione mappe dell'estensione; RNG indipendente |
| `src/persistence/profile.mjs` | Profilo permanente validato, mai risorse temporanee |
| `src/i18n/official-italian.mjs` | Accesso ai nomi italiani ufficiali, nessun fallback inglese |
| `data/assets.json` | Metadati, hash, provenienza, frame e crediti degli starter |
| `data/i18n/` | Lessico italiano estratto e catalogo starter |
| `scripts/` | Acquisizione riproducibile e verifiche |
| `research/` | Documentazione upstream e sorgenti usati nel confronto |
| `tests/`, `test-results/` | Prove eseguite e relativi risultati |

Rendering, input, scheduler originale, combattimento integrato, progressione
della run e UI devono ancora essere sviluppati. Non sono sostituiti da mock.

## Versione

Regole: EoS nordamericano (NA), riferimento `pret/pmd-sky` fissato.
Testi: EoS europeo, lingua italiana. Gli offset dei messaggi EU non devono
essere usati come offset NA. I cataloghi conservano separatamente categoria
e indice iniziale nella tabella EU. Gli indici delle descrizioni non vanno
assunti equivalenti agli ID delle mosse senza verificare il mapping originale.

Nessun tipo Folletto, statistica della serie principale, probabilità o
conversione moderna è stato introdotto nel nucleo. Le specie successive a
EoS sono marcate `post-eos`; le conversioni di statistiche, abilità e
apprendimento sono ancora da definire e verificare come estensioni.

## Motore

Riutilizzare codice originale o port verificati. `damage-eos` è utile come
comparatore e libreria, ma usa `MockDungeonRNG`, calcola intervalli e probabilità
e non gestisce tutta la simulazione. Un risultato medio del calcolatore
non deve essere usato come danno reale. La presenza di un nome di mossa nel
catalogo non dimostra che l'effetto della mossa sia implementato.

Il PRNG portato riproduce le funzioni di `dg_random.c` confrontate con il C.
Non dimostra l'ordine delle chiamate del motore originale, gli effetti di
fine turno o `CalcStatusDuration`. Il suo stato non viene consumato dalla
generazione delle mappe roguelite.

## Estensioni già implementate

Mappe di 56×32 celle, sei stanze, corridoi ortogonali, almeno un ciclo.
Boss previsto ogni quinto piano; il flag non crea ancora un boss.
Quattro identificatori di bioma, senza grafica del terreno ancora associata.
Gli spawn restituiscono posizioni, non nemici funzionanti o trappole attive.
Nessun moltiplicatore di danno o immunità aggiuntiva.

Il piano è una stringa decimale e viene incrementato con BigInt; non passa
attraverso un Number. Nessun ultimo piano di design. Limite tecnico esplicito:
128 cifre, rifiutato senza overflow; non è una promessa di infinità matematica.
La quantità di spawn è limitata per contenere risorse e complessità.

Persistenza: chiave `mystery-depths:profile:v1`. Import con limite di 1 MiB,
versione esplicita, whitelist delle proprietà, catalogo mosse per specie
obbligatorio, nessun overwrite in caso di input invalido. Il catalogo
apprendibile completo EoS deve ancora essere estratto; quello dei test è
una fixture ristretta e non può diventare il catalogo del gioco.

## Italiano

Terminologia originale: estrazione di `text_i.str`, senza ritraduzione né
modernizzazione della grafia. Termini come “Palla Gelo” sono conservati
come appaiono nell'edizione scelta. I testi contengono tag originali:
non inserirli mai come HTML non filtrato.

Contenuti nuovi del roguelite: testi scritti direttamente in italiano.
I concetti Pokémon preesistenti devono comunque riferirsi al lessico ufficiale.
Per gli starter moderni, PokeAPI serve solo a recuperare i nomi italiani,
mai a giustificare regole PMD.
