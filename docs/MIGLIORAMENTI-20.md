# Le 20 aggiunte — 24 ottobre 2026

Queste funzionalità sono nel gioco, non una lista di proposte. Restano valide le
regole della squadra: massimo sei Pokémon, tre in campo, starter obbligatorio,
KO dello starter = fine spedizione. Gli alleati sono autonomi nei piani normali;
contro i boss ogni membro attivo riceve un ordine manuale prima della risoluzione.

| # | Aggiunta | Come funziona |
|---|---|---|
| 1 | Anteprima degli ordini | Frecce e numeri sulla griglia mostrano le azioni pianificate; le destinazioni in conflitto sono arancioni e bloccano la conferma. |
| 2 | Intenzioni dei boss | Caselle rosse indicano l’attacco prossimo, blu il movimento. L’intenzione resta fissata durante la scelta degli ordini. |
| 3 | Boss in tre fasi | Sotto il 66% e il 33% dei PS cambiano ampiezza degli attacchi e coperture dell’arena. |
| 4 | Tattiche degli alleati | Da **Squadra → Mosse, tattica ed evoluzione** scegli Seguimi, Proteggimi, Attacca o Conserva i PP. Valgono nei piani normali. |
| 5 | Cure mirate | Seleziona una cura nello Zaino e scegli il membro destinatario. Nei boss lo strumento occupa l’ordine dello starter. |
| 6 | Esperienza condivisa | I compagni attivi ricevono esperienza dalle vittorie, le riserve la metà; possono salire di livello e apprendere mosse. |
| 7 | Mosse dei compagni | Configura fino a quattro mosse e abilita/disabilita ciascuna per l’IA. Cambiare slot non ripristina i PP già spesi. |
| 8 | Evoluzioni facoltative | Il menu del Pokémon mostra requisiti e strumenti. L’evoluzione richiede conferma: puoi conservare la forma attuale. Evolvere lo starter mantiene la sua identità obbligatoria. |
| 9 | Anteprima dei tipi | Quando selezioni una mossa, i bersagli visibili mostrano efficacia/assorbimento. L’anteprima non consuma né modifica il generatore casuale. |
| 10 | Scambio di posizione | Due ordini reciproci di movimento contro un boss scambiano simultaneamente le caselle degli alleati nello stesso turno. |
| 11 | Abilità integrate | Il nucleo danni gestisce le abilità applicabili; nuovi eventi gestiscono sincronizzazione degli stati, guarigione, contatto, fuga, meteo e copia. Attivazioni pertinenti appaiono nel diario. |
| 12 | Mosse di stato | Ripresa, Protezione, Danzaspada, Ruggito, Tuononda, Sonnifero, Riflesso e Schermoluce, con animazioni e bersagli. |
| 13 | Strumenti tenuti | Un accessorio per Pokémon, con effetti sulle statistiche, evasione o immunità agli stati. Puoi rimuoverlo; torna nell’inventario quando sostituisci il membro. |
| 14 | Terreni dei biomi | Acqua e sabbia rallentano i tipi non adatti; il ghiaccio fa scivolare. I tipi compatibili, Volante e Levitazione hanno le immunità appropriate a queste regole. |
| 15 | Meteo e previsioni | Sole e pioggia modificano i danni; tempesta di sabbia e grandine infliggono danni periodici; la nebbia riduce la visibilità. La schermata di fine piano anticipa il meteo successivo. |
| 16 | Stanze speciali | Scrigni, ristori monouso e sfide facoltative con due nemici potenziati. La ricompensa della sfida arriva soltanto dopo averli sconfitti. |
| 17 | Mercanti | Monete ottenute dalle vittorie, acquisti con scorte limitate e vendita degli strumenti. Gli acquisti non consumano turni. |
| 18 | Soccorsi | Un Pokémon incontrato in difficoltà può unirsi senza essere sconfitto. A squadra piena scegli un compagno da sostituire, mai lo starter; la sostituzione occupa il turno di tutti. |
| 19 | Registro delle scoperte | **Scoperte** conserva specie incontrate, disponibilità come starter, strumenti scoperti e tipi dei guardiani battuti, anche dopo la morte. |
| 20 | Difficoltà e sfide | Rilassata, Esploratore ed Esperto; **Codice sfida** esporta seed, starter, mosse iniziali e difficoltà. Incollalo all’accampamento per ricreare la stessa partenza nella stessa versione del gioco. Record locali per le sfide concluse. |

## Catalogo e fonti

128 specie con sprite e ritratti locali, 29 starter iniziali più le specie
sbloccate, 57 mosse, 18 tipi di guardiano. Aggiunti 75 set di sprite evoluti e
13 strumenti: sette accessori tenuti e sei strumenti evolutivi. I dodici
consumabili precedenti restano disponibili. Sono presenti le catene evolutive
dei 27 starter regionali e altre catene del catalogo; non tutte le evoluzioni
esistenti nella serie Pokémon (per esempio Eevee ha tre opzioni).

Nomi italiani di mosse, strumenti e abilità estratti dalla localizzazione EoS;
nomi delle specie dalle tabelle italiane PokeAPI. Sprite comunitari SpriteCollab
con revisioni e crediti conservati; icone strumenti RawAsset con mapping e
hash in `assets/items/gear/sources.json`. Alcune icone sono riutilizzate per
rappresentare lo strumento, non sono necessariamente il suo sprite EoS esatto.

Rigenerazione dati, nell’ambiente di sviluppo con dipendenze Python installate:

```sh
.venv/bin/python scripts/expand_adventure_data.py
.venv/bin/python scripts/adventure_combat_extras.py
.venv/bin/python scripts/prepare_animation_data.py
python scripts/fetch_adventure_icons.py
```

## Regole adattate e limiti

Questa è un’espansione roguelite, non una certificazione di identità a EoS.
Il nucleo `damage-eos` resta utilizzato per i danni ordinari. Per le specie
successive a EoS vengono usate statistiche/abilità/learnset di specie EoS di
riferimento, dichiarate in `data/evolution-donors.json` e nei dati runtime.
Non sono presentate come statistiche originali di quelle generazioni.

- Le mosse di stato hanno handler del progetto: portata quattro caselle,
  potenziamenti applicati alle statistiche e protezione temporanea. Non
  riproducono ogni bersaglio, precisione, durata e interazione EoS.
- L’amicizia evolutiva è rappresentata da un legame di 20 vittorie; non c’è
  un ciclo giorno/notte. Le evoluzioni per scambio usano lo strumento indicato
  senza scambio online. Nessuna evoluzione viene forzata.
- Abisso usa un adattamento KO con precisione EoS: Vigore e Protezione
  la bloccano, i boss ne sono immuni. Riduttore applica contraccolpo, evitato
  da Testadura o Magicscudo.
- Le abilità disponibili sono integrate nei contesti implementati, non in
  tutte le interazioni possibili della serie. Cuordeciso dà priorità tra gli
  alleati, senza portare l’intero sistema velocità EoS. Incantevole usa generi
  assegnati deterministicamente, non le proporzioni originali di ogni specie.
- Terreni, fasi dei boss e IA sono regole originali di questo roguelite.
  Il danno ambientale avviene ogni dieci turni e non riproduce lo scheduler EoS.
- Rilassata riduce i danni nemici al 75%; Esperto li aumenta al 125% e aumenta
  le monete delle vittorie del 30%. Il catalogo e le regole restano uguali.
- Il codice sfida riproduce la partenza; le scelte successive cambiano la
  spedizione. Non esistono classifiche online o verifiche anti-manomissione.
- Salvataggi e scoperte sono locali al browser. I salvataggi precedenti sono
  migrati conservativamente; le nuove stanze appaiono dal piano successivo.

## Verifiche

`npm test`: 74 test superati, inclusi 24 test dell’espansione (salvataggi v7,
migrazione, ordini, cure, esperienza, PP, evoluzioni, abilità, terreni, meteo,
mercante, soccorso con squadra piena, scoperte e codici sfida).

Prove Chromium desktop e mobile in `tests/browser/adventure.mjs`, più i
percorsi preesistenti di squadra, reclutamento, orientamento e animazioni.
Risultati e immagini in `test-results/`. I test di funzionalità costruiscono
scenari controllati; la spedizione in `tests/browser/journey.mjs` usa comandi
reali nell’interfaccia e legge i salvataggi per scegliere le azioni.

Verifica asset: 128 specie, 2.209 file controllati tramite hash e 1.823 PNG
decodificati. Spedizione browser in difficoltà Rilassata: piano 6 raggiunto
in 556 turni, 11 vittorie; ripresa, KO e nuova spedizione verificati senza
errori JavaScript. Lo ZIP estratto è stato avviato e provato su desktop/mobile.
