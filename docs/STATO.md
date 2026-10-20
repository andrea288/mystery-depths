# Stato e ripresa

## Vincoli da mantenere

- Prodotto richiesto completo, non demo spacciata per prodotto.
- Regole EoS NA; niente formule generiche della serie principale.
- Interfaccia italiana e denominazioni ufficiali. Testi EoS da tabella EU.
- Tutti i 29 starter; contenuti post-EoS isolati e dichiarati come conversioni.
- Repository `mystery-depths` privato; nessun hosting pubblico.
- Decisioni ordinarie delegate dall'utente; autorizzate modifiche al repository.
- Nessuna dichiarazione “100% identico” senza prova.
- Ogni task cloud è già isolato: usare il checkout esistente, non creare worktree.

## Completato e verificato

1. Fonti richieste esaminate e fissate; alternative PMDO/Origins non equiparate
   a EoS.
2. Calcolatore C++ nativo compilato; 64 test upstream passati; esempio CLI reale.
3. PRNG dungeon portato in JS; 36.000 transizioni confrontate con C upstream.
4. Generazione mappe roguelite testata su 2.000 seed/piani, connettività totale.
5. Profilo permanente con validazione, quattro slot e import/export unit tested.
6. Asset di 29 starter locali, 553 file verificati e 464 PNG decodificati.
7. Italiano originale estratto: 18.482 stringhe roundtrip, 5.042 esportate.
8. Bozza di rete salvata per api.github.com e storage.googleapis.com.
9. Salvati anche `install_script` e `start_skill` nella bozza dell'ambiente,
   per dipendenze, build nativa, test e istruzioni di ripresa. Nessuna
   pubblicazione dell'ambiente o ripristino in un nuovo task verificati.

## Blocchi esterni effettivi

- Proxy: `gh api user` e `gh api repos/andrea288/mystery-depths` restituiscono
  Forbidden. Anche CONNECT senza credenziali verso api.github.com restituisce
  403. GH_TOKEN presente, valore mai letto/stampato.
- SDK: `emsdk install 3.1.29` fallisce sul download
  `storage.googleapis.com/webassembly/emscripten-releases-builds/deps/node-v14.18.2-linux-x64.tar.xz`
  con errore CONNECT 403.
- La bozza è salvata, ma non prova aggiornamento runtime o pubblicazione.
  Lo strumento restituisce `requires_publish: true`.

## Lavoro residuo, non mascherato da blocchi

Il gioco resta da completare. La rete non è l'unica attività restante:
turni, movimento originale, danni integrati, effetti delle mosse, strumenti,
stati, abilità, IA, fame, meteo, ricompense, boss funzionanti, run salvabile,
renderer, UI, animazioni, QA browser e confronto completo sono ancora aperti.
La matrice dettaglia i limiti. Non affermare che basti abilitare due domini
per ottenere automaticamente il prodotto.

## Prossimo passo operativo

1. Dopo un aggiornamento effettivo delle impostazioni, riprovare `gh api user`
   e l'installazione Emscripten; non aggiungere un secondo token alla cieca.
2. Creare il repository privato nell'account verificato; se esiste, verificarne
   pertinenza e visibilità. Solo allora aggiungere origin e fare push.
3. Compilare il riferimento WebAssembly e verificare risultati contro la
   build nativa. Non usare il calcolatore medio come simulazione del gioco.
4. Portare scheduler e meccaniche originali da PRET/DEBUG con test differenziali;
   completare mapping dati originali, effetti e conversioni post-EoS.
5. Integrare moduli roguelite, renderer e italiano. Eseguire il percorso QA
   completo richiesto, aggiornando la matrice con evidenze indipendenti.

I checkout esterni in `/workspace/references/` sono materiali di ricerca e
toolchain, non repository dell'utente da pubblicare. Il progetto è
`/workspace/mystery-depths`; `/workspace/andrea288` è rimasto invariato.
