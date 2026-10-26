# Le 11 MN in Mystery Depths

Accesso: **Esplora → MN → Pokémon → tecnica → destinazione**. Si può usare mouse o touch; le frecce e il numero di caselle nel pannello indicano la destinazione rispetto al Pokémon scelto. I pannelli informativi non consumano turni.

Le tecniche ambientali sono adattamenti originali di Mystery Depths, non una riproduzione delle regole MN della serie principale. I nomi italiani sono verificati sui dati localizzati PokeAPI. La compatibilità comprende i learnset delle diverse generazioni e dei diversi metodi di apprendimento; non identifica il possesso di una specifica MN in una singola versione.

## Risorsa e squadra

- Energia condivisa: 10, +1 ogni sei turni, ripristino a ogni piano.
- Nessuna occupazione dei quattro slot delle mosse; nessun consumo dei PP delle mosse.
- Nei piani normali la tecnica costa un turno alla squadra. L’alleato incaricato non ottiene una seconda azione autonoma; gli altri continuano ad agire autonomamente.
- Nei boss si pianifica la tecnica per un singolo Pokémon. L’energia viene riservata per evitare di promettere più azioni di quelle sostenibili. Due atterraggi sulla stessa casella vengono segnalati come conflitto.
- Se durante l’esecuzione il bersaglio non è più valido, l’ordine viene perso ma l’energia non è spesa.
- Tutti dispongono di un kit per Taglio e Spaccaroccia: +2 energia per chi non è compatibile. Nessun percorso verso le scale richiede una MN.
- Solo Pokémon attivi e vivi possono eseguire tecniche. Volo, Sub e le altre tecniche di spostamento non consentono di atterrare su Pokémon o fuori mappa. Lo starter attiva strumenti e trappole sulla casella di arrivo.

## Effetti

| Tecnica | Costo base | Effetto ambientale e impiego tattico |
|---|---:|---|
| Taglio | 1 | Recide rovi adiacenti che rallentano; recupera 12 monete una sola volta. |
| Volo | 3 | Riposizionamento fino a 4 caselle già esplorate, sorvolando ostacoli. Nessuna protezione all’arrivo. |
| Surf | 2 | Raggiunge acqua entro 3 caselle e trasforma l’arrivo in guado, eliminando quel rallentamento ambientale per gli alleati. |
| Forza | 2 | Spinge un masso adiacente di una casella libera. La copertura entro una casella riduce del 25% i danni degli attacchi, anche ai nemici. |
| Flash | 2 | Disperde nebbia entro 5 caselle e marca come esplorata l’area in linea di vista. Non vede attraverso le pareti. |
| Mulinello | 2 | Dissipa un vortice entro 3 caselle; può trascinare di una casella un nemico non boss se il passo è libero. |
| Cascata | 2 | Raggiunge una cascata entro 3 caselle, con protezione dagli attacchi nel turno di arrivo. |
| Spaccaroccia | 1 | Distrugge rocce o massi adiacenti. Una roccia friabile restituisce 12 monete; un masso no. |
| Sub | 3 | Dall’acqua o da un guado raggiunge altra acqua entro 3 caselle, protetto dagli attacchi nel turno di arrivo. |
| Scacciabruma | 2 | Elimina nebbia e vortici entro 4 caselle; rimuove il tempo nebbioso fino al piano successivo. |
| Scalaroccia | 2 | Raggiunge un appiglio entro 2 caselle, anche oltre una parete, protetto dagli attacchi nel turno di arrivo. |

La protezione riguarda gli attacchi, non fame, status o trappole. Rovi, acqua e vortici rallentano il movimento successivo; le tecniche di mobilità permettono di evitarli. La nebbia impedisce una linea di vista lunga più di due caselle quando una delle estremità è vicina alla nebbia: vale anche per i nemici. I boss conservano le anteprime delle loro azioni.

I massi sono coperture tattiche attraversabili, non muri che chiudono corridoi. Le tecniche non infliggono direttamente danni: servono a preparare il terreno e posizionare la squadra, lasciando gli attacchi alle mosse di combattimento. Le opportunità ambientali sono più frequenti secondo il tipo del bioma. Gli specchi d’acqua sono raggruppati per rendere utilizzabile Sub.

## Grafica, animazione, accessibilità

Grafica ambientale originale in pixel art: rovi, acqua, guadi, rocce, massi, vortici, cascate, nebbia e appigli. Sagome di caverne su due livelli e luci ambientali aggiungono profondità; non rivelano la geometria inesplorata. L’ispirazione atmosferica a Team Cherry non comporta uso di suoi asset.

Le MN riutilizzano gli effetti già accreditati in `assets/effects`: ogni tecnica ha un’associazione esplicita, non l’effetto generico dell’attacco. Animazione di preparazione, spostamento e aggiornamento del terreno sono sequenziati; velocità e salto animazione restano disponibili. Gli elementi ambientali animati rispettano la riduzione del movimento.

## Fonti e salvataggi

- Dati runtime: `assets/game/expedition-data.json`.
- Generatore: `scripts/fetch_expedition_data.py`.
- Origine: PokeAPI, mirror pubblico `PokeAPI/api-data`; hash delle risposte in `data/expedition-sources.json`.
- La cache grezza da 36 MB è locale, esclusa dal repository e dallo ZIP. Il runtime non effettua richieste a PokeAPI.
- La raccolta include anche tipi e abilità canonici per successive verifiche: questo aggiornamento usa la compatibilità MN, **non sostituisce ancora i dati di combattimento delle specie**.
- Salvataggio: estensione `run.field` versione 1 del formato avventura esistente; importazione dei salvataggi precedenti senza perdita di squadra. I vecchi piani ricevono gli elementi ambientali al cambio piano.

## Verifica e limiti di questa consegna

Test automatici: effetti di tutte le 11 MN, ordini, energia, collisioni, salvataggi, migrazione, nebbia simmetrica, rallentamento, copertura e percorribilità di 15 generazioni di piano. Test browser delle MN con mouse/touch e verifiche della disposizione dell’interfaccia su quattro risoluzioni.

Questa consegna completa il sistema MN e una prima revisione atmosferica. Non equivale all’implementazione dell’intera precedente lista critica: campagna finita, ruoli nemici dedicati, nuovi obiettivi, narrazione del campo, progressione orizzontale, musica e revisione completa delle identità canoniche restano lavoro distinto. Il bilanciamento è verificato automaticamente, non ancora tramite una campagna di playtest con giocatori esterni.

Verifica finale di questo aggiornamento: **95 test automatici passati**, inclusa la validazione di 90 piani attraverso i 18 biomi e le seconde fasi dei boss. Suite browser MN: 1440×900, 390×844, 844×390; suite UX: anche 360×740. Le indicazioni degli attacchi dei boss vengono disegnate sopra gli elementi ambientali.
