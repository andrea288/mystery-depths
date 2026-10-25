# HUD e pannelli laterali — 25 ottobre 2026

La spedizione occupa la finestra disponibile senza richiedere lo scorrimento
della pagina. Il dungeon ha la priorità; le informazioni approfondite si aprono
solo quando richieste. Rimane la grafica rossa/avorio del restyling tattico.

## Comandi

- **Muovi** seleziona il movimento e disattiva Orienta.
- **Mosse** apre un pannello sopra il lato destro della mappa, con quattro
  slot, tipo, PP e indicazione della disponibilità. Scegliere una mossa chiude
  il pannello. Nei boss si sceglie poi la direzione sulla mappa o con le frecce.
- **Attacca**, **Orienta**, **Zaino** e la croce direzionale restano accessibili.
  Il centro della croce è **Attendi**; i passi diagonali restano disponibili.
- Nei boss gli stessi comandi servono per ogni Pokémon selezionato: eliminati
  i pulsanti duplicati. Una barra mostra l’ordine in preparazione, l’intenzione
  del boss e **Esegui n/3**. La conferma resta disabilitata finché gli ordini
  non sono completi e compatibili.
- **Esplora** raccoglie Scoperte e Codice sfida. Le interazioni vicine, come
  mercante, tesoro e soccorso, mantengono un pulsante contestuale.
- Il diario occupa una riga; il pulsante **Diario** apre lo storico.

## Pannelli

Squadra e gestione del Pokémon aprono un pannello sul lato sinistro. Zaino,
scoperte, impostazioni e altri menu si aprono sul lato destro. La mappa rimane
visibile sullo sfondo, oscurata leggermente. I pannelli lunghi scorrono
internamente, senza muovere il campo di gioco.

**Esc** chiude un pannello facoltativo; sono presenti anche pulsanti di
chiusura. Le ricompense e la conclusione della spedizione conservano il loro
flusso obbligatorio. Nei dialoghi modali il gioco non riceve i tasti di movimento
e la riproduzione delle animazioni è sospesa. Nei pannelli Mosse ed Esplora le
frecce navigano i pulsanti, senza consumare turni; Esc riporta il focus al
pulsante che li ha aperti. Le scorciatoie 1–4 continuano a selezionare le mosse.

## Telefono e orientamento

In verticale la squadra è compatta sopra la mappa; croce direzionale a sinistra
e azioni a destra. In orizzontale i comandi si dispongono negli angoli inferiori,
lasciando libero il centro. Le azioni principali e la croce direzionale hanno
un’altezza minima di 44 pixel nei formati touch verificati. Gli ordini del boss
restano confermabili senza scorrere. L’orientamento non consuma turni.

## Verifiche

`tests/browser/ux.mjs` verifica i formati 1440×900, 390×844, 360×740 e 844×390:
assenza di scorrimento della pagina, controlli dentro la finestra e non coperti,
dimensioni touch, focus, isolamento dei tasti nei menu, orientamento gratuito,
pannelli laterali e risoluzione degli ordini di tre Pokémon contro il boss.

74 test del motore superati. Le suite browser di squadra, avventura, animazioni,
reclutamento e orientamento sono state eseguite; la spedizione automatizzata ha
superato il primo boss e verificato ripresa, morte e nuova partita senza errori
JavaScript. Risultati in `test-results/browser-ux.json`; immagini `ux-*` nella
stessa cartella. Le immagini usano scenari controllati per mostrare tre membri.

Moduli UI: `src/hud-shell.mjs` e `src/hud.css`; nessuna modifica alle regole dei
turni, alla generazione dei dungeon o al formato dei salvataggi.

Verificato anche lo ZIP runtime estratto e avviato dal proprio server: suite
UX sui quattro formati e suite avventura desktop/mobile superate senza errori
JavaScript o risorse mancanti. Il focus non fa scorrere la scocca del gioco.
