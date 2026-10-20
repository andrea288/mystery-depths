Realizza un browser game Pokémon roguelite completo, chiamato **Mystery Depths**, con il sistema di movimento e combattimento **identico a Pokémon Mystery Dungeon: Esploratori del Cielo**, esteso con dungeon infinito e progressione fra le partite.

**Esegui concretamente il lavoro. Non limitarti a un piano, una proposta o una demo.** Prendi autonomamente le decisioni tecniche, organizzative e artistiche compatibili con i vincoli seguenti.

## 1. Repository Git e gestione autonoma

- Verifica l’account GitHub autenticato attraverso gli strumenti disponibili.
- Crea nel mio account un repository **privato** chiamato `mystery-depths`.
- Se esiste già, verifica che sia il progetto pertinente prima di riutilizzarlo. Non sovrascrivere progetti estranei.
- Collega il progetto al remoto ed esegui commit significativi e push durante il lavoro.
- Recupera autonomamente codice, librerie, dati e asset dai repository e dalle fonti appropriate.
- Non chiedermi di scaricare ZIP, trasferire file o recuperare manualmente risorse che puoi ottenere con gli strumenti disponibili.
- Se manca l’autenticazione, chiedimi soltanto il passaggio necessario per collegare GitHub. Non inventare URL, repository, commit o push riusciti.
- Un precedente tentativo è rimasto in un altro ambiente e **non è stato caricato su GitHub**. Questo prompt è autonomo: non presumere di avere quei file.
- Il progetto è destinato a uso personale. **Non pubblicare il gioco, non attivare hosting pubblico e mantieni privato il repository.**
- Non dedicare il lavoro a un’analisi legale. Mantieni comunque provenienza, crediti e informazioni sulle dipendenze utilizzate.

## 2. Obiettivo del gioco

Il giocatore seleziona uno starter ed entra in un dungeon procedurale senza fine. Avanza attraverso stanze e piani, affronta avversari progressivamente più forti e boss, raccoglie strumenti e sceglie ricompense.

Le ricompense appartengono a due categorie distinte:

1. **Progressione permanente:** mosse che la specie apprende e mantiene disponibili nelle partite successive.
2. **Progressione della run:** potenziamenti e ricompense temporanei che vengono persi alla fine della partita.

Devono essere selezionabili tutti i 27 starter delle nove regioni, più Pikachu ed Eevee. Prevedi una struttura dati estensibile.

Il risultato deve essere un gioco utilizzabile nel browser, con interfaccia italiana, controlli chiari, grafica curata, salvataggi e avvio semplice.

## 3. Vincolo prioritario: sistema originale identico

Il riferimento preciso è **Pokémon Mystery Dungeon: Esploratori del Cielo**.

Non voglio un combattimento genericamente ispirato a Mystery Dungeon. Voglio riprodurne il funzionamento originale. Questo requisito prevale sulla rapidità di implementazione e sulle preferenze dello stack.

Scegli e documenta una versione regionale di riferimento del gioco, mantenendola coerente nelle verifiche.

Ricostruisci e verifica tutte le regole originali pertinenti al dungeon e al combattimento, comprese:

- sequenza delle azioni, ordine dei turni e azioni che consumano o non consumano un turno;
- movimento in otto direzioni, orientamento, diagonali, ostacoli, collisioni e attraversamento del terreno;
- velocità di movimento, azioni multiple e relativi modificatori;
- statistiche, crescita, modificatori temporanei e limiti;
- formula dei danni, precisione, elusione, critici, STAB, efficacia dei tipi, arrotondamenti e casualità;
- attacco normale e mosse;
- PP, bersagli, portata, traiettorie, linea di tiro, attraversamento degli angoli e mosse ad area;
- effetti principali e secondari, probabilità, durata e condizioni di attivazione;
- abilità, stati alterati, immunità e interazioni;
- strumenti, oggetti tenuti, oggetti lanciati, trappole, fame, recupero e meteo;
- comportamento dei nemici e, se presenti, dei compagni;
- collegamento delle mosse, abilità QI e altre meccaniche originali che incidono sul comportamento implementato.

**Non sostituire queste regole con quelle della serie Pokémon principale.** Non usare dati PokeAPI come prova dei valori originali di Mystery Dungeon.

Non inventare formule, range, probabilità o effetti per completare rapidamente una funzione. Prima individua una fonte verificabile; poi implementa e testa.

Preferisci riutilizzare o portare nel browser implementazioni fedeli già disponibili. Valuta anche WebAssembly se permette di preservare meglio la logica originale.

La presenza di un nome come “PMD” o “Mystery Dungeon” in una libreria non dimostra che le regole siano identiche a Esploratori del Cielo. Verifica le differenze.

Mantieni una **matrice di conformità** con:

- comportamento;
- fonte e versione;
- implementazione;
- test di verifica;
- stato: verificato, non verificato oppure differente;
- eventuale scostamento residuo.

Quando possibile, confronta scenari equivalenti con l’originale o con un riferimento indipendente verificato, controllando stato iniziale e casualità. Non considerare sufficienti test che confermano soltanto le tue stesse ipotesi.

**Non dichiarare “100% identico” senza prove.** Una regola sconosciuta deve risultare non verificata, non essere sostituita silenziosamente con una regola inventata.

## 4. Estensioni intenzionali e loro confini

Le differenze deliberate rispetto al gioco originale sono:

- selezione iniziale ampliata;
- dungeon senza fine;
- incontri e difficoltà progressivi;
- ricompense fra le stanze o i piani;
- apprendimento permanente fra le run;
- potenziamenti temporanei della run;
- presentazione grafica e interfaccia migliorate.

Queste estensioni devono usare il nucleo originale senza riscriverne le regole.

Aumenta la difficoltà attraverso livelli, composizione degli incontri, mosse, strumenti, risorse disponibili e configurazione delle mappe. Non aggiungere moltiplicatori nascosti dei danni, precisione falsata o immunità arbitrarie dei boss.

Progetta i bonus temporanei usando, quando possibile, modificatori e strumenti previsti dalle regole originali. Mantieni separate le modifiche di progressione dal calcolo del combattimento.

I boss devono rispettare le regole originali e usare Pokémon e mosse autentici. Non inventare attacchi telegrafati, fasi, mosse o abilità speciali estranei al sistema originale.

### Pokémon e contenuti successivi a Esploratori del Cielo

I Pokémon, i tipi, le mosse e le abilità introdotti successivamente non hanno un comportamento originale in Esploratori del Cielo.

Per conciliare questo fatto con la selezione di tutti gli starter:

- costruisci prima un nucleo fedele e verificato usando contenuti presenti nell’originale;
- isola i contenuti successivi in un modulo di estensione;
- definisci autonomamente le conversioni necessarie, documentandole;
- non modificare retroattivamente le regole dei contenuti originali per adeguarle alle generazioni moderne;
- non presentare le conversioni come comportamenti originali verificati.

Non usare questa eccezione per semplificare il resto del sistema.

## 5. Risorse da esaminare autonomamente

Verifica direttamente contenuti, stato, dipendenze e limiti di questi progetti:

- Sprite e ritratti:
  https://github.com/PMDCollab/SpriteCollab
- Documentazione e reverse engineering di Esploratori del Cielo:
  https://github.com/UsernameFodder/pmdsky-debug
- Reimplementazione del calcolo dei danni:
  https://github.com/UsernameFodder/damage-eos
- Disassembly/decompilazione:
  https://github.com/pret/pmd-sky
- Strumenti di modifica e formati del gioco:
  https://github.com/SkyTemple/skytemple
- Motore e contenuti PMD alternativi:
  https://github.com/audinowho/PMDODump
  https://github.com/PMDCollab/PMDC
- Riferimento aggiuntivo da verificare:
  https://github.com/Minemaker0430/ExplorersOfSkyOrigins
- Dati integrativi della serie principale:
  https://github.com/PokeAPI/pokeapi

Cerca ulteriori fonti quando necessario. Non presumere che questi repository siano completi o immediatamente utilizzabili nel browser.

Fissa le versioni o i commit delle dipendenze rilevanti per rendere il progetto riproducibile.

## 6. Grafica, sprite e animazioni

- Usa sprite Pokémon autentici del gioco originale quando disponibili.
- Per Pokémon successivi, usa risorse PMDCollab appropriate e documentane la provenienza dalla community.
- Non sostituire i Pokémon con forme geometriche, emoji o immagini generate.
- Implementa correttamente direzioni, frame, tempi, ancoraggi e animazioni di movimento, attacco, danno e sconfitta.
- Riproduci le animazioni e gli effetti originali delle mosse quando disponibili; documenta quelli non ancora riprodotti.
- Non confondere un’animazione generica dello sprite con l’effetto completo di una mossa.
- Migliora nitidezza, leggibilità, illuminazione e interfaccia senza alterare tempi logici, collisioni o regole.
- Mantieni gli asset necessari nel progetto: il gioco non deve dipendere da richieste a servizi esterni per mostrare Pokémon o eseguire mosse durante una partita.

## 7. Dungeon e ciclo di gioco

Implementa:

- generazione procedurale riproducibile tramite seed;
- stanze e corridoi con struttura coerente con Mystery Dungeon;
- scale sempre raggiungibili;
- biomi differenti e varietà visiva;
- distribuzione controllata di nemici, strumenti, trappole e ricompense;
- progressione senza un ultimo piano prestabilito;
- boss periodici e incontri vari;
- gestione della crescita oltre le normali soglie senza overflow o violazione dei limiti del nucleo originale;
- scelte di ricompensa comprensibili e significative;
- morte, riepilogo della spedizione e avvio immediato di una nuova run.

La frequenza dei boss e la distribuzione delle ricompense sono decisioni che puoi prendere autonomamente e documentare.

## 8. Interfaccia e salvataggi

Prevedi almeno:

- menu iniziale;
- selezione starter organizzata per regione, con anteprima;
- consultazione e scelta delle mosse permanentemente apprese;
- gestione delle quattro mosse equipaggiate;
- HUD con PS, livello, esperienza, PP, stati, fame e piano;
- indicazioni leggibili di bersagli e portata;
- inventario e descrizioni degli strumenti;
- registro degli eventi di combattimento;
- pausa e spiegazione dei comandi;
- schermate di ricompensa, sconfitta e riepilogo;
- salvataggio automatico e ripresa della run;
- persistenza separata della progressione permanente;
- esportazione e importazione dei salvataggi;
- validazione e versionamento dei salvataggi.

Le mosse apprese permanentemente restano disponibili per la relativa specie. I bonus temporanei non devono trasferirsi alla partita successiva.

Non introdurre account, servizi a pagamento o backend se non sono necessari. Dai priorità a un’esperienza desktop da browser; aggiungi controlli touch se appropriato senza compromettere quelli da tastiera.

## 9. Architettura e continuità del lavoro

Scegli autonomamente lo stack più adatto. Non sei obbligato a usare React.

Separa chiaramente:

- simulazione e regole originali;
- estensioni roguelite;
- dati Pokémon e mosse;
- generazione del dungeon;
- rendering e animazioni;
- interfaccia e input;
- persistenza.

Mantieni nel repository documenti aggiornati con requisiti, architettura, fonti, matrice di conformità, decisioni, attività completate, problemi aperti e prossimo passo.

Le compattazioni del contesto non devono farti perdere i vincoli del progetto. Dopo una ripresa, rileggi questi documenti e continua dal punto raggiunto.

## 10. Verifica e criteri di completamento

Non considerare il progetto completo perché compila o mostra una schermata.

Esegui test significativi su:

- numerosi seed e piani, raggiungibilità e assenza di blocchi;
- collisioni, diagonali, orientamento e linea di tiro;
- ordine delle azioni e consumo dei turni;
- danni, precisione, tipi, critici, stati, abilità e PP;
- effetti specifici delle mosse disponibili;
- strumenti e interazioni;
- IA e boss;
- ricompense e apprendimento permanente;
- reset dei bonus temporanei;
- morte e nuova run;
- salvataggio, ripresa e importazione;
- riproducibilità della simulazione;
- integrità e corretta visualizzazione degli asset.

Esegui anche QA reale nel browser. Prova almeno questo percorso completo:

**Selezione starter → esplorazione → combattimenti → boss → ricompensa → salvataggio e ripresa → morte → nuova run con mosse permanenti conservate e bonus temporanei rimossi.**

Correggi i problemi riscontrati. Non consegnare funzionalità simulate, pulsanti senza azione, asset mancanti o una demo spacciata per prodotto completo.

Il requisito di fedeltà resta aperto finché esistono scostamenti noti o comportamenti non verificati nel nucleo originale. Se mancano dati o accessi indispensabili, indica il blocco preciso invece di sostituire il requisito con una versione semplificata.

## 11. Consegna

Consegna:

- URL effettivo del repository GitHub privato;
- codice e asset necessari, con commit e push verificati;
- README in italiano;
- comandi di installazione, avvio e test;
- procedura semplice di avvio su Windows;
- resoconto delle verifiche eseguite;
- matrice di conformità e indicazione precisa di eventuali limiti residui.

Non chiedermi conferme per decisioni ordinarie già delegate. Non fermarti al piano o alla prima versione visibile. Procedi autonomamente fino a un gioco utilizzabile e verificato, interrompendoti soltanto per impedimenti effettivi che richiedono il mio intervento.