# Squadra e guardiani — 23 ottobre 2026

## Reclutamento e formazione

Quando raggiungi le scale, scegli un Pokémon fra le specie mandate KO nel piano
appena concluso. Due Zubat producono una sola voce; se i livelli sono diversi,
viene proposto il livello maggiore. Puoi anche proseguire senza reclutare.
La scelta del compagno precede la normale ricompensa del piano.

La squadra comprende lo starter e fino a cinque compagni. In campo possono
esserci lo starter e fino a due compagni. Il menu **Squadra** permette di
schierare una riserva, sostituire un alleato o ritirarlo. Lo starter è indicato
con ★ e non può essere ritirato, sostituito o lasciato durante un reclutamento.
Ogni cambio consuma un turno completo: gli alleati non attaccano e i nemici
possono rispondere. Gli ordini eventualmente preparati vengono cancellati.
A squadra piena puoi lasciare uno dei cinque compagni per reclutare il nuovo;
anche questa sostituzione costa un turno sul piano corrente.

Ogni Pokémon reclutato viene sbloccato permanentemente nella scelta iniziale,
anche dopo una sconfitta. Il catalogo attuale comprende 53 specie, di cui 29
starter già disponibili all'inizio. Il reclutamento non riguarda soltanto gli
starter iniziali: anche i guardiani sconfitti sono candidati.

I compagni KO restano nella squadra, ma non occupano un posto attivo e non
possono essere schierati finché non recuperano. Tornano a pieni PS al piano
successivo. **Se lo starter va KO, la spedizione termina subito**, indipendentemente
dai PS delle riserve e degli alleati. I compagni hanno PS, PP e stati individuali.

## Piani normali: alleati autonomi

Controlli solo lo starter. Gli alleati lo seguono, aggirano gli ostacoli e
aiutano nei combattimenti. Fra le mosse con PP e a portata, preferiscono il
miglior rapporto fra tipi e poi il danno stimato dal nucleo EoS. La stima non
consuma RNG della partita. Se non possono attaccare, si avvicinano al nemico.
Nei corridoi puoi avanzare verso un alleato per scambiarvi di posto con un
normale turno di movimento, senza attaccarlo.

## Boss: controlli individuali

1. Schiera fino a tre membri nelle **tre righe calpestabili più in basso**,
   evidenziate in verde. Tocca un Pokémon o la sua scheda, poi una casella libera.
2. Premi **Conferma schieramento**.
3. Seleziona ogni Pokémon e prepara il suo ordine: movimento di una casella,
   attacco, mossa con direzione o attesa. Toccare una mossa seleziona la mossa;
   toccare il bersaglio o una freccia ne conferma la direzione.
4. Puoi correggere gli ordini senza consumare turni o PP.
5. Quando tutti i Pokémon attivi hanno un ordine, premi **Esegui turno**.
   Agiscono lo starter e poi i compagni nell'ordine della squadra; infine il boss.
   Le animazioni mostrano le azioni in successione. Nessun alleato usa l'IA.

Una casella ancora occupata al momento dell'esecuzione impedisce il movimento:
considera l'ordine di esecuzione quando sposti due Pokémon. Un bersaglio già KO
non viene colpito di nuovo. Gli strumenti sono utilizzati dallo starter; durante
il boss occupano il suo ordine. La preparazione si conserva nel salvataggio.

Da tastiera: seleziona il membro dalla scheda; frecce e diagonali impostano il
movimento, 1–4 selezionano una mossa e una direzione la conferma, Spazio seleziona
l'attacco, punto ordina l'attesa, Invio conferma il turno completo.

## Biomi e ciclo dei guardiani

Un boss ogni cinque piani. Il ciclo copre tutti i 18 tipi in 90 piani; poi
ricomincia con livelli e resistenza superiori, entro i limiti del motore
(livello 100, 999 PS). Il livello del guardiano è piano + 4, fino a 100;
i PS ricevono un incremento progressivo dichiarato come regola roguelite.
I quattro piani precedenti condividono nome e palette del bioma del boss.
Tre incontri su quattro vengono scelti fra le specie del tipo del bioma;
il quarto conserva la varietà del roster generale.

| Tipo | Guardiano | Bioma |
|---|---|---|
| Erba | Treecko | Bosco dei germogli |
| Fuoco | Charmander | Caldera ardente |
| Acqua | Squirtle | Caverna delle maree |
| Elettro | Pikachu | Grotte del tuono |
| Normale | Eevee | Prateria antica |
| Veleno | Zubat | Palude velenosa |
| Terra | Onix | Deserto sepolto |
| Volante | Dragonite | Vette dei venti |
| Coleottero | Butterfree | Bosco dei bozzoli |
| Roccia | Tyranitar | Cava di granito |
| Psico | Ralts | Santuario dei sogni |
| Ghiaccio | Dewgong | Ghiacciaio silente |
| Spettro | Gengar | Rovine degli spiriti |
| Lotta | Lucario | Arena dei valorosi |
| Acciaio | Aron | Forgia dimenticata |
| Buio | Absol | Abisso della notte |
| Drago | Garchomp | Cima dei draghi |
| Folletto | Clefable | Giardino lunare |

## Tipi e fonti

I 17 tipi originali continuano a essere calcolati da damage-eos: superefficacia,
resistenze e abilità non vengono sostituite da una tabella della serie principale.
Il diario segnala i colpi superefficaci o poco efficaci.

**Folletto è un'estensione**, richiesta per coprire i 18 tipi attuali, non una
regola originale di EoS. Clefable assume questo tipo. Magibrillio usa il danno
base di Comete (Swift) del nucleo EoS, con bersagli nella stanza ed effetto visivo
adattato. Nome italiano verificato nel catalogo PokeAPI, con fonte e hash in
`data/fairy-move-source.json`. Per l'estensione si usano fattori 1,4 contro
Drago/Lotta/Buio, 0,7 contro Fuoco/Veleno/Acciaio. In difesa, Folletto riceve
1,4 da Veleno/Acciaio, 0,7 da Lotta/Coleottero/Buio e 0,5 da Drago, secondo
la scelta di mantenere resistenze parziali nello stile Mystery Dungeon.
Non è una dichiarazione di parità con un capitolo Pokémon specifico.

Butterfree, Dewgong e Clefable usano statistiche e crescita estratte dai dati EoS,
con sprite e ritratti SpriteCollab al commit fissato dal progetto. Attribuzioni
individuali nelle rispettive cartelle `assets/pokemon`; manifesti e hash in
`data/assets-extra.json`. Per le specie evolute senza mosse supportate al livello
5, viene resa disponibile una mossa compatibile del learnset EoS come adattamento
alla possibilità di iniziare con qualsiasi specie reclutata.

## Salvataggi e prove

Meccaniche versione 6, importazione delle versioni 3–5 conservando i progressi.
Salvataggi nuovi includono squadra, riserve, specie sconfitte, schieramento,
ordini e starter sbloccati. I controlli rifiutano sovrapposizioni, più di sei
membri, più di tre attivi, ordini non validi e dati di compagni corrotti.

`tests/team.test.mjs` verifica reclutamento, limiti, cambi, IA, ordini, morte,
tipi, 18 biomi e migrazioni. `tests/browser/team.mjs` prova mouse e touch,
schieramento sulla mappa, ordini distinti, sostituzioni e ripresa del salvataggio.

Sono state aggiunte nove mosse originali EoS per coprire i tipi dei guardiani:
Ventargenteo, Terremoto, Psichico, Raffica, Fangobomba, Confusione, Aeroassalto,
Forzasfera e Neropulsar. Nomi e parametri vengono estratti da `text_i.str` e
`waza_p.bin` tramite `scripts/extend_team_moves.py`. Ogni guardiano equipaggia
almeno una mossa compatibile del proprio tipo, anche da MT: è una regola del
roster boss, non una dichiarazione di apprendimento per livello. Gli effetti
secondari specifici di queste nuove mosse non sono ancora tutti riprodotti;
il calcolo del danno e della portata usa i dati EoS.

Esito verifiche: 50 test automatici superati, percorso browser completo fino al
piano 6 (716 turni, 13 vittorie), reclutamento, ordini boss, salvataggi, morte e
nuova partita. Squadra, comandi touch, animazioni e reclutamento provati anche
contro lo ZIP estratto.
