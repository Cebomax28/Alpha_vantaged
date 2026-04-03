Panoramica Generale del Progetto
Il progetto è una dashboard finanziaria interattiva e dinamica, progettata per monitorare il mercato azionario, visualizzare grafici storici, leggere notizie correlate alle aziende e gestire un portafoglio (watchlist). L'applicazione simula un terminale professionale per il trading e l'analisi dei dati, utilizzando tecnologie web standard (HTML, CSS, JavaScript) e librerie esterne per arricchire l'esperienza utente.

L'architettura si basa su un approccio "Client-Server" simulato, dove il front-end (il codice che abbiamo scritto) comunica costantemente con un back-end locale (probabilmente gestito tramite json-server sulla porta 3000). Questo back-end fornisce dati strutturati in formato JSON, simulando le risposte di una vera API finanziaria come Alpha Vantage.

L'interfaccia utente è progettata per essere reattiva e informativa. Appena l'utente apre l'applicazione, viene accolto da un "ticker" scorrevole che mostra i prezzi in tempo reale, una mappa globale vuota pronta a mostrare la sede delle aziende, e un'area principale dedicata ai grafici e ai dettagli aziendali.

Le Librerie Integrate
Per rendere possibile tutto questo, il progetto fa affidamento su diverse librerie fondamentali:

Bootstrap (CSS/JS): Utilizzato per il layout responsivo, i pulsanti, i badge, le finestre modali (Modal) e le barre laterali a scomparsa (Offcanvas).

Chart.js: Il motore principale per la visualizzazione dei dati. Permette di creare grafici a barre, a torta, a linee e radar, rendendo i numeri complessi facilmente digeribili.

MapLibre GL JS: Un potente motore di rendering per mappe interattive. Viene usato per geolocalizzare l'indirizzo della sede dell'azienda selezionata e posizionare un marker (un chiodino) sulla mappa.

Struttura HTML Implicita e Layout
Anche se non vediamo il file HTML direttamente, il codice JavaScript fa riferimento a numerosi ID e classi, permettendoci di ricostruire mentalmente la struttura della pagina.

La Barra Superiore (Header e Ticker)
In alto, la pagina presenta probabilmente un contenitore dedicato al ticker di mercato. Questo elemento (tickerContainer) funge da nastro scorrevole in cui i simboli azionari scorrono continuamente da destra a sinistra. All'interno del nastro, ogni azienda ha il suo blocco testuale che mostra il prezzo, la percentuale di cambiamento giornaliera e un mini-grafico (sparkline) disegnato in un elemento <canvas> di 60x20 pixel.

L'Area di Ricerca e Selezione
Sotto il ticker, troviamo la plancia di comando. Qui l'utente interagisce con due elementi chiave:

Input di Ricerca (searchInput): Un campo di testo dove l'utente può digitare il nome di un'azienda o il suo simbolo (es. "Apple" o "AAPL"). Sotto di esso, si nasconde un menu a tendina dinamico (searchResults) che appare come per magia quando ci sono corrispondenze.

Menu a Tendina delle Aziende (companySelect): Una <select> HTML classica che elenca tutte le aziende disponibili nel database. Selezionare un elemento qui scatena l'aggiornamento di tutta l'interfaccia.

L'Area Principale (Dettagli e Grafici)
Il cuore dell'applicazione. Quest'area è divisa in diverse sezioni:

Intestazione Aziendale: Mostra il nome dell'azienda (overviewName), il simbolo azionario (quoteSymbol), il prezzo attuale (quotePrice) e una tabella dettagliata con valori come apertura, chiusura, massimo, minimo e volume.

Descrizione e Mappa: Un paragrafo testuale (overviewDesc) racconta la storia dell'azienda, seguito dall'indirizzo fisico (overviewAddress). Accanto o sotto, c'è un blocco div con id map dove MapLibre renderizza la cartina geografica.

Selettore del Grafico (chartType): Un menu per scegliere il tipo di visualizzazione (linee, barre, torta, ecc.).

L'Elemento Canvas Principale (myChart): Il palcoscenico di Chart.js, dove vengono disegnati i grafici storici mensili.

I Contenitori Fluttuanti (Modals e Offcanvas)
La pagina ospita elementi nascosti che compaiono solo quando richiamati:

Modale di Sistema (systemModal): Usata per mostrare messaggi di errore o avvisi.

Offcanvas delle Notizie (newsOffcanvas): Una barra laterale che scivola da destra verso sinistra, contenente una lista di notizie finanziarie.

Modale degli Articoli (articleModal): Una finestra in sovrimpressione per leggere il riassunto di una notizia specifica.

Insight AI (aiInsight): Un piccolo box in basso a sinistra che simula un'intelligenza artificiale, suggerendo consigli di trading ogni 10 secondi.

Loader (cyberLoader): Un'animazione (probabilmente uno spinner o un effetto "cyber") che copre lo schermo durante i caricamenti dei dati.

I Pulsanti: Il Motore dell'Interazione
Ogni pulsante nel progetto ha uno scopo preciso e scatena una serie complessa di eventi JavaScript. Ecco una spiegazione dettagliata di cosa fa ciascun bottone.

1. Il Pulsante "Salva JSON" (btnDownloadDb)
Scopo: Permettere all'utente di scaricare una copia di backup dell'intero database locale.
Dettaglio dell'azione:
Questo bottone viene generato dinamicamente via JavaScript all'avvio della pagina (tramite appendSaveJsonBtn). Quando l'utente ci clicca sopra, la funzione executeJsonDownload entra in azione.
Prima di tutto, prova a contattare l'endpoint globale /db del server locale. Se il server risponde con l'intero oggetto database, i dati vengono salvati. Se il server non supporta la rotta /db, la funzione esegue chiamate separate per ogni singola tabella (GLOBAL_QUOTE, NEWS, OVERVIEW, ecc.) e ricostruisce il database in memoria.
Una volta ottenuti i dati, il codice li converte in una stringa di testo formattata (JSON.stringify). Viene quindi creato un "Blob" (Binary Large Object) di tipo application/json. Il browser crea un URL fittizio temporaneo per questo Blob. Il codice crea poi un tag <a> (un link invisibile), gli assegna l'URL del Blob, imposta il nome del file da scaricare come "db2026.json", e simula un clic su di esso. Il risultato è che il browser dell'utente scarica fisicamente il file sul disco rigido. Alla fine, il link invisibile e l'URL temporaneo vengono distrutti per liberare memoria.

2. Il Pulsante "Aggiorna Dati" (btnUpdateData)
Scopo: Sincronizzare il database locale con i dati reali in tempo reale provenienti dall'API remota di Alpha Vantage.
Dettaglio dell'azione:
Cliccando questo bottone (gestito da syncWithAlphaVantage), l'app prima verifica se è stata selezionata un'azienda. Se sì, il bottone cambia aspetto: diventa giallo, smette di pulsare e mostra una clessidra con il testo "Download in corso...".
Il codice effettua una chiamata HTTP all'API di Alpha Vantage chiedendo la GLOBAL_QUOTE del simbolo selezionato. Se l'API remota risponde con successo (e non con un errore di limite API), i dati freschi vengono isolati.
Subito dopo, l'app interroga il server locale per scoprire qual è l'ID univoco (la chiave primaria) associato a quell'azienda nel nostro database JSON. Trovato l'ID, viene effettuata una richiesta PUT al server locale per sovrascrivere i vecchi dati con quelli appena scaricati.
Se tutto va a buon fine, il bottone diventa verde e recita "DB Locale Aggiornato!". Viene poi richiamata la funzione per ricaricare il ticker in alto, in modo che i nuovi prezzi si riflettano ovunque. Dopo 3 secondi, il bottone torna automaticamente al suo stato originale.

3. Il Pulsante "Scarica Grafico" (downloadChartBtn)
Scopo: Salvare il grafico attualmente visualizzato come immagine PNG sul computer dell'utente.
Dettaglio dell'azione:
Collegato alla funzione exportGraphPng, questo bottone controlla prima se esiste effettivamente un grafico disegnato sul canvas (activeGraphObject). Se c'è, chiama un metodo speciale del file esterno (probabilmente una classe personalizzata BarChart) per assicurarsi che lo sfondo del canvas sia bianco opaco e non trasparente (altrimenti il PNG salvato risulterebbe illeggibile su sfondi scuri).
Successivamente, utilizza il metodo nativo di Chart.js .toBase64Image() per convertire i pixel del canvas in una lunghissima stringa di testo (Base64) che rappresenta un'immagine. Crea un link <a> invisibile, imposta la stringa Base64 come sorgente, assegna il nome "alpha_chart.png" e simula un clic. Il browser salva l'immagine.

4. Il Pulsante "Stella" / Watchlist (btnToggleWatchlist)
Scopo: Aggiungere o rimuovere l'azienda attualmente visualizzata dai preferiti dell'utente.
Dettaglio dell'azione:
Quando si clicca questo bottone (updateWatchlistState), il codice legge il valore del simbolo azionario attualmente attivo. Cerca questo simbolo nell'array in memoria savedWatchlistSymbols. Se il simbolo non c'è, lo "pusha" (lo aggiunge) all'array. Se c'è già, lo rimuove tagliandolo via con il metodo .splice().
La magia avviene subito dopo: l'intero array viene trasformato in testo e salvato nel localStorage del browser. Questo significa che se l'utente chiude la scheda e torna il giorno dopo, i suoi preferiti saranno ancora lì.
Infine, viene chiamata la funzione che ridisegna i "badge" (le etichette visive) della watchlist nell'interfaccia e cambia il testo e il colore del bottone stesso (da "Salva" a "Rimuovi" e viceversa).

5. Il Pulsante "Notizie" (news-btn generato dinamicamente)
Scopo: Aprire la barra laterale con gli articoli di giornale relativi all'azienda.
Dettaglio dell'azione:
Questo pulsante non esiste nell'HTML di base. Viene creato via JavaScript e infilato accanto al nome dell'azienda non appena se ne seleziona una. Cliccandolo, si attiva loadCompanyArticles.
L'azione apre l'Offcanvas di Bootstrap facendolo scivolare sullo schermo. Cambia il titolo dell'Offcanvas inserendovi il nome dell'azienda e mostra uno spinner di caricamento. Nel frattempo, fa una richiesta GET al server locale chiedendo l'array /NEWS filtrato per il simbolo dell'azienda.
Quando i dati arrivano, il bottone ha fatto il suo dovere: il codice itera sugli articoli, controlla il sentiment (positivo, negativo, neutro), assegna icone e colori corrispondenti, formatta le date e costruisce una lista di blocchi HTML per ogni notizia.

6. I Pulsanti "Leggi articolo" (read-article-btn generati dinamicamente)
Scopo: Mostrare il riassunto esteso di una singola notizia in una finestra modale al centro dello schermo.
Dettaglio dell'azione:
Questi pulsantini si trovano dentro la barra laterale delle notizie, uno per ogni articolo. Quando l'HTML dell'articolo viene costruito, a questi pulsanti vengono assegnati dei data-attributes (attributi nascosti nell'HTML) contenenti il titolo, il testo, la fonte e la data della notizia.
Quando l'utente clicca, un Event Listener intercetta il clic, estrae tutti questi dati nascosti dal bottone, e li passa alla funzione openArticleDialog. Questa funzione riempie il corpo, il titolo e il piè di pagina della Modale (articleModal) con i dati estratti, avendo cura di usare sanitizeString per evitare l'iniezione di codice maligno (XSS). Infine, chiama il metodo .show() di Bootstrap per far comparire la modale.

7. I Pulsanti di Chiusura Modali (btn-close, btn-secondary)
Scopo: Chiudere le finestre in sovrapposizione e restituire il controllo alla pagina principale.
Dettaglio dell'azione:
Non hanno logica JavaScript personalizzata scritta da noi. Funzionano in modo automatico grazie agli attributi data-bs-dismiss="modal" o data-bs-dismiss="offcanvas" forniti dalla libreria Bootstrap. Bootstrap intercetta il clic, avvia l'animazione di sfumatura o scivolamento inverso, e rimuove lo sfondo scuro (backdrop) dalla pagina.

Analisi Dettagliata della Logica JavaScript
Il file index.js è scritto con la direttiva "use strict", imponendo regole severe di programmazione per evitare errori comuni (come l'uso di variabili non dichiarate). L'architettura è procedurale e pesantemente basata su funzioni asincrone (async/await) per gestire le chiamate di rete senza bloccare l'interfaccia.

1. La Fase di Inizializzazione (startApplication)
Quando lo script viene caricato, l'esecuzione parte immediatamente. La funzione startApplication è il direttore d'orchestra.
Il suo primo compito è istanziare i componenti visivi di Bootstrap (come le modali). Successivamente, lancia una serie di funzioni asincrone in sequenza. Prima disegna la mappa vuota, poi carica la lista completa delle aziende per popolare la tendina, e infine carica i dati per il ticker in alto.
Una volta che i dati base sono in memoria, la funzione "attacca" i cavi: chiama setupDomEvents per registrare cosa deve succedere quando l'utente clicca o digita, ridisegna la watchlist pescando dal disco rigido, prepara le finestre laterali e fa partire il ciclo infinito dei suggerimenti AI. Solo quando tutto è pronto, l'interfaccia viene svelata rimuovendo la classe CSS che nascondeva la pagina o mostrava lo spinner iniziale (removeLoader).

2. Il Motore di Ricerca con Debounce (applyInputDelay)
Uno dei problemi classici delle barre di ricerca è che fare una chiamata al server ad ogni singola lettera digitata ("A", poi "Ap", poi "App"...) intasa la rete e rallenta il browser.
Il codice risolve elegantemente questo problema con una "closure" chiamata applyInputDelay (una classica funzione di debounce). Quando l'utente digita, questa funzione avvia un timer di 1000 millisecondi (1 secondo). Se l'utente digita un'altra lettera prima che il secondo sia passato, il timer viene azzerato e ricomincia. L'effettiva funzione di ricerca (processSearchQuery) partirà solo quando l'utente smetterà di digitare per un intero secondo.
Quando la ricerca parte, controlla se la parola digitata è presente nel nome o nel simbolo dell'azienda, usando .includes(). Se trova corrispondenze, genera una lista <li> dinamica sotto l'input box.

3. Gestione del Nastro Scorrevole (Ticker) e Sparklines
La funzione buildTickerBar è complessa perché fa due cose: crea il testo del ticker e disegna un grafico a mano libera per ognuno.
Scandisce tutte le aziende del database. Per ognuna, formatta il prezzo con due decimali (toFixed(2)). Per determinare se la freccia deve puntare in alto o in basso, converte la variazione in un numero decimale e controlla se è maggiore/uguale a zero.
Ma il vero tocco di classe è createSparklineData. Questa funzione fa una chiamata API specifica per l'intraday (i dati giornalieri divisi per orario) dell'azienda. Estrae le date, le ordina cronologicamente usando il motore JavaScript integrato per le date (new Date(dateA) - new Date(dateB)), e prende solo gli ultimi 4 campionamenti usando .slice(-4).
Questi 4 numeri vengono passati a drawMiniCanvas. Qui non viene usato Chart.js, ma l'API nativa HTML5 Canvas. Il codice calcola dinamicamente la scala Y: trova il numero più piccolo e il più grande per determinare l'escursione termica (il range). Traccia delle linee (lineTo) interpolando i punti nello spazio di 60x20 pixel. Traccia i percorsi con un colore verde acceso o rosso fuoco in base alla performance, e infine aggiunge dei piccoli cerchi (arc) sui nodi per marcare visivamente i dati. Questo canvas viene trasformato in HTML e iniettato nel nastro.

4. Il Cuore Pulsante: Selezione di un'Azienda (onCompanyDropdownChange)
Questa è la funzione più pesante e critica dell'applicazione. Quando si sceglie un'azienda dalla tendina, il sistema deve ricaricare l'universo.
Per non perdere tempo, la funzione lancia tre chiamate di rete in parallelo usando Promise.all. Questa tecnica è vitale: invece di aspettare le quotazioni (1 secondo), POI le descrizioni (1 secondo), POI i dati storici (1 secondo), il browser fa tutte e tre le richieste assieme, impiegando 1 solo secondo totale. L'esecuzione del codice si sospende (await) finché l'ultima delle tre risposte non è arrivata.
Una volta ottenuti i tre malloppi di dati:

Passa le quotazioni a refreshQuoteData, che si occupa di estrarre i numeri puntuali e aggiornare l'intestazione e la tabella in grassetto, applicando colori condizionali in base ai profitti/perdite.

Passa le info generali a refreshCompanyInfo. Questa funzione inietta la descrizione testuale nel DOM. Poi, legge l'indirizzo testuale (es. "Cupertino, CA"). Usa il modulo myMapLibre.geocode per convertire quella stringa in coordinate GPS (latitudine e longitudine). Una volta avute le coordinate, ordina a MapLibre di spostare il centro della mappa in quel punto e piazza un marker grafico personalizzato con un popup contenente il nome e la via dell'azienda.

Passa i dati storici a parseTimeSeriesData, che estrae la serie temporale e lancia la creazione del grafico principale.

5. Il Motore Grafico: Chart.js Integrato
La funzione drawMainGraph è un trionfo di manipolazione degli Array.
Inizia prendendo la serie temporale grezza e ordinandola cronologicamente. Dato che l'utente può selezionare dati giornalieri, la lista potrebbe contenere centinaia di punti. Il codice crea una logica di "condensazione mensile". In un ciclo for, estrae l'anno e il mese da ogni data. Se incontra più dati dello stesso mese, continua a sovrascrivere l'ultimo punto salvato. Alla fine del ciclo, rimarrà solo l'ultimo campionamento valido per ogni singolo mese, pulendo enormemente il grafico.
Successivamente, controlla il tipo di grafico richiesto (visualStyle). Se l'utente ha chiesto un grafico circolare (torta, ciambella o area polare), visualizzare decine di mesi creerebbe un grafico illeggibile. Il codice lo capisce e interviene tagliando forzatamente l'array agli ultimi 12 mesi (datasetToRender.slice(-12)). Cambia anche il testo del badge esplicativo, facendolo diventare giallo per avvertire l'utente del taglio dei dati.
I colori vengono generati dinamicamente. Se è un grafico a barre, tutto è azzurro ciano semitrasparente. Se è una torta, utilizza un calcolo matematico HSL (Tonalità, Saturazione, Luminosità) basato sulla lunghezza dell'array per generare un arcobaleno perfetto e distribuito equamente hsl(${(cIndex * 360 / length) % 360}, 80%, 60%).
Prima di disegnare, c'è un passaggio critico: se esisteva già un grafico precedente nel canvas, il codice invoca activeGraphObject.destroy(). Questo è un dettaglio vitale nell'uso di Chart.js, perché altrimenti il nuovo grafico si sovrapporrebbe al vecchio, creando sfarfallii e glitch grafici mostruosi quando si passa col mouse.
Viene anche programmato un "tooltip" (il riquadretto nero che appare al passaggio del mouse). Il codice intercetta il disegno del tooltip, legge il valore attuale e quello del mese precedente. Esegue un calcolo percentuale matematico standard: ((Oggi - Ieri) / Ieri) * 100, aggiunge la freccia direzionale corretta e restituisce il testo formattato al motore di rendering per mostrarlo all'utente.

6. Il Sistema di Watchlist e Gestione dello Stato
L'applicazione non usa un database per salvare i preferiti degli utenti, usa la memoria del browser (localStorage). Questo significa che la watchlist è privata e non condivisa sul server.
Quando la pagina si apre, savedWatchlistSymbols legge dal localStorage. Dato che il localStorage può contenere solo testo, il codice tenta di interpretare il testo come array usando JSON.parse. Se il localStorage è vuoto o non esiste, il codice non va in errore ma adotta la stringa fallback "[]", creando un array vuoto garantito.
La funzione drawWatchlistBadges si occupa del rendering visivo. Prima cosa, fa una tabula rasa: cerca tutte le etichette vecchie usando il selettore di classe .watchlist-badge e le elimina brutalmente dal DOM (badgeEl.remove()). Questo approccio "svuota e ridisegna" è tipico dei framework reattivi moderni (come React), ma qui è implementato manualmente (Vanilla JS).
Successivamente, nasconde o mostra il messaggio testuale "Nessun preferito", poi cicla sull'array in memoria e crea dei tag <span> stile Bootstrap. Ad ogni span, "appiccica" un Event Listener per il click. Questa chiusura lessicale (closure) fa sì che ogni badge ricordi esattamente per quale simbolo è stato creato. Cliccando un badge, il sistema simula una selezione dal menu a tendina e forza l'aggiornamento dell'intera applicazione.

7. Il Criptico Box di Intelligenza Artificiale
In fondo al codice, troviamo injectAiTips. Questa funzione è slegata dal resto dell'interfaccia. Non ci sono pulsanti nell'HTML originale per essa; il box visivo viene costruito, stilizzato con classi CSS (sfondo scuro opaco, blur del backdrop, posizionamento fisso in basso a sinistra) e agganciato al document.body interamente tramite manipolazione del DOM via JavaScript.
La "finta" intelligenza artificiale è in realtà un array statico di stringhe (consigli finanziari). Viene sfruttata la funzione setInterval che, ogni 10.000 millisecondi (10 secondi), si sveglia, chiama un generatore di numeri casuali tra 0 e la lunghezza massima dell'array, estrae la stringa corrispondente e aggiorna brutalmente l'HTML interno del box.

8. Gestione degli Errori di Rete
In ogni singola chiamata ajax.sendRequest, notiamo l'aggiunta finale di .catch(ajax.errore).
Poiché il codice è scritto eliminando blocchi try/catch per volere architetturale, se la Promise della richiesta di rete dovesse fallire (ad esempio perché il server Node.js locale è spento, o perché manca internet), il programma si bloccherebbe fatalmente senza questo .catch(). Invece, l'errore viene delegato a una funzione esterna (appartenente alla libreria ajax) che, presumibilmente, stamperà l'errore in console o mostrerà un avviso silenzioso, permettendo alla nostra applicazione di restituire semplicemente null o undefined nelle variabili come networkResponse, senza rompere il flusso della pagina. Il codice è pieno di controlli "if" (if (networkResponse), if (quoteArray && quoteArray.length > 0)) proprio per difendersi dall'eventualità in cui la rete fallisca o i dati JSON non abbiano la struttura sperata.
