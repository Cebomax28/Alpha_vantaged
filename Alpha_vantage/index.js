"use strict";

const serverApiUrl = "http://localhost:3000";

const searchInputEl = document.getElementById("searchInput");
const searchResultsBox = document.getElementById("searchResults");
const companyDropdownNode = document.getElementById("companySelect");
const graphTypeSelect = document.getElementById("chartType");
const exportGraphBtn = document.getElementById("downloadChartBtn");
const syncDataButton = document.getElementById("btnUpdateData");
const marketTickerWrapper = document.getElementById("tickerContainer");
const mainLoadingSpinner = document.getElementById("cyberLoader");
const mapDisplayArea = document.getElementById("map");

let barChartConfiguration = new BarChart();
let activeGraphObject = null;
let mapPinNodes = [];
let selectedTimeSeries = null;
let systemAlertModal = null;
let cachedCompanyList = [];
let savedWatchlistSymbols = JSON.parse(localStorage.getItem("watchlist") || "[]");

startApplication();

async function startApplication() {
    systemAlertModal = new bootstrap.Modal(document.getElementById("systemModal"));
    await renderBaseMap();
    await fetchInitialCompanies();
    await buildTickerBar();
    setupDomEvents();
    drawWatchlistBadges();
    buildNewsSidebar();
    buildArticleDialog();
    injectAiTips();
    removeLoader();
}

function displayLoader() { 
    mainLoadingSpinner.classList.remove("d-none"); 
}

function removeLoader() { 
    mainLoadingSpinner.classList.add("d-none"); 
}

function openSystemDialog(alertTitle, alertMessage) {
    document.getElementById("systemModalTitle").textContent = alertTitle;
    document.getElementById("systemModalBody").textContent = alertMessage;
    systemAlertModal.show();
}

async function renderBaseMap() {
    await myMapLibre.drawMap(myMapLibre.darkStyle, "map", { center: [0, 0] }, 1);
}

function removeMapPins() {
    for (const pinNode of mapPinNodes) {
        pinNode.remove();
    }
    mapPinNodes = [];
}

function revealMapArea() {
    mapDisplayArea.style.display = "block";
    const mapPlaceholderMsg = document.getElementById("mapMessage");
    if (mapPlaceholderMsg) {
        mapPlaceholderMsg.classList.add("d-none");
        mapPlaceholderMsg.classList.remove("d-flex");
    }
}

function collapseMapArea() {
    mapDisplayArea.style.display = "none";
    const mapPlaceholderMsg = document.getElementById("mapMessage");
    if (mapPlaceholderMsg) {
        mapPlaceholderMsg.classList.remove("d-none");
        mapPlaceholderMsg.classList.add("d-flex");
    }
}

async function buildTickerBar() {
    const networkResponse = await ajax.sendRequest("GET", serverApiUrl + "/GLOBAL_QUOTE").catch(ajax.errore);
    
    if (networkResponse) {
        const quoteItems = networkResponse.data;
        
        if (quoteItems && quoteItems.length > 0) {
            marketTickerWrapper.innerHTML = "";
            let generatedHtml = "";

            for (let quoteItem of quoteItems) {
                const itemSymbol = quoteItem["01. symbol"] || quoteItem["symbol"];
                const itemPrice = parseFloat(quoteItem["05. price"]).toFixed(2);
                const itemChange = parseFloat(quoteItem["09. change"]);
                const itemChangePercent = quoteItem["10. change percent"];

                if (itemSymbol && !isNaN(itemPrice)) {
                    const textColorClass = itemChange >= 0 ? "text-success" : "text-danger";
                    const trendIcon = itemChange >= 0 ? "▲" : "▼";
                    const sparklineNode = await createSparklineData(itemSymbol);
                    const sparklineHtml = sparklineNode ? sparklineNode.outerHTML : "";

                    generatedHtml += `<div class="ticker__item">${itemSymbol}: $${itemPrice} <span class="${textColorClass}">${trendIcon} ${itemChangePercent}</span>${sparklineHtml}</div>`;
                }
            }

            marketTickerWrapper.innerHTML = generatedHtml + generatedHtml;
        }
    }
}

async function createSparklineData(targetSymbol) {
    const intradayResponse = await ajax.sendRequest("GET", serverApiUrl + "/TIME_SERIES_INTRADAY").catch(ajax.errore);
    
    if (intradayResponse && intradayResponse.data) {
        const intradayRecord = intradayResponse.data.find(r => r.symbol === targetSymbol);
        
        if (intradayRecord) {
            const timeSeriesPoints = intradayRecord["Intraday Time Series"];
            
            if (timeSeriesPoints) {
                const sortedTimestamps = Object.keys(timeSeriesPoints).sort((dateA, dateB) => new Date(dateA) - new Date(dateB));
                const closingValues = sortedTimestamps.slice(-4).map(timestamp => parseFloat(timeSeriesPoints[timestamp]["4. close"]));
                
                if (closingValues.length >= 2) {
                    return drawMiniCanvas(closingValues);
                }
            }
        }
    }
    return null;
}

function drawMiniCanvas(dataValues) {
    const canvasEl = document.createElement("canvas");
    canvasEl.width = 60;
    canvasEl.height = 20;
    canvasEl.style.marginLeft = "8px";
    canvasEl.style.verticalAlign = "middle";

    const canvasCtx = canvasEl.getContext("2d");
    const minValue = Math.min(...dataValues);
    const maxValue = Math.max(...dataValues);
    const valueRange = maxValue - minValue || 1;
    const isPositiveTrend = dataValues[dataValues.length - 1] >= dataValues[0];
    const trendColor = isPositiveTrend ? "#00ff9d" : "#ff4444";
    const xStep = 60 / (dataValues.length - 1);

    canvasCtx.clearRect(0, 0, 60, 20);
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = trendColor;
    canvasCtx.lineWidth = 1.5;

    for (let pointIndex = 0; pointIndex < dataValues.length; pointIndex++) {
        const xPos = pointIndex * xStep;
        const yPos = 20 - ((dataValues[pointIndex] - minValue) / valueRange) * 18;
        if (pointIndex === 0) {
            canvasCtx.moveTo(xPos, yPos);
        } else {
            canvasCtx.lineTo(xPos, yPos);
        }
    }
    canvasCtx.stroke();

    canvasCtx.fillStyle = trendColor;
    for (let pointIndex = 0; pointIndex < dataValues.length; pointIndex++) {
        const xPos = pointIndex * xStep;
        const yPos = 20 - ((dataValues[pointIndex] - minValue) / valueRange) * 18;
        canvasCtx.beginPath();
        canvasCtx.arc(xPos, yPos, 1.2, 0, Math.PI * 2);
        canvasCtx.fill();
    }

    return canvasEl;
}

async function fetchInitialCompanies() {
    const searchResponse = await ajax.sendRequest("GET", serverApiUrl + "/SYMBOL_SEARCH").catch(ajax.errore);
    
    if (searchResponse) {
        const companyRecords = searchResponse.data;
        
        if (companyRecords) {
            cachedCompanyList = companyRecords;
            companyDropdownNode.innerHTML = "<option value='' disabled selected hidden>Seleziona un'azienda dalla lista...</option>";

            for (let record of companyRecords) {
                if (record && record["1. symbol"] && record["2. name"]) {
                    const optionEl = document.createElement("option");
                    optionEl.value = record["1. symbol"];
                    optionEl.textContent = record["1. symbol"] + " - " + record["2. name"];
                    companyDropdownNode.appendChild(optionEl);
                }
            }
        }
    }
}

function setupDomEvents() {
    searchInputEl.addEventListener("keyup", applyInputDelay(processSearchQuery, 1000));
    companyDropdownNode.addEventListener("change", onCompanyDropdownChange);
    graphTypeSelect.addEventListener("change", drawMainGraph);
    exportGraphBtn.addEventListener("click", exportGraphPng);
    syncDataButton.addEventListener("click", syncWithAlphaVantage);
    document.getElementById("btnToggleWatchlist").addEventListener("click", updateWatchlistState);

    document.addEventListener("click", function(mouseEvent) {
        if (!searchInputEl.contains(mouseEvent.target) && !searchResultsBox.contains(mouseEvent.target)) {
            searchResultsBox.style.display = "none";
        }
    });

    appendSaveJsonBtn();
}

function appendSaveJsonBtn() {
    const dynamicBtn = document.createElement("button");
    dynamicBtn.id = "btnDownloadDb";
    dynamicBtn.className = "btn btn-outline-success ms-2 pulse-warning";
    dynamicBtn.innerHTML = "💾 Salva JSON";
    dynamicBtn.onclick = executeJsonDownload;

    if (syncDataButton && syncDataButton.parentNode) {
        syncDataButton.parentNode.insertBefore(dynamicBtn, syncDataButton.nextSibling);
    } else {
        dynamicBtn.style.position = "fixed";
        dynamicBtn.style.bottom = "80px";
        dynamicBtn.style.left = "20px";
        dynamicBtn.style.zIndex = "9999";
        document.body.appendChild(dynamicBtn);
    }
}

async function executeJsonDownload() {
    const fullDbResponse = await ajax.sendRequest("GET", serverApiUrl + "server/db2026").catch(ajax.errore);
    let extractedData = {};
    let downloadReady = false;

    if (fullDbResponse && fullDbResponse.data) {
        extractedData = fullDbResponse.data;
        downloadReady = true;
    } else {
        const apiEndpoints = ["GLOBAL_QUOTE", "TIME_SERIES_INTRADAY", "SYMBOL_SEARCH", "OVERVIEW", "TIME_SERIES_MONTHLY", "NEWS"];
        for (let endpoint of apiEndpoints) {
            const partialResponse = await ajax.sendRequest("GET", serverApiUrl + "/" + endpoint).catch(ajax.errore);
            if (partialResponse && partialResponse.data) {
                extractedData[endpoint] = partialResponse.data;
                downloadReady = true;
            }
        }
    }

    if (downloadReady) {
        const jsonString = JSON.stringify(extractedData, null, 2);
        const dataBlob = new Blob([jsonString], { type: "application/json" });
        const objectUrl = URL.createObjectURL(dataBlob);
        
        const anchorEl = document.createElement("a");
        anchorEl.href = objectUrl;
        anchorEl.download = "db2026.json";
        document.body.appendChild(anchorEl);
        anchorEl.click();
        document.body.removeChild(anchorEl);
        URL.revokeObjectURL(objectUrl);
    } else {
        openSystemDialog("Errore", "Impossibile recuperare i dati dal server per il backup.");
    }
}

function applyInputDelay(targetFunction, delayMs) {
    let timeoutRef;
    return function(...passedArgs) {
        clearTimeout(timeoutRef);
        timeoutRef = setTimeout(() => targetFunction.apply(this, passedArgs), delayMs);
    };
}

async function processSearchQuery(keyboardEvent) {
    const searchString = keyboardEvent.target.value.trim().toLowerCase();
    
    if (searchString.length < 2) {
        searchResultsBox.style.display = "none";
        return;
    }

    let sourceArray = cachedCompanyList;
    if (cachedCompanyList.length === 0) {
        sourceArray = await retrieveCompanyList();
    }
    
    if (sourceArray) {
        const filteredMatches = sourceArray.filter(companyRecord =>
            companyRecord && companyRecord["2. name"] && companyRecord["1. symbol"] &&
            (companyRecord["2. name"].toLowerCase().includes(searchString) || companyRecord["1. symbol"].toLowerCase().includes(searchString))
        );

        searchResultsBox.innerHTML = "";
        
        if (filteredMatches.length === 0) {
            searchResultsBox.style.display = "none";
            return;
        }

        for (let matchedCompany of filteredMatches) {
            const listItemEl = document.createElement("li");
            listItemEl.className = "list-group-item terminal-dropdown-item";
            listItemEl.textContent = matchedCompany["1. symbol"] + " - " + matchedCompany["2. name"];

            listItemEl.addEventListener("click", function() {
                pickFromSearchResults(matchedCompany["1. symbol"], matchedCompany["2. name"]);
            });

            searchResultsBox.appendChild(listItemEl);
        }
        searchResultsBox.style.display = "block";
    }
}

async function retrieveCompanyList() {
    const listResponse = await ajax.sendRequest("GET", serverApiUrl + "/SYMBOL_SEARCH").catch(ajax.errore);
    if (listResponse) {
        return listResponse.data;
    }
    return null;
}

function pickFromSearchResults(targetSymbol, targetName) {
    let optionFound = Array.from(companyDropdownNode.options).some(selectOpt => selectOpt.value === targetSymbol);
    
    if (!optionFound) {
        const newSelectOption = document.createElement("option");
        newSelectOption.value = targetSymbol;
        newSelectOption.textContent = targetSymbol + " - " + targetName;
        companyDropdownNode.appendChild(newSelectOption);
    }

    companyDropdownNode.value = targetSymbol;
    searchInputEl.value = "";
    searchResultsBox.style.display = "none";
    onCompanyDropdownChange();
}

async function onCompanyDropdownChange() {
    const currentSymbol = companyDropdownNode.value;
    searchInputEl.value = "";
    searchResultsBox.style.display = "none";
    
    if (currentSymbol) {
        displayLoader();

        selectedTimeSeries = null;
        if (activeGraphObject) {
            activeGraphObject.destroy();
            activeGraphObject = null;
        }

        const [quoteRes, overviewRes, timeSeriesRes] = await Promise.all([
            ajax.sendRequest("GET", serverApiUrl + "/GLOBAL_QUOTE").catch(ajax.errore),
            ajax.sendRequest("GET", serverApiUrl + "/OVERVIEW").catch(ajax.errore),
            ajax.sendRequest("GET", serverApiUrl + "/TIME_SERIES_MONTHLY").catch(ajax.errore)
        ]);

        refreshQuoteData(quoteRes, currentSymbol);
        await refreshCompanyInfo(overviewRes, currentSymbol);
        parseTimeSeriesData(timeSeriesRes, currentSymbol);

        drawWatchlistBadges();
        removeLoader();
    }
}

function refreshQuoteData(quoteRes, currentSymbol) {
    if (quoteRes) {
        const quoteArray = quoteRes.data;
        
        if (quoteArray && quoteArray.length > 0) {
            const correctQuote = quoteArray.find(item => (item["01. symbol"] || item["symbol"]) === currentSymbol);
            
            if (correctQuote) {
                const numericChange = parseFloat(correctQuote["09. change"]);
                const textStyleClass = numericChange >= 0 ? "text-success" : "text-danger";

                document.getElementById("quoteSymbol").textContent = correctQuote["01. symbol"] || correctQuote["symbol"];
                document.getElementById("quotePrice").textContent = "$" + parseFloat(correctQuote["05. price"]).toFixed(2);

                const changeNode = document.getElementById("quoteChange");
                changeNode.textContent = correctQuote["09. change"] + " (" + correctQuote["10. change percent"] + ")";
                changeNode.className = textStyleClass + " mt-2 fw-bold";

                document.getElementById("quoteTableBody").innerHTML =
                    "<tr>" +
                    `<td class='font-monospace'>${correctQuote["02. open"]}</td>` +
                    `<td class='font-monospace'>${correctQuote["03. high"]}</td>` +
                    `<td class='font-monospace'>${correctQuote["04. low"]}</td>` +
                    `<td class='font-monospace'>${correctQuote["06. volume"]}</td>` +
                    `<td class='${textStyleClass} font-monospace'>${correctQuote["09. change"]}</td>` +
                    `<td class='${textStyleClass} font-monospace'>${correctQuote["10. change percent"]}</td>` +
                    "</tr>";
            }
        }
    }
}

async function refreshCompanyInfo(overviewRes, currentSymbol) {
    if (overviewRes) {
        const overviewArray = overviewRes.data;
        
        if (overviewArray && overviewArray.length > 0) {
            let correctOverview = overviewArray.find(item => item.Symbol === currentSymbol || item.symbol === currentSymbol);
            if (!correctOverview) {
                correctOverview = overviewArray[0];
            }
            
            const extractedName = correctOverview.Name;

            document.getElementById("overviewName").textContent = extractedName;
            document.getElementById("overviewDesc").textContent = correctOverview.Description;

            const nameHeaderNode = document.getElementById("overviewName").parentNode;
            
            if (nameHeaderNode) {
                let existingNewsBtn = nameHeaderNode.querySelector(".news-btn");
                if (!existingNewsBtn) {
                    const dynamicNewsBtn = document.createElement("button");
                    dynamicNewsBtn.className = "btn btn-sm btn-outline-info ms-2 news-btn";
                    dynamicNewsBtn.innerHTML = '<i class="bi bi-newspaper"></i> Notizie';
                    dynamicNewsBtn.onclick = () => loadCompanyArticles(currentSymbol, extractedName);
                    nameHeaderNode.appendChild(dynamicNewsBtn);
                } else {
                    existingNewsBtn.onclick = () => loadCompanyArticles(currentSymbol, extractedName);
                }
            }

            if (correctOverview.Address && correctOverview.Address !== "None" && correctOverview.Address.trim() !== "") {
                document.getElementById("overviewAddress").textContent = correctOverview.Address;
                const mapCoordinates = await myMapLibre.geocode(correctOverview.Address);

                if (mapCoordinates) {
                    revealMapArea();
                    removeMapPins();
                    const combinedStyleUrl = myMapLibre.hibridStyle + myMapLibre.API_KEY;

                    await new Promise((resolveTheme) => {
                        const fallbackTimer = setTimeout(resolveTheme, 5000);
                        myMapLibre.map.once("styledata", () => {
                            clearTimeout(fallbackTimer);
                            resolveTheme();
                        });
                        myMapLibre.map.setStyle(combinedStyleUrl);
                    });

                    await myMapLibre.drawMap(myMapLibre.hibridStyle, "map", mapCoordinates, 16);

                    const markerLabelHtml = `<div style='color:black;font-family:sans-serif;'><strong>${correctOverview.Name}</strong><br>${correctOverview.Address}</div>`;
                    await myMapLibre.addMarker(mapCoordinates, "url('https://cdn-icons-png.flaticon.com/512/684/684908.png')", correctOverview.Symbol, markerLabelHtml);

                    const mapLibreMarkers = myMapLibre.map.getContainer().querySelectorAll(".maplibregl-marker");
                    if (mapLibreMarkers.length > 0) {
                        mapPinNodes.push(mapLibreMarkers[mapLibreMarkers.length - 1]);
                    }
                } else {
                    collapseMapArea();
                }
            } else {
                document.getElementById("overviewAddress").textContent = "Indirizzo non presente";
                collapseMapArea();
            }
        }
    }
}

function parseTimeSeriesData(timeSeriesRes, currentSymbol) {
    if (timeSeriesRes) {
        const timeSeriesArray = timeSeriesRes.data;
        
        if (timeSeriesArray && timeSeriesArray.length > 0) {
            let correctTimeSeries = timeSeriesArray.find(item => item.symbol === currentSymbol || item["01. symbol"] === currentSymbol);
            if (!correctTimeSeries) {
                correctTimeSeries = timeSeriesArray[0];
            }
            
            selectedTimeSeries = correctTimeSeries["Monthly Time Series"] || correctTimeSeries["Time Series (Daily)"] || correctTimeSeries["Weekly Time Series"];
            drawMainGraph();
        }
    }
}

function drawMainGraph() {
    if (selectedTimeSeries) {
        const visualStyle = graphTypeSelect.value;
        const chartInfoBadge = document.getElementById("chartDataBadge");
        const chartMainLabel = document.getElementById("quoteSymbol").textContent || companyDropdownNode.value;

        const dateKeys = Object.keys(selectedTimeSeries).sort((dateA, dateB) => new Date(dateA) - new Date(dateB));
        const chartPoints = dateKeys.map(dKey => ({ date: dKey, value: parseFloat(selectedTimeSeries[dKey]["4. close"]) }));

        let condensedMonthly = [];
        let trackedMonthStr = "";
        
        for (let point of chartPoints) {
            const dateObjMonth = new Date(point.date).getFullYear() + "-" + new Date(point.date).getMonth();
            if (dateObjMonth !== trackedMonthStr) {
                condensedMonthly.push(point);
                trackedMonthStr = dateObjMonth;
            } else {
                condensedMonthly[condensedMonthly.length - 1] = point;
            }
        }

        let datasetToRender = condensedMonthly;
        const requiresCircularStyle = visualStyle === "pie" || visualStyle === "doughnut" || visualStyle === "polarArea";

        if (requiresCircularStyle && datasetToRender.length > 12) {
            datasetToRender = datasetToRender.slice(-12);
            chartInfoBadge.textContent = "Dati Mensili (Ultimi 12 Mesi)";
            chartInfoBadge.classList.replace("bg-secondary", "bg-warning");
            chartInfoBadge.classList.replace("text-white", "text-dark");
        } else {
            chartInfoBadge.textContent = requiresCircularStyle ? "Dati Mensili" : "Dati Mensili (Storico Completo)";
            chartInfoBadge.classList.replace("bg-warning", "bg-secondary");
            chartInfoBadge.classList.add("text-white");
        }

        const stringDatesArray = datasetToRender.map(item => item.date);
        const floatValuesArray = datasetToRender.map(item => item.value);
        const ceilingValue = Math.max(...floatValuesArray, 0);

        let dynamicColors = [];
        if (requiresCircularStyle) {
            dynamicColors = floatValuesArray.map((_, cIndex) => `hsl(${(cIndex * 360 / floatValuesArray.length) % 360}, 80%, 60%)`);
        } else {
            dynamicColors = floatValuesArray.map(() => "rgba(0, 243, 255, 0.6)");
        }

        const isSideways = visualStyle === "horizontalBar";
        const finalChartJsType = isSideways ? "bar" : visualStyle;

        if (activeGraphObject) {
            activeGraphObject.destroy();
            activeGraphObject = null;
        }

        barChartConfiguration.setChartType(finalChartJsType);
        barChartConfiguration.setChartOptions(chartMainLabel, stringDatesArray, floatValuesArray, dynamicColors, Math.ceil(ceilingValue));

        const chartConfigObj = barChartConfiguration.getChartOptions();
        chartConfigObj.data.datasets = [chartConfigObj.data.datasets[0]];

        if (!chartConfigObj.options) chartConfigObj.options = {};
        if (!chartConfigObj.options.scales) chartConfigObj.options.scales = {};

        if (isSideways) {
            chartConfigObj.options.indexAxis = "y";
        } else {
            chartConfigObj.options.indexAxis = "x";
        }

        if (!requiresCircularStyle) {
            chartConfigObj.data.datasets[0].fill = true;
            chartConfigObj.data.datasets[0].tension = 0.3;
        }

        if (!chartConfigObj.options.plugins) chartConfigObj.options.plugins = {};
        if (!chartConfigObj.options.plugins.tooltip) chartConfigObj.options.plugins.tooltip = {};
        chartConfigObj.options.plugins.tooltip.callbacks = {
            label: function(tooltipContext) {
                const elementIndex = tooltipContext.dataIndex;
                let parsedYVal = tooltipContext.parsed;
                if (tooltipContext.parsed.y !== undefined) {
                    parsedYVal = tooltipContext.parsed.y;
                }
                
                let previousYVal = null;
                if (elementIndex > 0) {
                    previousYVal = tooltipContext.dataset.data[elementIndex - 1];
                }
                
                let priceLabelStr = "$" + parsedYVal;
                if (typeof parsedYVal === "number") {
                    priceLabelStr = "$" + parsedYVal.toFixed(2);
                }

                if (previousYVal !== null && typeof previousYVal === "number" && previousYVal !== 0) {
                    const percentageDiff = ((parsedYVal - previousYVal) / previousYVal * 100).toFixed(2);
                    const trendDirectionChar = percentageDiff >= 0 ? "▲" : "▼";
                    return [priceLabelStr, `${trendDirectionChar} ${percentageDiff}% vs mese prec.`];
                }
                return priceLabelStr;
            }
        };

        const canvasContext2d = document.getElementById("myChart").getContext("2d");
        activeGraphObject = new Chart(canvasContext2d, chartConfigObj);
    }
}

function exportGraphPng() {
    if (activeGraphObject) {
        const domCanvas = document.getElementById("myChart");
        barChartConfiguration.setWhiteBackground(domCanvas);
        const virtualAnchor = document.createElement("a");
        virtualAnchor.href = activeGraphObject.toBase64Image();
        virtualAnchor.download = "alpha_chart.png";
        virtualAnchor.click();
    }
}

async function syncWithAlphaVantage() {
    const activeSymbol = companyDropdownNode.value;
    
    if (!activeSymbol) {
        openSystemDialog("Attenzione", "Seleziona prima un'azienda dalla lista.");
        return;
    }

    const previousBtnLabel = syncDataButton.innerHTML;
    syncDataButton.innerHTML = "⏳ Download in corso...";
    syncDataButton.classList.remove("pulse-warning", "btn-outline-warning");
    syncDataButton.classList.add("btn-warning");

    const API_KEY_CONSTANT = "DUVV381MSAZLIN4G";
    const remoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${activeSymbol}&apikey=${API_KEY_CONSTANT}`;

    const remoteResponse = await ajax.sendRequest("GET", remoteUrl).catch(ajax.errore);
    
    if (!remoteResponse) {
        resetSyncButton(syncDataButton, previousBtnLabel);
        return;
    }

    const payloadData = remoteResponse.data;
    
    if (!payloadData || payloadData.Information || payloadData.Note || !payloadData["Global Quote"]) {
        syncDataButton.innerHTML = "❌ Limite API o Errore";
        syncDataButton.classList.replace("btn-warning", "btn-danger");
        resetSyncButton(syncDataButton, previousBtnLabel);
        return;
    }

    const updatedQuoteData = payloadData["Global Quote"];
    const checkLocalResponse = await ajax.sendRequest("GET", serverApiUrl + "/GLOBAL_QUOTE").catch(ajax.errore);

    if (!checkLocalResponse || !checkLocalResponse.data || checkLocalResponse.data.length === 0) {
        syncDataButton.innerHTML = "❌ Azienda non nel DB";
        syncDataButton.classList.replace("btn-warning", "btn-danger");
        resetSyncButton(syncDataButton, previousBtnLabel);
        return;
    }

    const matchedDbItem = checkLocalResponse.data.find(row => (row["01. symbol"] || row["symbol"]) === activeSymbol);
    
    if (!matchedDbItem) {
        syncDataButton.innerHTML = "❌ Azienda non nel DB";
        syncDataButton.classList.replace("btn-warning", "btn-danger");
        resetSyncButton(syncDataButton, previousBtnLabel);
        return;
    }

    const targetDbId = matchedDbItem.id;
    const putResponse = await ajax.sendRequest("PUT", serverApiUrl + "/GLOBAL_QUOTE/" + targetDbId, updatedQuoteData).catch(ajax.errore);

    if (putResponse) {
        syncDataButton.innerHTML = "✅ DB Locale Aggiornato!";
        syncDataButton.classList.replace("btn-warning", "btn-success");
        await buildTickerBar();
    } else {
        syncDataButton.innerHTML = "❌ Errore Salvataggio";
        syncDataButton.classList.replace("btn-warning", "btn-danger");
    }

    resetSyncButton(syncDataButton, previousBtnLabel);
}

function resetSyncButton(buttonEl, originalHtml) {
    setTimeout(function() {
        buttonEl.innerHTML = originalHtml;
        buttonEl.classList.remove("btn-success", "btn-danger", "btn-warning");
        buttonEl.classList.add("btn-outline-warning", "pulse-warning");
    }, 3000);
}

function drawWatchlistBadges() {
    const listContainerNode = document.getElementById("watchlistContainer");
    const emptyStateText = document.getElementById("emptyWatchlistMsg");
    const toggleBadgeBtn = document.getElementById("btnToggleWatchlist");
    const currentlySelected = companyDropdownNode.value;

    if (currentlySelected) {
        toggleBadgeBtn.classList.remove("d-none");
        if (savedWatchlistSymbols.includes(currentlySelected)) {
            toggleBadgeBtn.textContent = "⭐ Rimuovi";
            toggleBadgeBtn.classList.add("btn-warning");
            toggleBadgeBtn.classList.remove("btn-outline-warning");
        } else {
            toggleBadgeBtn.textContent = "⭐ Salva";
            toggleBadgeBtn.classList.remove("btn-warning");
            toggleBadgeBtn.classList.add("btn-outline-warning");
        }
    } else {
        toggleBadgeBtn.classList.add("d-none");
    }

    listContainerNode.querySelectorAll(".watchlist-badge").forEach(badgeEl => badgeEl.remove());

    if (savedWatchlistSymbols.length === 0) {
        emptyStateText.style.display = "inline";
        return;
    }

    emptyStateText.style.display = "none";

    for (const savedSym of savedWatchlistSymbols) {
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "badge bg-warning text-dark watchlist-badge";
        badgeSpan.textContent = savedSym;
        badgeSpan.title = "Clicca per selezionare " + savedSym;
        badgeSpan.addEventListener("click", () => {
            companyDropdownNode.value = savedSym;
            onCompanyDropdownChange();
        });
        listContainerNode.appendChild(badgeSpan);
    }
}

function updateWatchlistState() {
    const targetSymbolToToggle = companyDropdownNode.value;
    if (targetSymbolToToggle) {
        const arrayIndex = savedWatchlistSymbols.indexOf(targetSymbolToToggle);
        if (arrayIndex === -1) {
            savedWatchlistSymbols.push(targetSymbolToToggle);
        } else {
            savedWatchlistSymbols.splice(arrayIndex, 1);
        }

        localStorage.setItem("watchlist", JSON.stringify(savedWatchlistSymbols));
        drawWatchlistBadges();
    }
}

let newsSidebarInstance = null;

function buildNewsSidebar() {
    if (!document.getElementById("newsOffcanvas")) {
        const sidebarHtmlStr = `
            <div class="offcanvas offcanvas-end bg-dark text-white" tabindex="-1" id="newsOffcanvas" style="width: 400px;">
                <div class="offcanvas-header border-bottom border-secondary">
                    <h5 class="offcanvas-title text-info" id="newsOffcanvasLabel"><i class="bi bi-newspaper"></i> Notizie Finanziarie</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
                </div>
                <div class="offcanvas-body" id="newsOffcanvasBody">
                    <div class="text-center text-light py-5">
                        <i class="bi bi-info-circle fs-1"></i>
                        <p class="mt-3">Seleziona un'azienda per visualizzare le ultime notizie</p>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", sidebarHtmlStr);
    }
    newsSidebarInstance = new bootstrap.Offcanvas(document.getElementById("newsOffcanvas"));
}

async function loadCompanyArticles(querySymbol, queryName) {
    if (!newsSidebarInstance) {
        buildNewsSidebar();
    }

    const sidebarBodyEl = document.getElementById("newsOffcanvasBody");
    const sidebarTitleEl = document.getElementById("newsOffcanvasLabel");
    
    let headingString = `<i class="bi bi-newspaper"></i> Notizie - ${querySymbol}`;
    if (queryName) {
        headingString += ` (${queryName})`;
    }
    sidebarTitleEl.innerHTML = headingString;
    
    sidebarBodyEl.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-info" role="status"></div>
            <p class="mt-3 text-light">Caricamento notizie per ${querySymbol}...</p>
        </div>`;

    newsSidebarInstance.show();

    const fetchNewsResponse = await ajax.sendRequest("GET", serverApiUrl + "/NEWS?symbol=" + querySymbol).catch(ajax.errore);

    if (fetchNewsResponse && fetchNewsResponse.data && fetchNewsResponse.data.length > 0) {
        let compiledNewsHtml = '<div class="news-list">';

        for (const articleRecord of fetchNewsResponse.data) {
            let formattedDate = "Data non specificata";
            if (articleRecord.published_date) {
                formattedDate = new Date(articleRecord.published_date).toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" });
            }
                
            let sentimentStyleClass = "text-warning";
            let sentimentIconChar = "●";
            let sentimentLabelStr = "NEUTRO";
            
            if (articleRecord.sentiment === "positive") {
                sentimentStyleClass = "text-success";
                sentimentIconChar = "▲";
                sentimentLabelStr = "POSITIVO";
            } else if (articleRecord.sentiment === "negative") {
                sentimentStyleClass = "text-danger";
                sentimentIconChar = "▼";
                sentimentLabelStr = "NEGATIVO";
            }

            let sourceHtmlTag = "";
            if (articleRecord.source) {
                sourceHtmlTag = `<small class="text-light">Fonte: ${sanitizeString(articleRecord.source)}</small>`;
            }
            
            let safeSourceString = "";
            if (articleRecord.source) {
                safeSourceString = sanitizeString(articleRecord.source);
            }

            compiledNewsHtml += `
                <div class="news-item mb-4 pb-3 border-bottom border-secondary">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0 text-info">${sanitizeString(articleRecord.title)}</h6>
                        <small class="text-light ms-2">${formattedDate}</small>
                    </div>
                    <p class="small text-white mb-2">${sanitizeString(articleRecord.summary)}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge ${sentimentStyleClass} bg-opacity-10 bg-secondary">
                            ${sentimentIconChar} ${sentimentLabelStr}
                        </span>
                        ${sourceHtmlTag}
                    </div>
                    <button class="btn btn-sm btn-outline-info mt-2 w-100 read-article-btn"
                            data-title="${sanitizeString(articleRecord.title)}"
                            data-content="${sanitizeString(articleRecord.summary)}"
                            data-source="${safeSourceString}"
                            data-date="${formattedDate}">
                        <i class="bi bi-eye"></i> Leggi articolo
                    </button>
                </div>`;
        }

        compiledNewsHtml += "</div>";
        sidebarBodyEl.innerHTML = compiledNewsHtml;

        sidebarBodyEl.querySelectorAll(".read-article-btn").forEach(actionBtn => {
            actionBtn.addEventListener("click", () => {
                openArticleDialog(
                    actionBtn.getAttribute("data-title"),
                    actionBtn.getAttribute("data-content"),
                    actionBtn.getAttribute("data-source"),
                    actionBtn.getAttribute("data-date")
                );
            });
        });
    } else {
        sidebarBodyEl.innerHTML = `
            <div class="text-center text-light py-5">
                <i class="bi bi-journal-x fs-1"></i>
                <p class="mt-3">Nessuna notizia disponibile per ${querySymbol}</p>
            </div>`;
    }
}

let genericArticleModal = null;

function buildArticleDialog() {
    if (!document.getElementById("articleModal")) {
        const modalContainerHtml = `
            <div class="modal fade" id="articleModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content bg-dark text-white border-info">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title text-info" id="articleModalTitle">Leggi articolo</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-light" id="articleModalBody">
                            <p>Caricamento...</p>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", modalContainerHtml);
    }
    genericArticleModal = new bootstrap.Modal(document.getElementById("articleModal"));
}

function openArticleDialog(articleHeading, articleBody, sourceRef, dateString) {
    if (!genericArticleModal) {
        buildArticleDialog();
    }

    document.getElementById("articleModalTitle").innerHTML = `<i class="bi bi-newspaper"></i> ${sanitizeString(articleHeading)}`;
    
    let subtitleText = "";
    if (sourceRef) {
        subtitleText += `Fonte: ${sanitizeString(sourceRef)}`;
    }
    if (dateString) {
        if (subtitleText !== "") subtitleText += ` · `;
        subtitleText += dateString;
    }
    
    document.getElementById("articleModalBody").innerHTML = `
        <div class="mb-3">
            <small class="text-info">${subtitleText}</small>
        </div>
        <p class="text-white">${sanitizeString(articleBody)}</p>`;

    genericArticleModal.show();
}

function sanitizeString(rawInputText) {
    if (!rawInputText) return "";
    const tempDivContainer = document.createElement("div");
    tempDivContainer.textContent = rawInputText;
    return tempDivContainer.innerHTML;
}

function injectAiTips() {
    const tipContainerDiv = document.createElement("div");
    tipContainerDiv.id = "aiInsight";
    tipContainerDiv.className = "position-fixed bottom-0 start-0 m-3 p-3 bg-dark bg-opacity-75 rounded-3 border border-info shadow-lg";
    tipContainerDiv.style.cssText = "z-index:9999; max-width:300px; backdrop-filter:blur(5px);";
    tipContainerDiv.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <div class="spinner-grow spinner-grow-sm text-info" role="status"></div>
            <strong class="text-info"></strong>
            <span class="ms-auto text-light small">⏺ live</span>
        </div>
        <div id="insightText" class="small mt-2 text-white">Analisi in corso...</div>`;

    document.body.appendChild(tipContainerDiv);

    const presetTipsArray = [
        "📊 Diversifica il portafoglio per ridurre il rischio.",
        "💰 Investi regolarmente, anche piccole somme, per sfruttare l'interesse composto.",
        "📈 Monitora i rapporti P/E e il debito prima di acquistare.",
        "🌍 I mercati emergenti offrono opportunità di crescita a lungo termine.",
        "📉 Non farti prendere dal panico nelle correzioni: potrebbero essere opportunità d'acquisto.",
        "🔍 Fai sempre la tua ricerca (DYOR) prima di investire.",
        "⚡ Le criptovalute sono ad alto rischio: investi solo ciò che puoi permetterti di perdere.",
        "📆 Pianifica un ribilanciamento del portafoglio almeno una volta all'anno."
    ];

    const targetTipNode = document.getElementById("insightText");
    targetTipNode.innerHTML = `<i class="bi bi-lightbulb"></i> ${presetTipsArray[0]}`;

    setInterval(() => {
        const pickedTipString = presetTipsArray[randomIntGenerator(0, presetTipsArray.length)];
        targetTipNode.innerHTML = `<i class="bi bi-lightbulb"></i> ${pickedTipString}`;
    }, 10000);
}

function randomIntGenerator(minBound, maxBound) {
    return Math.floor(Math.random() * (maxBound - minBound)) + minBound;
}