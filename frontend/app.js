const API_BASE = '/api';

// Create a Chart.js instance for a canvas
function createMiniChart(canvasId, data, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Extract values
    const labels = data.map(d => d.time);
    const values = data.map(d => d.value);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 100);
    // Colors matching new CSS variables
    let rgbColor;
    if (color === 'up-kr') rgbColor = '220, 38, 38';
    else if (color === 'down-kr') rgbColor = '37, 99, 235';
    else if (color === 'up-us') rgbColor = '22, 163, 74';
    else if (color === 'down-us') rgbColor = '220, 38, 38';
    else if (color === 'up') rgbColor = '220, 38, 38'; // Default KR
    else if (color === 'down') rgbColor = '37, 99, 235'; // Default KR
    else rgbColor = '107, 114, 128';

    gradient.addColorStop(0, `rgba(${rgbColor}, 0.3)`);
    gradient.addColorStop(1, `rgba(${rgbColor}, 0.0)`);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                borderColor: `rgb(${rgbColor})`,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0, // hide points for sparkline
                pointHoverRadius: 4,
                pointHoverBackgroundColor: `rgb(${rgbColor})`,
                fill: true,
                tension: 0.3 // smooth curve
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#111827',
                    bodyColor: '#111827',
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return ` ${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    display: false,
                    // Add slight padding to Y axis so line doesn't cut off
                    suggestedMin: Math.min(...values) * 0.999,
                    suggestedMax: Math.max(...values) * 1.001
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Generate HTML for a card
function generateCard(item, index, prefix) {
    if (!item.summary) {
        return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">${item.name}</div>
            </div>
            <div class="card-price">데이터 없음</div>
        </div>`;
    }

    const val = item.summary.close;
    const chg = item.summary.change_pct;
    const colorSuffix = chg > 0 ? 'up' : chg < 0 ? 'down' : 'neutral';
    const colorClass = colorSuffix === 'neutral' ? 'neutral' : `${colorSuffix}-${prefix}`;
    const chgText = chg > 0 ? `+${chg.toFixed(2)}%` : `${chg.toFixed(2)}%`;
    const canvasId = `chart-${prefix}-${index}`;
    // Extract start date/time and end date/time
    let startDateText = '데이터 없음';
    let endDateText = '';
    if (item.chart && item.chart.length > 0) {
        // start
        const firstTime = new Date(item.chart[0].time);
        if (!isNaN(firstTime)) {
            const m = String(firstTime.getMonth() + 1).padStart(2, '0');
            const d = String(firstTime.getDate()).padStart(2, '0');
            const h = String(firstTime.getHours()).padStart(2, '0');
            const min = String(firstTime.getMinutes()).padStart(2, '0');
            startDateText = `${m}/${d} ${h}:${min}`;
        } else {
            startDateText = item.chart[0].time.substring(0, 16);
        }

        // end
        const lastTime = new Date(item.chart[item.chart.length - 1].time);
        if (!isNaN(lastTime)) {
            const m = String(lastTime.getMonth() + 1).padStart(2, '0');
            const d = String(lastTime.getDate()).padStart(2, '0');
            const h = String(lastTime.getHours()).padStart(2, '0');
            const min = String(lastTime.getMinutes()).padStart(2, '0');
            endDateText = `${m}/${d} ${h}:${min}`;
        } else {
            endDateText = item.chart[item.chart.length - 1].time.substring(0, 16);
        }
    }

    return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">${item.name}</div>
            </div>
            <div class="card-price">${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="card-change ${colorClass}">${chgText}</div>
            <div class="chart-container" style="margin-bottom: 0.5rem;">
                <canvas id="${canvasId}"></canvas>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); border-top: 1px dashed var(--card-border); padding-top: 0.5rem;">
                <span>${startDateText}</span>
                <span>${endDateText}</span>
            </div>
        </div>
    `;
}

// Update market grid with provided data
function updateMarketGrid(containerId, prefix, data) {
    if (!data || data.length === 0) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    data.forEach((item, index) => {
        container.innerHTML += generateCard(item, index, prefix);
    });

    // Initialize charts after DOM update
    data.forEach((item, index) => {
        if (item.chart && item.chart.length > 0 && item.summary) {
            const colorSuffix = item.summary.change_pct > 0 ? 'up' : item.summary.change_pct < 0 ? 'down' : 'neutral';
            const colorClass = colorSuffix === 'neutral' ? 'neutral' : `${colorSuffix}-${prefix}`;
            createMiniChart(`chart-${prefix}-${index}`, item.chart, colorClass);
        }
    });
}

// 5/6 추가: 초기 데이터 즉시 로딩 (REST API)
async function fetchInitialMarketData() {
    const ts = Date.now();
    console.log(`[${ts}] fetchInitialMarketData START`);
    const usGrid = document.getElementById('us-market-grid');
    const krGrid = document.getElementById('kr-market-grid');
    
    if (usGrid) usGrid.innerHTML = '<div class="loading-skeleton" style="height:200px; grid-column:1/-1;"></div>';
    if (krGrid) krGrid.innerHTML = '<div class="loading-skeleton" style="height:200px; grid-column:1/-1;"></div>';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // 캐시 방지를 위해 타임스탬프 추가
        const [usRes, krRes] = await Promise.all([
            fetch(`${API_BASE}/us-market?t=${ts}`, { signal: controller.signal }),
            fetch(`${API_BASE}/kr-market?t=${ts}`, { signal: controller.signal })
        ]);
        
        clearTimeout(timeoutId);
        
        const usData = await usRes.json();
        const krData = await krRes.json();
        
        console.log(`[${ts}] fetchInitialMarketData SUCCESS`, { us: usData?.length, kr: krData?.length });
        
        if (usData && usData.length > 0) updateMarketGrid('us-market-grid', 'us', usData);
        if (krData && krData.length > 0) updateMarketGrid('kr-market-grid', 'kr', krData);
    } catch (err) {
        console.error(`[${ts}] fetchInitialMarketData FAILED:`, err);
    }
}

// 5/4 수정사항: 실시간 브로드캐스트 (SSE) 수신 초기화
function initRealtimeStream() {
    console.log("Connecting to SSE stream...");
    const eventSource = new EventSource(`${API_BASE}/stream`);
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log("SSE received:", data.type || "update");
            
            // 데이터가 있을 때만 업데이트 (초기 캐시가 비어있을 수 있음)
            if (data.us && data.us.length > 0) updateMarketGrid('us-market-grid', 'us', data.us);
            if (data.kr && data.kr.length > 0) updateMarketGrid('kr-market-grid', 'kr', data.kr);
        } catch (e) {
            console.error("Error parsing stream data:", e);
        }
    };
    
    eventSource.onerror = function(err) {
        console.error("EventSource failed, retrying in 5s...", err);
        eventSource.close();
        setTimeout(initRealtimeStream, 5000);
    };
}

// Render Themes
async function renderThemes() {
    const ts = Date.now();
    const container = document.querySelector('#themes-container');
    try {
        container.innerHTML = `<div class="loading-skeleton" style="height:100px;"></div>`;
        const res = await fetch(`${API_BASE}/themes?t=${ts}`);
        const data = await res.json();

        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = `<p>데이터 없음</p>`;
            return;
        }

        data.forEach(theme => {
            const themeName = theme['테마명'];
            const themeChg = theme['등락률(%)'];
            const themeChgText = themeChg > 0 ? `+${themeChg.toFixed(2)}%` : `${themeChg.toFixed(2)}%`;
            const themeColorClass = themeChg > 0 ? 'up-kr' : themeChg < 0 ? 'down-kr' : 'neutral';

            // Create a wrapper for each theme
            const themeWrapper = document.createElement('div');
            themeWrapper.className = 'table-container';
            themeWrapper.style.marginBottom = '2rem';

            // Theme Header
            const themeHeader = document.createElement('div');
            themeHeader.style.display = 'flex';
            themeHeader.style.alignItems = 'baseline';
            themeHeader.style.gap = '1rem';
            themeHeader.style.padding = '1rem 1.25rem';
            themeHeader.style.backgroundColor = '#f3f4f6';
            themeHeader.style.borderBottom = '1px solid var(--card-border)';
            themeHeader.style.marginBottom = '0';
            themeHeader.innerHTML = `
                <h3 style="margin:0; font-size: 1.25rem; font-weight: 600;">${themeName}</h3>
                <span class="${themeColorClass}" style="font-weight: 600;">${themeChgText}</span>
            `;
            themeWrapper.style.padding = '0'; // Header takes its own padding
            themeWrapper.appendChild(themeHeader);

            const tablePadding = document.createElement('div');
            tablePadding.style.padding = '1rem';

            // Create a table for each theme
            const table = document.createElement('table');

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>종목명</th>
                    <th>현재가</th>
                    <th>등락률</th>
                    <th>거래대금(백만)</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const stocks = theme.stocks || [];

            if (stocks.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="4" style="color:var(--text-secondary); text-align:center;">종목 데이터가 없습니다.</td>
                `;
                tbody.appendChild(tr);
            } else {
                stocks.forEach((stock, index) => {
                    const tr = document.createElement('tr');

                    if (stock.is_high_volume) {
                        tr.classList.add('high-volume-row');
                    }

                    let stockRate = stock['등락률'] || '0%';
                    let stockColorClass = 'neutral';
                    if (stockRate.startsWith('+') || stockRate.includes('상승') || stockRate.includes('상한가')) {
                        stockColorClass = 'up-kr';
                    } else if (stockRate.startsWith('-') || stockRate.includes('하락') || stockRate.includes('하한가')) {
                        stockColorClass = 'down-kr';
                    }

                    tr.innerHTML += `
                        <td style="font-weight:500;">${stock['종목명']}</td>
                        <td>${stock['현재가']}</td>
                        <td class="${stockColorClass}">${stock['등락률']}</td>
                        <td>${stock['거래대금']}</td>
                    `;

                    tbody.appendChild(tr);
                });
            }

            table.appendChild(tbody);
            tablePadding.appendChild(table);
            themeWrapper.appendChild(tablePadding);
            container.appendChild(themeWrapper);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:var(--accent-down)">데이터를 불러오는 데 실패했습니다.</p>`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 5/6 수정사항: REST API 호출을 먼저 완료하거나 병행하여 초기 로딩 속도 극대화
    await fetchInitialMarketData();
    
    // 약간의 지연 후 SSE 연결 (HTTP/1.1 연결 제한 우회 목적)
    setTimeout(() => {
        initRealtimeStream();
    }, 500);
    
    renderThemes();
    renderSectorsBoard();
    initUSTopStocks();

    // Event Listeners for Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.market-section');

    // Initialize state
    document.getElementById('us-section').classList.add('active');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Render chart if chart section activated
            if (targetId === 'chart-section') {
                renderTradingViewWidget();
            }
        });
    });

    // Event Listeners for Sector Board Controls
    const sortBtn = document.getElementById('sort-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            if (currentSort === 'desc') {
                currentSort = 'asc';
                sortBtn.innerHTML = '정렬: 낮은 순 <span class="btn-icon">▼</span>';
            } else if (currentSort === 'asc') {
                currentSort = 'name';
                sortBtn.innerHTML = '정렬: 이름 순 <span class="btn-icon">🔠</span>';
            } else {
                currentSort = 'desc';
                sortBtn.innerHTML = '정렬: 높은 순 <span class="btn-icon">▲</span>';
            }
            if (cachedSectors.length > 0) renderSectorsBoard();
        });
    }

    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (currentView === 'all') {
                currentView = 'compact';
                filterBtn.innerHTML = '보기: 하위 요약 <span class="btn-icon">✂️</span>';
            } else {
                currentView = 'all';
                filterBtn.innerHTML = '보기: 전체 뷰 <span class="btn-icon">👁️</span>';
            }
            if (cachedSectors.length > 0) renderSectorsBoard();
        });
    }

    let currentCols = getColumnCount();
    window.addEventListener('resize', () => {
        const newCols = getColumnCount();
        if (newCols !== currentCols) {
            currentCols = newCols;
            if (cachedSectors.length > 0) renderSectorsBoard();
        }
    });

    // Init Chart Logic
    initChartLogic();
});

// --- Sector Rendering ---
let currentSort = 'desc'; // 'desc', 'asc', 'name'
let currentView = 'all';  // 'all', 'compact'
let cachedSectors = [];

function getColumnCount() {
    const width = window.innerWidth;
    if (width <= 480) return 1;
    if (width <= 768) return 2;
    if (width <= 1100) return 3;
    if (width <= 1400) return 4;
    return 5;
}

async function renderSectorsBoard() {
    const container = document.getElementById('sectors-container');
    if (!container) return;

    // Fetch data if not cached
    if (cachedSectors.length === 0) {
        try {
            const ts = Date.now();
            container.innerHTML = '<div class="loading-skeleton" style="grid-column: 1 / -1;"></div>';
            const res = await fetch(`${API_BASE}/us-sectors?t=${ts}`);
            cachedSectors = await res.json();
        } catch (err) {
            container.innerHTML = `<p style="color:var(--accent-down); grid-column: 1 / -1;">섹터 데이터를 불러오는 데 실패했습니다.</p>`;
            return;
        }
    }

    container.innerHTML = '';

    const numCols = getColumnCount();
    const boardCols = [];

    for (let i = 0; i < numCols; i++) {
        const col = document.createElement('div');
        col.className = 'board-column';
        col.id = `board-col-${i + 1}`;
        container.appendChild(col);
        boardCols.push(col);
    }

    let sectorsToRender = [...cachedSectors];

    // Sorting
    if (currentSort === 'desc') {
        sectorsToRender.sort((a, b) => b.change - a.change);
    } else if (currentSort === 'asc') {
        sectorsToRender.sort((a, b) => a.change - b.change);
    } else {
        sectorsToRender.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }

    sectorsToRender.forEach((sector, i) => {
        const panel = document.createElement('div');
        panel.className = 'sector-panel';

        const sIcon = sector.change > 0 ? '▲' : (sector.change < 0 ? '▼' : '−');
        const sValClass = sector.change > 0 ? 'val-pos' : (sector.change < 0 ? 'val-neg' : 'val-neu');

        // Header
        const header = document.createElement('div');
        header.className = 'sector-header';
        header.innerHTML = `
            <div class="sector-name">${sector.name}</div>
            <div class="sector-val ${sValClass}"><span class="indicator">${sIcon}</span> ${sector.change > 0 ? '+' : ''}${sector.change.toFixed(2)}%</div>
        `;
        panel.appendChild(header);

        // Compact View logic
        let themesToRender = sector.themes;
        if (currentView === 'compact' && themesToRender.length > 3) {
            let topMovers = [...themesToRender].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3);
            topMovers.sort((a, b) => b.change - a.change);
            themesToRender = topMovers;
        }

        const themeList = document.createElement('div');
        themeList.className = 'theme-list';

        themesToRender.forEach(theme => {
            const row = document.createElement('div');
            const icon = theme.change > 0 ? '▲' : (theme.change < 0 ? '▼' : '−');
            let valClass = theme.change > 0 ? 'val-pos' : (theme.change < 0 ? 'val-neg' : 'val-neu');

            row.className = `theme-row`;

            // Highlight strong moves (3% threshold)
            if (theme.change >= 3) {
                row.classList.add('row-pos-strong');
            } else if (theme.change <= -3) {
                row.classList.add('row-neg-strong');
            }

            row.innerHTML = `
                <div class="theme-name"><span class="indicator">${icon}</span> ${theme.name}</div>
                <div class="theme-val ${valClass}">${theme.change > 0 ? '+' : ''}${theme.change.toFixed(2)}%</div>
            `;

            themeList.appendChild(row);
        });

        panel.appendChild(themeList);
        boardCols[i % numCols].appendChild(panel);
    });
}

// --- Chart Tab Logic ---
const STORAGE_KEY = 'tv_symbols';

function saveSymbolsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tvSymbols));
}

function loadSymbolsFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse saved symbols", e);
        }
    }
    // Default symbols
    return [
        { name: "Apple", symbol: "NASDAQ:AAPL" },
        { name: "Google", symbol: "NASDAQ:GOOGL" },
        { name: "Microsoft", symbol: "NASDAQ:MSFT" }
    ];
}

let tvSymbols = loadSymbolsFromStorage();
let activeSymbol = tvSymbols.length > 0 ? tvSymbols[0].symbol : "NASDAQ:AAPL";
let searchTimeout = null;
let isWidgetRendered = false;
let currentFocusIndex = -1;
let currentResults = [];

function initChartLogic() {
    const searchInput = document.getElementById('symbol-search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (searchTimeout) clearTimeout(searchTimeout);

        if (query.length < 1) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            currentResults = [];
            currentFocusIndex = -1;
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/search-symbol?q=${encodeURIComponent(query)}`);
                const data = await res.json();

                // 검색어가 이미 지워졌거나 결과가 무효한 경우 렌더링 스킵
                if (searchInput.value.trim().length === 0) {
                    searchResults.classList.remove('active');
                    searchResults.innerHTML = '';
                    return;
                }

                searchResults.innerHTML = '';
                currentResults = data;

                if (data.length === 0) {
                    currentFocusIndex = -1;
                    searchResults.innerHTML = '<div style="padding: 12px 16px; color: var(--text-secondary);">결과가 없습니다.</div>';
                } else {
                    currentFocusIndex = 0; // Auto-focus first item
                    data.forEach((item, index) => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.setAttribute('data-index', index);
                        div.innerHTML = `
                            <div>
                                <span class="search-result-symbol">${item.symbol}</span>
                                <span class="search-result-desc">${item.description}</span>
                            </div>
                            <span class="search-result-exchange">${item.exchange}</span>
                        `;
                        div.addEventListener('click', () => {
                            selectItem(index);
                        });
                        searchResults.appendChild(div);
                    });

                    // Highlight the first item immediately
                    const items = searchResults.querySelectorAll('.search-result-item');
                    updateFocus(items);
                }
                searchResults.classList.add('active');
            } catch (err) {
                console.error("Search error:", err);
            }
        }, 300); // 300ms debounce
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentFocusIndex < items.length - 1) {
                currentFocusIndex++;
            } else {
                currentFocusIndex = 0; // Wrap around to first
            }
            updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentFocusIndex > 0) {
                currentFocusIndex--;
            } else {
                currentFocusIndex = items.length - 1; // Wrap around to last
            }
            updateFocus(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentFocusIndex > -1) {
                selectItem(currentFocusIndex);
            }
        } else if (e.key === 'Escape') {
            searchResults.classList.remove('active');
        }
    });

    function updateFocus(items) {
        items.forEach((item, index) => {
            if (index === currentFocusIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function selectItem(index) {
        const item = currentResults[index];
        if (item) {
            addSymbol(item.description || item.symbol, `${item.exchange}:${item.symbol}`);

            // Aggressively clear input and state
            if (searchTimeout) clearTimeout(searchTimeout);
            searchInput.value = '';
            searchResults.classList.remove('active');
            currentResults = [];
            currentFocusIndex = -1;

            // Fix for IME (Korean) composition remaining after Enter
            setTimeout(() => {
                searchInput.value = '';
                searchInput.blur(); // IME 조기 종료 유도
                searchInput.focus(); // 다시 포커스
            }, 10);
        }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    updateSymbolChips();
}

function addSymbol(name, fullSymbol) {
    // Check if already exists
    if (!tvSymbols.find(s => s.symbol === fullSymbol)) {
        tvSymbols.unshift({ name: name, symbol: fullSymbol });
        activeSymbol = fullSymbol; // Set new symbol as active
        saveSymbolsToStorage();
        updateSymbolChips();
        renderTradingViewWidget();
    }
}

function removeSymbol(fullSymbol) {
    tvSymbols = tvSymbols.filter(s => s.symbol !== fullSymbol);
    saveSymbolsToStorage();
    updateSymbolChips();
    renderTradingViewWidget();
}

function updateSymbolChips() {
    const container = document.getElementById('symbol-chips-container');
    if (!container) return;
    container.innerHTML = '';

    tvSymbols.forEach((s) => {
        const chip = document.createElement('div');
        chip.className = 'symbol-chip';
        // Highlight based on activeSymbol
        if (s.symbol === activeSymbol) {
            chip.classList.add('active');
        }
        
        chip.innerHTML = `
            <span class="chip-name">${s.name || s.symbol.split(':')[1]}</span>
            <button class="symbol-chip-del" title="삭제">&times;</button>
        `;
        
        // Click name to switch chart (update activeSymbol)
        chip.querySelector('.chip-name').addEventListener('click', () => {
            if (activeSymbol !== s.symbol) {
                activeSymbol = s.symbol;
                updateSymbolChips();
                renderTradingViewWidget();
            }
        });

        chip.querySelector('.symbol-chip-del').addEventListener('click', (e) => {
            e.stopPropagation();
            removeSymbol(s.symbol);
        });
        
        container.appendChild(chip);
    });
}

function renderTradingViewWidget() {
    // Only render if we are on the chart section
    const chartSection = document.getElementById('chart-section');
    if (!chartSection || !chartSection.classList.contains('active')) {
        return;
    }

    const container = document.getElementById('tv-widget-inner');
    if (!container) return;

    // Clear previous widget
    container.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;

    // Prepare symbols array for TV widget
    // The widget always shows the first symbol in the array as active on load.
    // We sort it just for the widget's view so activeSymbol appears first.
    const sortedSymbolsForWidget = [
        ...tvSymbols.filter(s => s.symbol === activeSymbol),
        ...tvSymbols.filter(s => s.symbol !== activeSymbol)
    ];
    const tvFormattedSymbols = sortedSymbolsForWidget.map(s => [s.name || s.symbol.split(':')[1], `${s.symbol}|1D`]);

    const config = {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "area",
        "fontColor": "rgb(106, 109, 120)",
        "gridLineColor": "rgba(242, 242, 242, 0.06)",
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": "#0F0F0F",
        "widgetFontColor": "#DBDBDB",
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "kr",
        "chartOnly": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "symbols": tvFormattedSymbols,
        "dateRanges": [
            "1d|1",
            "1m|30",
            "3m|60",
            "12m|1D",
            "60m|1W",
            "all|1M"
        ],
        "fontSize": "10",
        "headerFontSize": "medium",
        "autosize": true,
        "width": "80%",
        "height": "80%",
        "noTimeScale": false,
        "hideDateRanges": false,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
    };

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);
    isWidgetRendered = true;
}

// --- 5/3 추가: 미국 주식 상승률/거래대금 순위 ---
let topStocksData = [];
let topStocksSortConfig = { key: 'price', dir: 'desc' }; // default: 현재가(상승률) 내림차순
let currentUSExchange = 'NASDAQ';
let currentUSSortType = 'up'; // 'up': 상승률, 'priceTop': 거래대금

function initUSTopStocks() {
    const exchangeTabs = document.querySelectorAll('.exchange-tab-item');
    exchangeTabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            exchangeTabs.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentUSExchange = e.target.getAttribute('data-exchange');
            renderUSTopStocks();
        });
    });

    const sortTypeTabs = document.querySelectorAll('.sort-type-btn');
    sortTypeTabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sortTypeTabs.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentUSSortType = e.target.getAttribute('data-sort');
            
            // 타이틀 텍스트 변경 (옵션)
            const titleEl = document.querySelector('.us-top-stocks-container h3');
            if (titleEl) {
                titleEl.textContent = currentUSSortType === 'up' ? '미국 주식 상승률 순위 (상위 50)' : '미국 주식 거래대금 순위 (상위 50)';
            }
            
            renderUSTopStocks();
        });
    });

    const sortHeaders = document.querySelectorAll('#us-top-stocks-table th.sortable');
    sortHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            // Toggle direction
            if (topStocksSortConfig.key === sortKey) {
                topStocksSortConfig.dir = topStocksSortConfig.dir === 'desc' ? 'asc' : 'desc';
            } else {
                topStocksSortConfig.key = sortKey;
                topStocksSortConfig.dir = 'desc';
            }
            
            // Update UI icons
            sortHeaders.forEach(header => {
                header.classList.remove('asc', 'desc');
            });
            th.classList.add(topStocksSortConfig.dir);
            
            // Re-render table with sorted data
            renderUSTopStocksTable();
        });
    });

    // Initial render
    renderUSTopStocks();
}

async function renderUSTopStocks() {
    const tbody = document.getElementById('us-top-stocks-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="loading-skeleton" style="height:40px; margin-bottom:10px;"></div><div class="loading-skeleton" style="height:40px;"></div></td></tr>';

    try {
        const ts = Date.now();
        const res = await fetch(`${API_BASE}/us-top-stocks?exchange=${currentUSExchange}&sort=${currentUSSortType}&t=${ts}`);
        const data = await res.json();
        
        if (data && data.result && data.result.stocks) {
            topStocksData = data.result.stocks;
            
            // 기본 정렬: 현재가(상승률) 또는 거래량 헤더에 아이콘 표시
            const defaultSortKey = currentUSSortType === 'up' ? 'price' : 'volume';
            topStocksSortConfig = { key: defaultSortKey, dir: 'desc' }; 
            
            const sortHeaders = document.querySelectorAll('#us-top-stocks-table th.sortable');
            sortHeaders.forEach(header => {
                header.classList.remove('asc', 'desc');
                if (header.getAttribute('data-sort') === defaultSortKey) {
                    header.classList.add('desc');
                }
            });

            renderUSTopStocksTable();
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">데이터를 불러올 수 없습니다.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--down-us);">오류 발생: ${err.message}</td></tr>`;
    }
}

function renderUSTopStocksTable() {
    const tbody = document.getElementById('us-top-stocks-tbody');
    if (!tbody) return;

    // Data Sort
    let sortedData = [...topStocksData];
    
    sortedData.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        
        if (topStocksSortConfig.key === 'price') {
            // 현재가 컬럼 클릭 시 상승률(fluctuationsRatio) 기준으로 정렬
            valA = parseFloat(a.fluctuationsRatio) || 0;
            valB = parseFloat(b.fluctuationsRatio) || 0;
        } else if (topStocksSortConfig.key === 'volume') {
            if (currentUSSortType === 'priceTop') {
                // 거래대금 모드일 때는 거래대금(accumulatedTradingValue) 기준으로 정렬
                valA = parseFloat(a.accumulatedTradingValue) || 0;
                valB = parseFloat(b.accumulatedTradingValue) || 0;
            } else {
                // 그 외에는 거래량(accumulatedTradingVolume) 기준으로 정렬
                valA = parseFloat(a.accumulatedTradingVolume) || 0;
                valB = parseFloat(b.accumulatedTradingVolume) || 0;
            }
        } else if (topStocksSortConfig.key === 'marketcap') {
            valA = parseFloat(a.marketValue) || 0;
            valB = parseFloat(b.marketValue) || 0;
        }

        if (topStocksSortConfig.dir === 'asc') {
            return valA - valB;
        } else {
            return valB - valA;
        }
    });

    tbody.innerHTML = '';
    
    sortedData.forEach(item => {
        const tr = document.createElement('tr');
        
        // 종목명/티커
        const name = item.name || '';
        const symbol = item.symbolCode || '';
        
        // 현재가/등락률
        const price = parseFloat(item.currentPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const chgRatio = parseFloat(item.fluctuationsRatio) || 0;
        const colorClass = chgRatio > 0 ? 'val-pos' : (chgRatio < 0 ? 'val-neg' : 'val-neu');
        const sign = chgRatio > 0 ? '+' : '';
        const priceDisplay = `<div style="font-weight:600;">$${price}</div><div class="${colorClass}" style="font-size:0.85rem;">${sign}${chgRatio.toFixed(2)}%</div>`;
        
        // 거래량/거래대금 (거래량 우선 표시)
        const volume = (item.accumulatedTradingVolume || 0).toLocaleString();
        const value = (parseFloat(item.accumulatedTradingValue || 0) / 10000).toLocaleString(undefined, {maximumFractionDigits:0}); // 만 단위로 축소
        const volumeDisplay = `<div>${volume} 주</div><div style="font-size:0.8rem; color:var(--text-secondary);">${value} 만 USD</div>`;
        
        // 시가총액
        const mcapStr = item.marketValue ? (parseFloat(item.marketValue) / 100).toLocaleString(undefined, {maximumFractionDigits:0}) + ' 억 USD' : '-'; // 보통 백만 단위
        
        // 미니차트 이미지
        const chartImg = item.miniImageChartUrl ? `<img src="${item.miniImageChartUrl}" class="mini-chart-canvas" alt="차트" loading="lazy">` : '';

        tr.innerHTML = `
            <td>
                <div style="font-weight:600;">${name}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${symbol}</div>
            </td>
            <td>${chartImg}</td>
            <td>${priceDisplay}</td>
            <td>${volumeDisplay}</td>
            <td>${mcapStr}</td>
        `;
        
        // 클릭 시 트레이딩뷰 위젯으로 연동 및 페이지 이동
        tr.addEventListener('click', () => {
            const exchange = item.stockExchangeType || 'NASDAQ'; // Default fallback
            addSymbol(name, `${exchange}:${symbol}`);
            // 스크롤 상단(차트 영역)으로 이동
            const tvWrapper = document.getElementById('tv-widget-wrapper');
            if (tvWrapper) {
                tvWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        tbody.appendChild(tr);
    });
}

