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
                        label: function(context) {
                            return ` ${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
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
            <div class="card-price">${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
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

// Render market grid
async function renderMarket(endpoint, containerId, prefix) {
    const container = document.getElementById(containerId);
    try {
        container.innerHTML = Array(4).fill('<div class="loading-skeleton"></div>').join('');
        
        const res = await fetch(`${API_BASE}/${endpoint}`);
        const data = await res.json();
        
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
    } catch (err) {
        container.innerHTML = `<p style="color:var(--accent-down)">데이터를 불러오는 데 실패했습니다: ${err.message}. 백엔드 서버를 확인해주세요.</p>`;
    }
}

// Render Themes
async function renderThemes() {
    const container = document.querySelector('#themes-container');
    try {
        container.innerHTML = `<div class="loading-skeleton" style="height:100px;"></div>`;
        
        const res = await fetch(`${API_BASE}/themes`);
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
document.addEventListener('DOMContentLoaded', () => {
    renderMarket('us-market', 'us-market-grid', 'us');
    renderMarket('kr-market', 'kr-market-grid', 'kr');
    renderThemes();
    renderSectorsBoard();

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
            container.innerHTML = '<div class="loading-skeleton" style="grid-column: 1 / -1;"></div>';
            const res = await fetch(`${API_BASE}/us-sectors`);
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
        col.id = `board-col-${i+1}`;
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
