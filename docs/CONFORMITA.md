# Matrice di conformità

Versione delle regole: EoS NA. “Verificato” vale solo per la prova descritta,
non per il prodotto nel suo insieme. Non è stato eseguito un confronto con
la ROM in un emulatore. Nessuna dichiarazione di identità al 100%.

Riferimenti abbreviati:

- **PRET**: `pret/pmd-sky@e3f02199ebe9e263ee67b07f36b3f240f83ef5d9`
- **DAMAGE**: `UsernameFodder/damage-eos@a1fa84ce0f436e5a2887943e807839372f26a245`
- **DEBUG**: `UsernameFodder/pmdsky-debug@c72fe675919ec83cfe93f687973afae85e00d1a3`
- **SPRITE**: `PMDCollab/SpriteCollab@9d905ec258c39b1846d33629e5ba47cb8e49dfa8`
- **CODEC**: `SkyTemple/skytemple-files@5ed359a2560a1f04666b9ea02b71649b89cb16d7`

| Comportamento | Fonte/versione | Implementazione e prova | Stato | Scostamento residuo |
| --- | --- | --- | --- | --- |
| PRNG primario e cinque flussi secondari | PRET `src/dg_random.c`, NA | Port JS; 36.000 valori e transizioni confrontati con funzioni C upstream | verificato | Verificato contro il sorgente C, non ROM; ordine delle chiamate del motore aperto |
| Intervalli RNG, probabilità, intervallo vuoto | PRET `src/dg_random.c` | Test differenziale C/JS; consumo dello stato | verificato | Non include durata stati e chiamate nel motore |
| Sequenza azioni e sottoturni | PRET `asm/overlay_29_022EBCE8.s` | Fonte individuata; scheduler non implementato | non verificato | Tutto il comportamento integrato |
| Movimento otto direzioni, orientamento, collisioni e terreno | PRET/DEBUG | Nessuna implementazione di movimento | non verificato | Nessun test di collisione originale |
| Velocità, turni multipli e modificatori | PRET/DEBUG | Non implementati | non verificato | Interazioni e ordine azioni |
| Statistiche, crescita, stadi e limiti | DAMAGE; PRET | Libreria upstream disponibile e testata | non verificato | Integrazione, limiti e crescita nel gioco non verificati indipendentemente |
| Danni, precisione, critici, STAB e tipi | DAMAGE; PRET `src/overlay_29_0230BBAC.c` e `type_effectiveness.c` | 64 test upstream complessivi superati, esempio CLI eseguito | non verificato | Suite upstream non equivale a confronto indipendente completo; nessun combattimento integrato |
| RNG del calcolatore danni | DAMAGE `MockDungeonRNG` | Riferimento upstream conservato | differente | È un mock del calcolatore, non il PRNG del gioco; non usarlo come simulazione |
| Attacco normale e mosse | DAMAGE parziale; PRET | Nessuna esecuzione in una run | non verificato | Azioni, effetti e collegamenti mancanti |
| PP, bersagli, linee, angoli e area | PRET/DEBUG | Non implementati | non verificato | Nessuna prova di portata integrata |
| Effetti secondari, stati, durate e immunità | PRET/DEBUG; DAMAGE parziale | Non integrati | non verificato | Non inferire comportamenti dai soli nomi |
| Abilità e interazioni | PRET/DAMAGE | Alcuni calcoli nel riferimento | non verificato | Effetti globali e condizioni non coperti |
| Oggetti tenuti, lanciati, usati e trappole | PRET/DAMAGE | Dati/test parziali nel riferimento | non verificato | Nessun inventario di run funzionante |
| Fame, recupero e meteo | PRET/DEBUG | Non implementati nel gioco | non verificato | Scheduling e consumo risorse |
| IA, nemici e boss | PRET/DEBUG | Solo posizioni spawn e flag quinto piano | non verificato | Nessun nemico o boss funzionante |
| Mosse collegate e QI | PRET/DAMAGE | Alcuni modificatori nel calcolatore | non verificato | Collegamento e abilità QI complete assenti |
| Mappe roguelite connesse e seed | Estensione intenzionale | 2.000 mappe: ogni cella calpestabile, scala e spawn raggiungibile | verificato | Non è il generatore EoS; non prova le collisioni del nucleo |
| Piani oltre gli interi sicuri JS | Estensione intenzionale | BigInt, test oltre 2^53, boss ogni 5 piani | verificato | Limite tecnico 128 cifre dichiarato |
| Apprendimento permanente per specie e quattro slot | Estensione intenzionale | Test unitari di apprendimento, equipaggiamento e roundtrip | verificato | UI, catalogo apprendibile completo e ricompense da integrare |
| Esclusione bonus temporanei dal profilo | Estensione intenzionale | Schema rifiuta risorse di run | verificato | Morte e nuova run non ancora esercitate |
| Export/import profilo | Formato progetto v1 | Input corrotto, versioni future, proprietà ostili e quota testati | verificato | Run completa non serializzata; storage reale browser non testato |
| Asset locali dei 29 starter | SPRITE | 553 file con hash, 464 PNG decodificati, tavola visiva ispezionata | verificato | Integrità e disponibilità, non animazione nel browser |
| Direzioni, ancoraggi, frame e tempi | SPRITE XML, offset e shadow | Metadati conservati; otto righe Walk controllate | non verificato | Renderer e confronto dei tempi originali assenti |
| Effetti visivi originali delle mosse | Originale | Non acquisiti/implementati | non verificato | Animazione Attack non sostituisce l'effetto della mossa |
| Nomi e testi italiani EoS | PRET `files/MESSAGE/text_i.str`, EU; CODEC | 18.482 stringhe roundtrip, 5.042 esportate; test hash e nomi | verificato | Rendering dei tag e copertura delle schermate ancora da fare |
| Starter successivi a EoS | SPRITE; PokeAPI solo nomi | Asset e nomi disponibili, modulo marcato `post-eos` | non verificato | Conversioni di regole non ancora definite |
| Percorso QA completo nel browser | Specifica utente | Non eseguito; nessuna app giocabile | non verificato | Intero percorso starter→boss→ricompensa→ripresa→morte→nuova run |
| Repository privato, commit e push remoti | GitHub | Commit locali; API bloccata dal proxy | non verificato | Remoto non creato/verificato, nessun push |
