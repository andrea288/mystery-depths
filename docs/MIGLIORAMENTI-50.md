# 50 miglioramenti implementati — 23 ottobre 2026

Elenco delle modifiche effettive di questa versione. Le animazioni usano fogli
PMDCollab pubblicamente scaricabili, con abbinamenti e tempi adattati: non sono
una ricostruzione identica fotogramma per fotogramma di Esploratori del Cielo.

## Animazioni e combattimenti

1. 25 fogli di effetti locali, scaricabili nuovamente con `scripts/fetch_move_effects.py`.
2. Associazione esplicita degli effetti a tutte le 37 mosse disponibili.
3. Anticipazione visiva dell'attacco prima dell'impatto.
4. Proiettili animati che viaggiano verso il bersaglio.
5. Effetti a raggio distribuiti lungo la traiettoria.
6. Effetti di assorbimento che tornano verso chi attacca.
7. Effetti ad area per le mosse corrispondenti.
8. Impatti distinti per i colpi multipli.
9. Risposte nemiche riprodotte in sequenza.
10. PS visibili aggiornati al momento dell'impatto.
11. Posa e affondo dell'attaccante distribuiti sulla durata dell'azione.
12. Scomparsa dei Pokémon sconfitti sincronizzata con la velocità scelta.
13. Indicazione del Pokémon e della mossa in corso sopra il dungeon.
14. Blocco delle azioni ripetute durante la sequenza.
15. Pausa della sequenza quando si apre un menu.
16. Pausa della sequenza quando la scheda del browser è nascosta.
17. Quattro velocità di animazione selezionabili.
18. Rispetto della preferenza di sistema per il movimento ridotto.
19. Possibilità di disattivare il movimento provocato dai colpi.
20. Possibilità di nascondere i numeri dei danni.

## Strumenti e inventario

21. Baccapesca con icona e cura dell'avvelenamento.
22. Baccaliegia con icona e cura della paralisi.
23. Baccafrago con icona e cura della scottatura.
24. Semesalute con icona e rimozione degli stati implementati.
25. Semevita con icona e aumento dei PS massimi.
26. Baccacedro con icona, recupero PS e aumento dei PS massimi a salute piena.
27. Melagrande con icona e recupero della Pancia.
28. Gigantomela con icona e riempimento della Pancia.
29. Scorta aggiuntiva di uno dei nuovi strumenti nei piani ordinari.
30. Migrazione conservativa degli zaini dei salvataggi precedenti.
31. Filtro dello zaino fra tutti gli strumenti e quelli posseduti.
32. Ordinamento dello zaino per nome o quantità.
33. Descrizioni degli effetti mostrate nello zaino.
34. Conferma facoltativa prima di consumare uno strumento.
35. Contatore della quantità totale degli strumenti.

## Informazioni, accessibilità e comandi

36. Indicatori degli stati alterati con durata residua.
37. Avviso quando i PS scendono al 25% o meno.
38. Avviso quando la Pancia scende a 20 o meno.
39. Barre grafiche dei PP sotto le mosse.
40. Suggerimento con potenza e precisione delle mosse.
41. Minimappa disattivabile dalle opzioni o con M.
42. Griglia del dungeon facoltativa.
43. Schermo intero dal pulsante, dal menu o con F.
44. Selezione ciclica dei nemici visibili con Tab.
45. Livello, tipi e PS nel riepilogo del bersaglio selezionato.
46. Diario completo degli ultimi 50 messaggi in una finestra dedicata.
47. Suoni sintetici facoltativi per attacchi e cure, disattivati all'avvio.
48. Preferenze conservate fra le sessioni nel browser.
49. Scorciatoie V, B e L e guida ai comandi aggiornata.
50. Pulsante per saltare la sola animazione senza aggiungere turni o cambiare l'esito.

## Verifica

`npm test`: simulazione, migrazioni, strumenti e sequenze temporali.
`tests/browser/animations.mjs`: animazione reale nel browser, clic/tasti ripetuti,
pausa nel menu, salto della sequenza, persistenza delle preferenze e asset senza 404.
`tests/browser/pixel-controls.mjs`: orientamento gratuito con mouse e touch.
`tests/browser/journey.mjs`: spedizione usando comandi reali; salta le animazioni
per ridurre il tempo del test, senza modificare lo stato della partita.

Fonti, hash e URL degli effetti: `assets/effects/manifest.json`.
Fonti delle otto nuove icone: `assets/items/sources-extra.json`.
Limiti della fedeltà al gioco originale: [CONFORMITA.md](CONFORMITA.md).

Esito del 23 ottobre: 37/37 test superati; browser fino al piano 6
(853 turni, 15 vittorie), ripresa, morte e nuova partita superate.
Animazioni e comandi desktop/touch verificati anche sullo ZIP estratto.
