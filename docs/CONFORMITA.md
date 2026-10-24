# Matrice di conformità

Riferimento delle regole: **EoS NA**. Testi italiani: messaggi EU. Non è stato
eseguito un confronto integrale con la ROM in un emulatore. “Verificato” vale
soltanto per la prova indicata; non significa che l'intero gioco sia identico.

Pin: PRET `e3f02199ebe9e263ee67b07f36b3f240f83ef5d9`; DAMAGE
`a1fa84ce0f436e5a2887943e807839372f26a245`; DEBUG
`c72fe675919ec83cfe93f687973afae85e00d1a3`; SPRITE
`9d905ec258c39b1846d33629e5ba47cb8e49dfa8`; CODEC
`5ed359a2560a1f04666b9ea02b71649b89cb16d7`.

| Comportamento | Fonte | Implementazione e prova | Stato | Residuo |
| --- | --- | --- | --- | --- |
| PRNG primario/secondari | PRET dg_random.c | 36.000 transizioni C/JS, incluse probabilità e range | verificato | Ordine globale delle chiamate nel dungeon non equivalente |
| Sequenza e velocità | PRET overlay_29_022EBCE8.s | Giocatore → nemici → stati/fame | differente | Scheduler frazionario, azioni multiple e velocità non implementati |
| Movimento, orientamento e diagonali | PRET/DEBUG | Otto direzioni, collisioni, orientamento gratuito con tastiera/mouse/touch, test browser degli invarianti | non verificato | Mobilità speciale e equivalenza completa da implementare |
| Crescita e soglie esperienza | PRET monster.md/m_level.bin; DAMAGE levelup-stats | 5.000 righe confrontate fra due rappresentazioni, 50 specie | verificato | Sequenza completa del level-up non confrontata con ROM |
| Esperienza da nemici | PRET main_0205283C.c e overlay_29_02308FBC.c | Base+base×(livello−1)/10; metà senza mosse | non verificato | Collegamenti, QI, casi speciali assenti; boss trattati come incontri roguelite |
| Danni, tipi, critici, precisione | DAMAGE + RNG adattato | WASM reale, 64 test upstream e 256 confronti C++/WASM | non verificato | Due build dello stesso calcolatore non sono riferimento indipendente; precheck Lightningrod/Storm Drain upstream approssimati |
| RNG del danno | PRET + DAMAGE | Mock sostituito nella copia di build con LCG reale | verificato | Equivalenza verificata fra build; ordine delle chiamate rispetto a ROM aperto |
| Attacco normale e PP | DAMAGE; PRET | Attacco e mosse, consumo PP e turno, prova a vuoto | non verificato | Pressure, collegamenti e scheduler completi mancanti |
| Portata e bersagli | PRET waza_p.bin; DEBUG enum | Range originali, linee, angoli, stanza/adiacenti, anteprima | non verificato | Scenari limite e bersagli speciali non confrontati con ROM |
| Numero colpi | PRET ov29_02324514 | 2..5 uniformi per strikes=0, Skill Link=5, Double Kick=2 | verificato | Interruzione e precheck fra colpi non certificati |
| Scottatura/congelamento/paralisi/tentennamento | PRET handler e costanti ASM | Probabilità originali estratte; gruppi indipendenti, timer, alcune immunità e risveglio da danno periodico | non verificato | Scheduling frazionario e tutte le interazioni ancora mancanti |
| Modifiche statistiche e assorbimento | PRET handler | Metal Claw 20%, Crunch/Shadow Ball 20%, drain metà, Liquid Ooze | non verificato | Modificatori e tutte le abilità non esauriti |
| Effetti specifici ancora mancanti | PRET | Non implementati completamente | differente | Confusione Water Pulse; rallentamento Bubble/Bubble Beam; costrizione Fire Spin |
| Abilità | DAMAGE + handler PRET | Danno e alcune immunità/effetti | non verificato | Effetti globali, contatto, tutti i casi di Mold Breaker e stati non ancora disponibili aperti |
| Strumenti usati/lanciati | PRET overlay_29_0231CBC8.c | Baccarancia 100 PS, Elisir Max, Mela 50/+5 Pancia, Semedormita direzionale | non verificato | Oggetti tenuti, bersagli/interazioni completi e altri strumenti mancanti |
| Trappole | Handoff | Veleno e danno fisso 8 | differente | Trappole provvisorie, non certificate EoS; da sostituire con handler originali |
| Fame | PRET BELLY_LOST_PER_TURN | 0x199A/65536 per azione, PS persi a Pancia vuota | non verificato | Scheduler e tutti i modificatori non riprodotti |
| Recupero naturale | PRET GetRegenSpeed e TickStatusAndHealthRegen | Accumula PS massimi/rate, solo leader, test contatore; nessuna cura gratuita sulle scale | non verificato | Timing frazionario, abilità/meteo/oggetti e stati completi aperti |
| IA e guardiani | Estensione + handoff | Pathfinding, mosse a portata, guardiano ogni 5 piani, nessun moltiplicatore boss o telegraph | differente | IA originale e tattiche non portate |
| Meteo, mosse di stato, collegamenti e QI | PRET/DAMAGE | Assenti nel ciclo di gioco; meteo fisso sereno | differente | Implementazione e verifiche necessarie |
| Mappe e seed | Estensione intenzionale | 2.000 mappe runtime con scale raggiungibili; snapshot RNG | verificato | Generatore volutamente roguelite, non quello originale |
| Piani oltre 2^53 | Estensione intenzionale | BigInt per progressione, boss e biomi; test integrato | verificato | Limite tecnico 128 cifre; livelli saturano a 100 |
| Mosse permanenti, quattro slot, reset run | Estensione intenzionale | Test simulazione e percorso browser reale dopo morte | verificato | Catalogo: 46 mosse EoS e Magibrillio adattato |
| Salvataggi/import/export | Schema v1, meccaniche v6; migrazione v3/v4/v5 | Roundtrip, replay, migrazione conservativa, rifiuto corruzioni senza mutazioni, browser reload | verificato | Archivio locale al browser; nessun cloud sync |
| Asset locali | SPRITE | 50 specie, 922 file verificati, 770 PNG decodificati | verificato | Dieci specie prive di Faint nella fonte |
| Direzioni/frame/tempi/ancoraggi | SPRITE; CODEC chara_wan/sheets.py | Renderer a 60 Hz, metadati XML, ancoraggi ombre; QA browser | non verificato | Interpolazione, affondo e particelle originali del progetto; nessun confronto frame per frame |
| Effetti visivi delle mosse | PMDCollab/RawAsset | 25 fogli, 47 associazioni, sequenza temporale, PS all’impatto, pausa e velocità | differente | Abbinamenti e tempi adattati; manca confronto frame per frame con EoS |
| Italiano ufficiale | PRET text_i.str; CODEC; PokeAPI nomi moderni | 18.482 stringhe roundtrip, 5.042 esportate; termini di gioco ufficiali | verificato | Testo narrativo originale del progetto; descrizioni UI sintetiche |
| Specie post-EoS | Modulo dichiarato | Donatori di statistiche, tipi, abilità e learnset documentati | differente | Conversioni intenzionali, non specie originali né regole moderne |
| Percorso completo browser | Requisito utente | Starter → combattimenti → boss 5 → piano 6 → ripresa → morte → nuova run | verificato | Test di applicazione, non certificazione del motore originale |
| Repository e push | GitHub | `main` caricata su `andrea288/mystery-depths`; commit remoto e file principali verificati | verificato | Al momento del push il repository era pubblico; il proprietario ha scelto di renderlo privato dopo il caricamento |

Non dichiarare il requisito prioritario concluso finché rimangono queste
righe “differente” o “non verificato” nel nucleo originale. La giocabilità
verificata non annulla gli scostamenti documentati.

## Strumenti e presentazione — 23 ottobre 2026

Otto nuovi strumenti: Baccapesca, Baccaliegia, Baccafrago, Semesalute,
Semevita, Baccacedro, Melagrande e Gigantomela. Nomi da text_i.str; effetti
di riferimento da PRET `src/overlay_29_0231CBC8.c` (commit e3f02199):
Semevita +3 PS massimi, Baccacedro recupero 100 o +2 PS massimi a PS pieni,
Melagrande recupero 100 Pancia e Gigantomela riempimento; a Pancia piena +10
capacità. Restano aperte le interazioni complete con abilità, stati non
implementati e ingestione degli strumenti nel motore originale.
La sequenza visiva opera su una copia dello stato: non cambia RNG, danni o
numero di turni. I tempi scelti sono di presentazione, non dati originali EoS.

## Squadra e boss tattici — meccaniche v6

Reclutamento, squadra 6/3, ordini individuali contro i boss, 18 biomi e guardiani
sono estensioni roguelite richieste dall'utente. Non riproducono le regole di
reclutamento o tattica originali EoS. I nuovi boss ricevono un bonus PS crescente.
Il tipo Folletto e Magibrillio sono adattamenti dichiarati; la mossa usa Comete
come base numerica EoS. Le 37 mosse precedenti restano nel nucleo originale.
Dettagli, fattori e limiti: [SQUADRA-E-GUARDIANI.md](SQUADRA-E-GUARDIANI.md).
