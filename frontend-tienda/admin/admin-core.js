/**
 * Admin Core - Sistema de Gestión
 * Programación Orientada a Objetos
 */

console.log("JS admin-core.js cargado");

// API_URL now comes from config.js (CONFIG.API_URL)

// Helper para sanitizar texto básico (evita XSS básico)
function sanitizeText(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper para asignar valor solo si el elemento existe
function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Funciones auxiliares para configuración de gráficos
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el?.value || '';
}

function setCheck(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
}

function getCheck(id) {
    const el = document.getElementById(id);
    return el?.checked || false;
}

async function cargarDashboard() {
    try {
        console.log("Cargando dashboard...");
        
        const resVentas = await fetch(CONFIG.API_URL + '/ventas/completadas', { cache: 'no-store' });
        const dataVentas = await resVentas.json();
        
        const resIngresos = await fetch(CONFIG.API_URL + '/ingresos-completados', { cache: 'no-store' });
        const dataIngresos = await resIngresos.json();
        
        console.log("Ventas API raw:", dataVentas);
        console.log("Ingresos API raw:", dataIngresos);
        console.log("Ventas total value:", dataVentas.total);
        console.log("Ingresos total value:", dataIngresos.total);
        
        const ventasValue = dataVentas.total ?? dataVentas.data?.total ?? 0;
        const ingresosValue = dataIngresos.total ?? dataIngresos.data?.total ?? 0;
        
        setElementText('totalVentas', ventasValue);
        setElementText('totalIngresos', "Bs " + ingresosValue);
        setElementText('repTotalVentas', ventasValue);
        setElementText('repTotalIngresos', "Bs " + ingresosValue);
        
        console.log("Dashboard cargado correctamente - Ventas:", ventasValue, "Ingresos:", ingresosValue);
    } catch (error) {
        console.error("Error cargando dashboard:", error);
    }
}

class APIClient {
    constructor(baseURL = 'http://localhost:8090/api') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                cache: 'no-store',
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();
            return json.data || json;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

class DashboardManager {
    constructor(api, chartConfigManager = null) {
        this.api = api;
        this.charts = {};
        this.chartConfigManager = chartConfigManager;
    }

    async load() {
        await this.loadStats();
        await this.loadVentasPorCategoria();
        await this.loadVentasMensuales();
        await this.loadVentasSucursal();
        await this.loadUltimasVentas();
    }

    async loadStats() {
        try {
            console.log('Cargando stats del dashboard...');
            
            const [productos, clientes, ventas, ingresos] = await Promise.all([
                this.api.get('/productos').catch(() => []),
                this.api.get('/clientes').catch(() => []),
                this.api.get('/ventas/completadas').catch(() => ({ total: 0 })),
                this.api.get('/ingresos-completados').catch(() => ({ total: 0 }))
            ]);

            console.log('Ventas API:', ventas);
            console.log('Ingresos API:', ingresos);

            const ventasCount = typeof ventas === 'number' ? ventas : (ventas.total || 0);
            const ingresosTotal = typeof ingresos === 'number' ? ingresos : (ingresos.total || 0);

            setElementText('totalProductos', productos.length || 0);
            setElementText('totalClientes', clientes.length || 0);
            setElementText('totalVentas', ventasCount);
            setElementText('totalIngresos', 'Bs ' + this.formatNumber(ingresosTotal));

            setElementText('repTotalProductos', productos.length || 0);
            setElementText('repTotalClientes', clientes.length || 0);
            setElementText('repTotalVentas', ventasCount);
            setElementText('repTotalIngresos', 'Bs ' + this.formatNumber(ingresosTotal));
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadVentasPorCategoria() {
        try {
            const data = await this.api.get('/reportes/ventas-categoria').catch(() => []);
            
            const labels = data.map(item => item.categoria || 'Sin categoría');
            const values = data.map(item => parseInt(item.total) || 0);

            this.createPieChart('chartVentasCategoria', labels, values, 'Ventas por Categoría');
        } catch (error) {
            console.error('Error loading ventas por categoria:', error);
            this.createEmptyPieChart('chartVentasCategoria');
        }
    }

    async loadVentasMensuales() {
        try {
            const data = await this.api.get('/reportes/ventas-mensuales').catch(() => []);
            
            const labels = data.map(item => item.mes || '');
            const values = data.map(item => parseFloat(item.total) || 0);

            this.createLineChart('chartVentasMensuales', labels, values, 'Ventas Mensuales (Bs)');
        } catch (error) {
            console.error('Error loading ventas mensuales:', error);
            this.createEmptyLineChart('chartVentasMensuales');
        }
    }

    async loadProductosPorMarca() {
        try {
            const data = await this.api.get('/reportes/productos-marca').catch(() => []);
            
            const labels = data.map(item => item.marca || 'Sin marca');
            const values = data.map(item => parseInt(item.total) || 0);

            this.createPieChart('chartProductosMarca', labels, values, 'Productos por Marca');
        } catch (error) {
            console.error('Error loading productos por marca:', error);
            this.createEmptyPieChart('chartProductosMarca');
        }
    }

    async loadProductosPorIndustria() {
        try {
            const data = await this.api.get('/reportes/productos-industria').catch(() => []);
            
            const labels = data.map(item => item.industria || 'Sin industria');
            const values = data.map(item => parseInt(item.total) || 0);

            this.createPieChart('chartProductosIndustria', labels, values, 'Productos por Industria');
        } catch (error) {
            console.error('Error loading productos por industria:', error);
            this.createEmptyPieChart('chartProductosIndustria');
        }
    }

    async loadVentasPorFecha() {
        try {
            const data = await this.api.get('/reportes/ventas-fecha').catch(() => []);
            
            const labels = data.map(item => item.fecha || '');
            const values = data.map(item => parseFloat(item.total) || 0);

            this.createBarChart('chartVentasFecha', labels, values, 'Ventas por Fecha');
        } catch (error) {
            console.error('Error loading ventas por fecha:', error);
            this.createEmptyBarChart('chartVentasFecha');
        }
    }

    async loadUltimasVentas() {
        try {
            const data = await this.api.get('/ventas?limit=10').catch(() => []);
            
            const tbody = document.querySelector('#tablaUltimasVentas tbody');
            tbody.innerHTML = '';

            data.forEach(venta => {
                const row = `
                    <tr>
                        <td>${venta.nro}</td>
                        <td>${venta.cliente || 'No identificado'}</td>
                        <td>${this.formatDate(venta.fecha_hora)}</td>
                        <td>Bs ${this.formatNumber(venta.total)}</td>
                        <td><span class="badge-${this.getBadgeClass(venta.estado)}">${venta.estado}</span></td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } catch (error) {
            console.error('Error loading ultimas ventas:', error);
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    getBadgeClass(estado) {
        const classes = {
            'pendiente': 'warning',
            'procesando': 'info',
            'enviado': 'primary',
            'entregado': 'success',
            'cancelado': 'danger'
        };
        return classes[estado] || 'secondary';
    }

    async loadTopClientesChart() {
        try {
            const data = await this.api.get('/reportes/top-clientes').catch(() => []);
            
            const labels = data.map(item => item.nombre || item.cliente || 'Sin cliente');
            const values = data.map(item => parseInt(item.total) || 0);
            
            this.createBarChart('topClientesChart', labels, values, 'Top Clientes');
        } catch (error) {
            console.error('Error loading top clientes:', error);
            this.createEmptyBarChart('topClientesChart');
        }
    }

    async loadTopClientes5Chart() {
        try {
            const data = await this.api.get('/reportes/top-clientes?limit=5').catch(() => []);
            
            const labels = data.map(item => item.nombre || item.cliente || 'Sin cliente');
            const values = data.map(item => parseInt(item.total) || 0);
            
            this.createBarChart('topClientes5Chart', labels, values, 'Top 5 Clientes');
        } catch (error) {
            console.error('Error loading top 5 clientes:', error);
            this.createEmptyBarChart('topClientes5Chart');
        }
    }

    async loadVentasSucursal() {
        try {
            const data = await this.api.get('/reportes/ventas-por-sucursal').catch(() => []);
            
            const labels = data.map(item => item.sucursal || item.nombre || 'Sin sucursal');
            const values = data.map(item => parseInt(item.total) || 0);
            
            this.createBarChart('chartVentasSucursal', labels, values, 'Ventas por Sucursal');
        } catch (error) {
            console.error('Error loading ventas sucursal:', error);
            this.createEmptyBarChart('chartVentasSucursal');
        }
    }

    createPieChart(canvasId, labels, data, label) {
        // Destruir cualquier chart existente primero
        const existingChart = Chart.getChart(canvasId);
        if (existingChart) existingChart.destroy();
        
        if (this.chartConfigManager) {
            this.chartConfigManager.createChart(canvasId, labels, data, label, { type: 'doughnut' });
            return;
        }
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const colors = [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
        ];

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    createLineChart(canvasId, labels, data, label) {
        // Destruir cualquier chart existente primero
        const existingChart = Chart.getChart(canvasId);
        if (existingChart) existingChart.destroy();
        
        if (this.chartConfigManager) {
            this.chartConfigManager.createChart(canvasId, labels, data, label, { type: 'line' });
            return;
        }
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createBarChart(canvasId, labels, data, label) {
        // Destruir cualquier chart existente primero
        const existingChart = Chart.getChart(canvasId);
        if (existingChart) existingChart.destroy();
        
        if (this.chartConfigManager) {
            this.chartConfigManager.createChart(canvasId, labels, data, label, { type: 'bar' });
            return;
        }
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: '#4f46e5',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createEmptyPieChart(canvasId) {
        this.createPieChart(canvasId, ['Sin datos'], [1], '');
    }

    createEmptyLineChart(canvasId) {
        this.createLineChart(canvasId, ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], [0, 0, 0, 0, 0, 0], '');
    }

    createEmptyBarChart(canvasId) {
        this.createBarChart(canvasId, ['Sin datos'], [0], '');
    }
}

class ChartConfigManager {
    constructor(dashboardManager) {
        this.dashboardManager = dashboardManager;
        this.chartConfigs = new Map();
        this.currentChartId = null;
        this.charts = new Map();
        
        this.palettes = {
            default: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'],
            blue: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#2563eb', '#60a5fa'],
            green: ['#14532d', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#166534', '#16a34a'],
            red: ['#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#991b1b', '#c2410c', '#ea580c'],
            purple: ['#581c87', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#6b21a8', '#8b5cf6', '#a78bfa'],
            warm: ['#ea580c', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4'],
            pastel: ['#fcd9bd', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#e9d5ff', '#c7d2fe'],
            ocean: ['#0c4a6e', '#0369a1', '#075985', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']
        };
        
        this.defaultConfig = {
            type: 'bar',
            orientation: 'vertical',
            order: 'desc',
            limit: 10,
            invertData: false,
            hideZeros: false,
            palette: 'default',
            colors: ['#4f46e5'],
            colorPrincipal: '#4f46e5',
            customColors: '',
            transparency: 100,
            showLegend: true,
            showLabels: true,
            showTitle: true,
            animate: true,
            interactive: true,
            legendPos: 'bottom',
            xShow: true,
            xGrid: true,
            yShow: true,
            yGrid: true,
            yBeginZero: true,
            yMin: null,
            yMax: null
        };
        
        this.init();
    }
    
    init() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.config-chart-btn');
            if (btn) {
                this.openConfigModal(btn.dataset.chartId);
            }
        });
        
        document.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.config-menu-btn');
            if (menuBtn) {
                const target = menuBtn.dataset.target;
                document.querySelectorAll('.config-menu-btn').forEach(btn => btn.classList.remove('active'));
                menuBtn.classList.add('active');
                document.querySelectorAll('.config-section').forEach(section => section.classList.add('d-none'));
                document.getElementById(target)?.classList.remove('d-none');
            }
        });
        
        document.getElementById('cfgColorPrincipal')?.addEventListener('input', (e) => {
            const hexInput = document.getElementById('cfgColorHex');
            if (hexInput) hexInput.value = e.target.value;
        });
        
        document.getElementById('cfgColorHex')?.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                document.getElementById('cfgColorPrincipal').value = color;
            }
        });
        
        document.getElementById('cfgTransparency')?.addEventListener('input', (e) => {
            const val = document.getElementById('cfgTransparencyVal');
            if (val) val.textContent = e.target.value + '%';
        });
        
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.chart-type-card');
            if (card) {
                const type = card.dataset.type;
                document.getElementById('cfgChartType').value = type;
                document.querySelectorAll('.chart-type-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            }
        });
        
        document.getElementById('cfgChartType')?.addEventListener('change', (e) => {
            const type = e.target.value;
            document.querySelectorAll('.chart-type-card').forEach(c => {
                c.classList.toggle('active', c.dataset.type === type);
            });
            this.applyLiveConfig();
        });
        
        document.getElementsByName('cfgOrientation').forEach(r => {
            r.addEventListener('change', () => this.applyLiveConfig());
        });
        
        document.getElementById('cfgPalette')?.addEventListener('change', () => this.applyLiveConfig());
        document.getElementById('cfgColorPrincipal')?.addEventListener('input', () => this.applyLiveConfig());
        document.getElementById('cfgCustomColors')?.addEventListener('input', () => this.applyLiveConfig());
        document.getElementById('cfgOrder')?.addEventListener('change', () => this.applyLiveConfig());
        document.getElementById('cfgLimit')?.addEventListener('change', () => this.applyLiveConfig());
        
        ['cfgShowLegend', 'cfgShowLabels', 'cfgShowTitle', 'cfgAnimate', 'cfgInteractive'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyLiveConfig());
        });
        
        ['cfgXShow', 'cfgXGrid', 'cfgYShow', 'cfgYGrid', 'cfgYBeginZero'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyLiveConfig());
        });
        
        document.getElementById('cfgLegendPos')?.addEventListener('change', () => this.applyLiveConfig());
        
        document.getElementById('applyChartConfig')?.addEventListener('click', () => {
            this.applyConfiguration();
        });
        
        document.getElementById('resetChartConfig')?.addEventListener('click', () => {
            this.resetConfiguration();
        });
        
        setTimeout(() => this.initChartButtons(), 1000);
    }
    
    initChartButtons() {
        document.querySelectorAll('.chart-card canvas').forEach(canvas => {
            const chartId = canvas.id;
            const card = canvas.closest('.chart-card');
            if (card && !card.querySelector('.config-chart-btn')) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline-secondary config-chart-btn position-absolute top-0 end-0 m-2';
                btn.dataset.chartId = chartId;
                btn.title = 'Configurar';
                btn.innerHTML = '<i class="bi bi-gear"></i>';
                card.style.position = 'relative';
                card.appendChild(btn);
            }
        });
    }
    
    openConfigModal(chartId) {
        if (!chartId) return;
        
        this.currentChartId = chartId;
        
        const chartIdInput = document.getElementById('configChartId');
        if (chartIdInput) chartIdInput.value = chartId;
        
        const config = this.getConfig(chartId);
        this.loadConfigToModal(config);
        
        const modalEl = document.getElementById('chartConfigModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }
    
    loadConfigToModal(config) {
        setVal('cfgChartType', config.type);
        setVal('cfgColorPrincipal', config.colorPrincipal || '#4f46e5');
        setVal('cfgColorHex', config.colorPrincipal || '#4f46e5');
        setVal('cfgCustomColors', config.customColors || '');
        setVal('cfgPalette', config.palette || 'default');
        setVal('cfgOrder', config.order || 'desc');
        setVal('cfgLimit', config.limit || 10);
        setVal('cfgTransparency', config.transparency || 100);
        setVal('cfgLegendPos', config.legendPos || 'bottom');
        
        setCheck('cfgInvertData', config.invertData);
        setCheck('cfgHideZeros', config.hideZeros);
        setCheck('cfgShowLegend', config.showLegend);
        setCheck('cfgShowLabels', config.showLabels);
        setCheck('cfgShowTitle', config.showTitle);
        setCheck('cfgAnimate', config.animate);
        setCheck('cfgInteractive', config.interactive);
        setCheck('cfgXShow', config.xShow);
        setCheck('cfgXGrid', config.xGrid);
        setCheck('cfgYShow', config.yShow);
        setCheck('cfgYGrid', config.yGrid);
        setCheck('cfgYBeginZero', config.yBeginZero);
        
        document.querySelectorAll('.chart-type-card').forEach(c => {
            c.classList.toggle('active', c.dataset.type === config.type);
        });
        
        const transparencyVal = document.getElementById('cfgTransparencyVal');
        if (transparencyVal) transparencyVal.textContent = (config.transparency || 100) + '%';
    }
    
    getConfigFromModal() {
        const customColors = getVal('cfgCustomColors');
        let colors = [];
        if (customColors) {
            colors = customColors.split('\n').map(c => c.trim()).filter(c => c);
        }
        if (colors.length === 0) {
            const palette = getVal('cfgPalette') || 'default';
            colors = [...(this.palettes[palette] || this.palettes.default)];
        }
        
        let orientation = 'vertical';
        const oriRadios = document.getElementsByName('cfgOrientation');
        oriRadios.forEach(r => { if (r.checked) orientation = r.value; });
        
        return {
            type: getVal('cfgChartType') || 'bar',
            orientation: orientation,
            order: getVal('cfgOrder') || 'desc',
            limit: parseInt(getVal('cfgLimit')) || 10,
            invertData: getCheck('cfgInvertData'),
            hideZeros: getCheck('cfgHideZeros'),
            palette: getVal('cfgPalette') || 'default',
            colors: colors,
            colorPrincipal: getVal('cfgColorPrincipal') || '#4f46e5',
            customColors: getVal('cfgCustomColors'),
            transparency: parseInt(getVal('cfgTransparency')) || 100,
            showLegend: getCheck('cfgShowLegend'),
            showLabels: getCheck('cfgShowLabels'),
            showTitle: getCheck('cfgShowTitle'),
            animate: getCheck('cfgAnimate'),
            interactive: getCheck('cfgInteractive'),
            legendPos: getVal('cfgLegendPos') || 'bottom',
            xShow: getCheck('cfgXShow'),
            xGrid: getCheck('cfgXGrid'),
            yShow: getCheck('cfgYShow'),
            yGrid: getCheck('cfgYGrid'),
            yBeginZero: getCheck('cfgYBeginZero'),
            yMin: getVal('cfgYMin') ? parseFloat(getVal('cfgYMin')) : null,
            yMax: getVal('cfgYMax') ? parseFloat(getVal('cfgYMax')) : null
        };
    }
    
    applyConfiguration() {
        if (!this.currentChartId) return;
        
        const config = this.getConfigFromModal();
        this.chartConfigs.set(this.currentChartId, config);
        
        bootstrap.Modal.getInstance(document.getElementById('chartConfigModal'))?.hide();
        
        this.reloadChart();
    }
    
    async reloadChart() {
        if (!this.currentChartId) return;
        
        this.destroyChart(this.currentChartId);
        
        switch (this.currentChartId) {
            case 'topClientesChart':
                await this.dashboardManager.loadTopClientesChart();
                break;
            case 'topClientes5Chart':
                await this.dashboardManager.loadTopClientes5Chart();
                break;
            case 'chartVentasSucursal':
                await this.dashboardManager.loadVentasSucursal();
                break;
            case 'chartVentasCategoria':
                await this.dashboardManager.loadVentasPorCategoria();
                break;
            case 'chartVentasMensuales':
                await this.dashboardManager.loadVentasMensuales();
                break;
            case 'chartProductosMarca':
                await this.dashboardManager.loadProductosPorMarca();
                break;
            case 'chartProductosIndustria':
                await this.dashboardManager.loadProductosPorIndustria();
                break;
            case 'chartVentasFecha':
                await this.dashboardManager.loadVentasPorFecha();
                break;
            case 'chartVentasTotalesMensuales':
                await this.dashboardManager.loadVentasMensuales();
                break;
            default:
                console.warn('Gráfico no reconocido:', this.currentChartId);
        }
    }
    
    destroyChart(chartId) {
        const chart = Chart.getChart(chartId);
        if (chart) chart.destroy();
        this.charts.delete(chartId);
    }
    
    getConfig(chartId) {
        return this.chartConfigs.get(chartId) || { ...this.defaultConfig };
    }
    
    createChart(canvasId, labels, data, title, overrideConfig = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        this.destroyChart(canvasId);
        
        const config = { ...this.getConfig(canvasId), ...overrideConfig };
        
        let sortedLabels = [...labels];
        let sortedData = [...data];
        
        if (config.hideZeros) {
            const validIndices = sortedData.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
            sortedLabels = validIndices.map(i => labels[i]);
            sortedData = validIndices.map(i => data[i]);
        }
        
        if (config.order !== 'none') {
            const indices = sortedData.map((_, i) => i).sort((a, b) => 
                config.order === 'desc' ? sortedData[b] - sortedData[a] : sortedData[a] - sortedData[b]
            );
            sortedLabels = indices.map(i => labels[i]);
            sortedData = indices.map(i => data[i]);
        }
        
        if (config.invertData) {
            sortedLabels = sortedLabels.reverse();
            sortedData = sortedData.reverse();
        }
        
        sortedLabels = sortedLabels.slice(0, config.limit);
        sortedData = sortedData.slice(0, config.limit);
        
        if (sortedData.length === 0 || sortedData.every(v => v === 0)) {
            sortedLabels = ['Sin datos'];
            sortedData = [1];
        }
        
        let colors = [...config.colors];
        while (colors.length < sortedData.length) {
            colors = [...colors, ...colors];
        }
        colors = colors.slice(0, sortedData.length);
        
        if (config.transparency < 100) {
            colors = colors.map(c => this.addAlpha(c, config.transparency / 100));
        }
        
        const chartType = config.type;
        const isBarChart = ['bar', 'line'].includes(chartType);
        const isPieChart = ['doughnut', 'pie', 'polarArea', 'radar'].includes(chartType);
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: config.animate ? { duration: 750, easing: 'easeInOutQuart' } : false,
            indexAxis: config.orientation === 'horizontal' ? 'y' : 'x',
            
            plugins: {
                legend: {
                    display: config.showLegend && !isBarChart,
                    position: config.legendPos || 'bottom'
                },
                title: {
                    display: config.showTitle && !!title,
                    text: title,
                    font: { size: 16, weight: 'bold' },
                    padding: 20
                },
                tooltip: {
                    enabled: config.interactive !== false
                },
                datalabels: config.showLabels ? {
                    display: true,
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => value,
                    font: { weight: 'bold' }
                } : false
            }
        };
        
        if (isBarChart) {
            chartOptions.scales = {
                x: {
                    display: config.xShow !== false,
                    grid: { display: config.xGrid !== false }
                },
                y: {
                    display: config.yShow !== false,
                    grid: { display: config.yGrid !== false },
                    beginAtZero: config.yBeginZero !== false,
                    min: config.yMin,
                    max: config.yMax
                }
            };
        }
        
        const chartData = {
            labels: sortedLabels,
            datasets: [{
                data: sortedData,
                backgroundColor: chartType === 'line' ? 'transparent' : colors,
                borderColor: chartType === 'line' ? colors[0] : colors,
                borderWidth: chartType === 'line' ? 2 : 1,
                fill: chartType === 'line',
                tension: 0.4,
                pointBackgroundColor: colors[0],
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        };
        
        const chart = new Chart(ctx, {
            type: chartType,
            data: chartData,
            options: chartOptions
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    addAlpha(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    applyLiveConfig() {
        if (!this.currentChartId) return;
        
        const config = this.getConfigFromModal();
        this.chartConfigs.set(this.currentChartId, config);
        this.updateChartLive(config);
    }
    
    updateChartLive(config) {
        if (!this.currentChartId) return;
        
        const chartId = this.currentChartId;
        const chart = Chart.getChart(chartId);
        if (!chart) return;
        
        const labels = chart.data.labels || [];
        let data = chart.data.datasets[0].data || [];
        
        let sortedLabels = [...labels];
        let sortedData = [...data];
        
        if (config.hideZeros) {
            const validIndices = sortedData.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
            sortedLabels = validIndices.map(i => labels[i]);
            sortedData = validIndices.map(i => data[i]);
        }
        
        if (config.order !== 'none') {
            const indices = sortedData.map((_, i) => i).sort((a, b) => 
                config.order === 'desc' ? sortedData[b] - sortedData[a] : sortedData[a] - sortedData[b]
            );
            sortedLabels = indices.map(i => labels[i]);
            sortedData = indices.map(i => data[i]);
        }
        
        sortedLabels = sortedLabels.slice(0, config.limit);
        sortedData = sortedData.slice(0, config.limit);
        
        let colors = [...config.colors];
        while (colors.length < sortedData.length) {
            colors = [...colors, ...colors];
        }
        colors = colors.slice(0, sortedData.length);
        
        if (config.transparency < 100) {
            colors = colors.map(c => this.addAlpha(c, config.transparency / 100));
        }
        
        const chartType = config.type;
        
        chart.config.type = chartType;
        
        chart.data.labels = sortedLabels;
        chart.data.datasets[0].data = sortedData;
        chart.data.datasets[0].backgroundColor = chartType === 'line' ? 'transparent' : colors;
        chart.data.datasets[0].borderColor = chartType === 'line' ? colors[0] : colors;
        
        chart.options.indexAxis = config.orientation === 'horizontal' ? 'y' : 'x';
        
        if (chart.options.plugins?.legend) {
            chart.options.plugins.legend.display = config.showLegend;
            chart.options.plugins.legend.position = config.legendPos || 'bottom';
        }
        
        if (chart.options.plugins?.tooltip) {
            chart.options.plugins.tooltip.enabled = config.interactive !== false;
        }
        
        const isBarChart = ['bar', 'line'].includes(chartType);
        if (isBarChart) {
            if (chart.options.scales?.x) {
                chart.options.scales.x.display = config.xShow !== false;
                chart.options.scales.x.grid.display = config.xGrid !== false;
            }
            if (chart.options.scales?.y) {
                chart.options.scales.y.display = config.yShow !== false;
                chart.options.scales.y.grid.display = config.yGrid !== false;
                chart.options.scales.y.beginAtZero = config.yBeginZero !== false;
            }
        }
        
        chart.update();
    }
    
    resetConfiguration() {
        if (!this.currentChartId) return;
        this.chartConfigs.delete(this.currentChartId);
        this.loadConfigToModal({ ...this.defaultConfig });
    }
}

class ProductosManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/productos').catch(() => []);
            this.render(data);
            this.loadSelects();
        } catch (error) {
            console.error('Error loading productos:', error);
            this.render([]);
        }
    }

    async loadSelects() {
        try {
            const [marcas, categorias, industrias] = await Promise.all([
                this.api.get('/marcas').catch(() => []),
                this.api.get('/categorias').catch(() => []),
                this.api.get('/industrias').catch(() => [])
            ]);

            const populate = (selectId, items, valueField, labelField) => {
                const select = document.getElementById(selectId);
                if (!select) return;
                select.innerHTML = '<option value="">Seleccionar</option>';
                items.forEach(item => {
                    select.innerHTML += `<option value="${item[valueField]}">${item[labelField]}</option>`;
                });
            };

            populate('productoMarca', marcas, 'cod', 'nombre');
            populate('productoCategoria', categorias, 'cod', 'nombre');
            populate('productoIndustria', industrias, 'cod', 'nombre');
        } catch (error) {
            console.error('Error loading selects:', error);
        }
    }

    render(data) {
        const tbody = document.querySelector('#tablaProductos tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay productos registrados</td></tr>';
            return;
        }

        data.forEach(item => {
            // Si es base64 no agregar timestamp, si es URL normal sí para evitar caché
            let imagen = item.imagen || 'https://placehold.co/50x50?text=Sin+Imagen';
            if (imagen && !imagen.startsWith('data:')) {
                imagen = `${imagen}?t=${Date.now()}`;
            }
            const row = `
                <tr>
                    <td><img src="${imagen}" alt="${item.nombre}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;"></td>
                    <td>${item.codigo}</td>
                    <td>${item.nombre}</td>
                    <td>Bs ${new Intl.NumberFormat('es-BO').format(item.precio)}</td>
                    <td>${item.marca_nombre || '-'}</td>
                    <td>${item.categoria_nombre || '-'}</td>
                    <td>${item.industria_nombre || '-'}</td>
                    <td><span class="badge-${item.estado === 'activo' ? 'success' : 'danger'}">${item.estado}</span></td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-warning btn-sm" onclick="productosManager.edit(${item.codigo})" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="productosManager.delete(${item.codigo})" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const codigo = document.getElementById('productoCodigo').value;
        const data = {
            nombre: document.getElementById('productoNombre').value,
            descripcion: document.getElementById('productoDescripcion').value,
            precio: parseFloat(document.getElementById('productoPrecio').value),
            serie: document.getElementById('productoSerie').value,
            cod_marca: parseInt(document.getElementById('productoMarca').value),
            cod_categoria: parseInt(document.getElementById('productoCategoria').value),
            cod_industria: parseInt(document.getElementById('productoIndustria').value),
            estado: document.getElementById('productoEstado').value
        };

        try {
            if (codigo) {
                await this.api.put(`/productos/${codigo}`, data);
            } else {
                await this.api.post('/productos', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar producto');
        }
    }

    async edit(codigo) {
        try {
            const item = await this.api.get(`/productos/${codigo}`).catch(() => null);
            if (!item) return;

            document.getElementById('productoCodigo').value = item.codigo;
            document.getElementById('productoNombre').value = item.nombre;
            document.getElementById('productoDescripcion').value = item.descripcion || '';
            document.getElementById('productoPrecio').value = item.precio;
            document.getElementById('productoSerie').value = item.serie || '';
            document.getElementById('productoMarca').value = item.cod_marca;
            document.getElementById('productoCategoria').value = item.cod_categoria;
            document.getElementById('productoIndustria').value = item.cod_industria;
            document.getElementById('productoEstado').value = item.estado;

            // Cargar imágenes del producto
            this.cargarImagenesProducto(codigo);

            const modal = new bootstrap.Modal(document.getElementById('modalProducto'));
            modal.show();
        } catch (error) {
            console.error('Error editing producto:', error);
        }
    }

    // Carga las imágenes del producto desde la API
    async cargarImagenesProducto(codigo) {
        const seccion = document.getElementById('seccionImagenes');
        const lista = document.getElementById('listaImagenes');
        
        seccion.style.display = 'block';
        lista.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Cargando...</div>';

        try {
            const imagenes = await this.api.get(`/productos/${codigo}/imagenes`).catch(() => []);
            
            if (!imagenes || imagenes.length === 0) {
                lista.innerHTML = '<div class="col-12 text-muted">No hay imágenes registradas</div>';
                return;
            }

            lista.innerHTML = '';
            imagenes.forEach(img => {
                const esPrincipal = img.es_principal ? '<span class="badge bg-primary ms-1">Principal</span>' : '';
                lista.innerHTML += `
                    <div class="col-md-6 mb-2">
                        <div class="card">
                            <img src="${img.url}" class="card-img-top" style="height:100px;object-fit:contain;" onerror="this.src='https://placehold.co/100x100?text=Error'">
                            <div class="card-body p-2">
                                ${esPrincipal}
                                <button class="btn btn-sm btn-danger btn-eliminar-imagen" data-id="${img.id}" title="Eliminar">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            // Agregar eventos a botones de eliminar
            lista.querySelectorAll('.btn-eliminar-imagen').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.eliminarImagen(btn.dataset.id, codigo);
                });
            });

        } catch (error) {
            console.error('Error loading images:', error);
            lista.innerHTML = '<div class="text-danger">Error al cargar imágenes</div>';
        }
    }

    // Agrega una nueva imagen al producto (solo archivo desde PC)
    async agregarImagen(producto_cod) {
        const fileInput = document.getElementById('nuevaImagenFile');
        const es_principal = document.getElementById('imagenEsPrincipal').checked;
        const file = fileInput.files[0];

        // Validar que seleccione archivo
        if (!file) {
            alert('Seleccione una imagen');
            return;
        }

        try {
            // Subir archivo usando FormData
            const formData = new FormData();
            formData.append('producto_cod', producto_cod);
            formData.append('imagen', file);
            formData.append('es_principal', es_principal);
            
            // Fetch con FormData (no JSON)
            const response = await fetch(API_URL + '/productos/imagenes', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                alert(data.message || 'Error al subir imagen');
                return;
            }
            
            // Limpiar formulario
            fileInput.value = '';
            document.getElementById('imagenEsPrincipal').checked = false;
            document.getElementById('previewImagen').style.display = 'none';
            
            // Recargar imágenes
            this.cargarImagenesProducto(producto_cod);
            
            // Recargar tabla de productos para mostrar nueva imagen
            this.load();
        } catch (error) {
            alert('Error al agregar imagen');
        }
    }

    // Configura el preview de imagen cuando se selecciona archivo
    configurarPreviewImagen() {
        const fileInput = document.getElementById('nuevaImagenFile');
        const preview = document.getElementById('previewImagen');
        
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    // Elimina una imagen del producto
    async eliminarImagen(imagenId, producto_cod) {
        if (!confirm('¿Eliminar esta imagen?')) return;

        try {
            await this.api.delete(`/productos/imagenes/${imagenId}`);
            this.cargarImagenesProducto(producto_cod);
            this.load(); // Recargar tabla
        } catch (error) {
            alert('Error al eliminar imagen');
        }
    }

    async delete(codigo) {
        if (!confirm('¿Está seguro de eliminar este producto?')) return;

        try {
            await this.api.delete(`/productos/${codigo}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar producto');
        }
    }

    clearForm() {
        document.getElementById('productoCodigo').value = '';
        document.getElementById('formProducto').reset();
        // Ocultar sección de imágenes al crear nuevo producto
        document.getElementById('seccionImagenes').style.display = 'none';
        document.getElementById('listaImagenes').innerHTML = '';
    }
}

class IndustriasManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/industrias').catch(() => []);
            this.render(data);
        } catch (error) {
            console.error('Error loading industrias:', error);
            this.render([]);
        }
    }

    render(data) {
        const tbody = document.querySelector('#tablaIndustrias tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay industrias registradas</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.cod}</td>
                    <td>${item.nombre}</td>
                    <td>${item.productos_count || 0}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-warning btn-sm" onclick="industriasManager.edit(${item.cod})" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="industriasManager.delete(${item.cod})" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const codigo = document.getElementById('industriaCodigo').value;
        const data = {
            nombre: document.getElementById('industriaNombre').value
        };

        try {
            if (codigo) {
                await this.api.put(`/industrias/${codigo}`, data);
            } else {
                await this.api.post('/industrias', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalIndustria')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar industria');
        }
    }

    async edit(codigo) {
        try {
            const item = await this.api.get(`/industrias/${codigo}`).catch(() => null);
            if (!item) return;

            document.getElementById('industriaCodigo').value = item.cod;
            document.getElementById('industriaNombre').value = item.nombre;

            const modal = new bootstrap.Modal(document.getElementById('modalIndustria'));
            modal.show();
        } catch (error) {
            console.error('Error editing industria:', error);
        }
    }

    async delete(codigo) {
        if (!confirm('¿Está seguro de eliminar esta industria?')) return;

        try {
            await this.api.delete(`/industrias/${codigo}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar industria');
        }
    }

    clearForm() {
        document.getElementById('industriaCodigo').value = '';
        document.getElementById('industriaNombre').value = '';
    }
}

class CategoriasManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/categorias').catch(() => []);
            this.render(data);
        } catch (error) {
            console.error('Error loading categorias:', error);
            this.render([]);
        }
    }

    render(data) {
        const tbody = document.querySelector('#tablaCategorias tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay categorías registradas</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.cod}</td>
                    <td>${item.nombre}</td>
                    <td>${item.productos_count || 0}</td>
                    <td>
                        <button class="btn btn-action btn-warning me-1" onclick="categoriasManager.edit(${item.cod})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-action btn-danger" onclick="categoriasManager.delete(${item.cod})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const codigo = document.getElementById('categoriaCodigo').value;
        const data = {
            nombre: document.getElementById('categoriaNombre').value
        };

        try {
            if (codigo) {
                await this.api.put(`/categorias/${codigo}`, data);
            } else {
                await this.api.post('/categorias', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalCategoria')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar categoría');
        }
    }

    async edit(codigo) {
        try {
            const item = await this.api.get(`/categorias/${codigo}`).catch(() => null);
            if (!item) return;

            document.getElementById('categoriaCodigo').value = item.cod;
            document.getElementById('categoriaNombre').value = item.nombre;

            const modal = new bootstrap.Modal(document.getElementById('modalCategoria'));
            modal.show();
        } catch (error) {
            console.error('Error editing categoria:', error);
        }
    }

    async delete(codigo) {
        if (!confirm('¿Está seguro de eliminar esta categoría?')) return;

        try {
            await this.api.delete(`/categorias/${codigo}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar categoría');
        }
    }

    clearForm() {
        document.getElementById('categoriaCodigo').value = '';
        document.getElementById('categoriaNombre').value = '';
    }
}

class MarcasManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/marcas').catch(() => []);
            this.render(data);
        } catch (error) {
            console.error('Error loading marcas:', error);
            this.render([]);
        }
    }

    render(data) {
        const tbody = document.querySelector('#tablaMarcas tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay marcas registradas</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.cod}</td>
                    <td>${item.nombre}</td>
                    <td>${item.productos_count || 0}</td>
                    <td>
                        <button class="btn btn-action btn-warning me-1" onclick="marcasManager.edit(${item.cod})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-action btn-danger" onclick="marcasManager.delete(${item.cod})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const codigo = document.getElementById('marcaCodigo').value;
        const data = {
            nombre: document.getElementById('marcaNombre').value
        };

        try {
            if (codigo) {
                await this.api.put(`/marcas/${codigo}`, data);
            } else {
                await this.api.post('/marcas', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalMarca')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar marca');
        }
    }

    async edit(codigo) {
        try {
            const item = await this.api.get(`/marcas/${codigo}`).catch(() => null);
            if (!item) return;

            document.getElementById('marcaCodigo').value = item.cod;
            document.getElementById('marcaNombre').value = item.nombre;

            const modal = new bootstrap.Modal(document.getElementById('modalMarca'));
            modal.show();
        } catch (error) {
            console.error('Error editing marca:', error);
        }
    }

    async delete(codigo) {
        if (!confirm('¿Está seguro de eliminar esta marca?')) return;

        try {
            await this.api.delete(`/marcas/${codigo}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar marca');
        }
    }

    clearForm() {
        document.getElementById('marcaCodigo').value = '';
        document.getElementById('marcaNombre').value = '';
    }
}

class ClientesManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/clientes').catch(() => []);
            this.render(data);
        } catch (error) {
            console.error('Error loading clientes:', error);
            this.render([]);
        }
    }

render(data) {
        const tbody = document.querySelector('#tablaClientes tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay clientes registrados</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.ci}</td>
                    <td>${item.nombre}</td>
                    <td>${item.apellido_paterno}</td>
                    <td>${item.apellido_materno}</td>
                    <td>${item.correo}</td>
                    <td>${item.numero_telefono}</td>
                    <td>${item.direccion}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-warning btn-sm" onclick="clientesManager.edit('${item.ci}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="clientesManager.delete('${item.ci}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const ci = document.getElementById('clienteCi').value;
        const data = {
            ci: document.getElementById('clienteCiExt').value,
            nombre: document.getElementById('clienteNombre').value,
            apellido_paterno: document.getElementById('clienteApellidoPaterno').value,
            apellido_materno: document.getElementById('clienteApellidoMaterno').value,
            correo: document.getElementById('clienteCorreo').value,
            direccion: document.getElementById('clienteDireccion').value,
            numero_telefono: parseInt(document.getElementById('clienteTelefono').value)
        };

        try {
            if (ci) {
                await this.api.put(`/clientes/${ci}`, data);
            } else {
                await this.api.post('/clientes', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar cliente');
        }
    }

    async edit(ci) {
        try {
            const item = await this.api.get(`/clientes/${ci}`).catch(() => null);
            if (!item) return;

            document.getElementById('clienteCi').value = item.ci;
            document.getElementById('clienteCiExt').value = item.ci;
            document.getElementById('clienteNombre').value = item.nombre;
            document.getElementById('clienteApellidoPaterno').value = item.apellido_paterno;
            document.getElementById('clienteApellidoMaterno').value = item.apellido_materno;
            document.getElementById('clienteCorreo').value = item.correo;
            document.getElementById('clienteDireccion').value = item.direccion;
            document.getElementById('clienteTelefono').value = item.numero_telefono;

            const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
            modal.show();
        } catch (error) {
            console.error('Error editing cliente:', error);
        }
    }

    async delete(ci) {
        if (!confirm('¿Está seguro de eliminar este cliente?')) return;

        try {
            await this.api.delete(`/clientes/${ci}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar cliente');
        }
    }

    clearForm() {
        document.getElementById('clienteCi').value = '';
        document.getElementById('formCliente').reset();
    }
}

class UsuariosManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/usuarios').catch(() => []);
            const roles = await this.api.get('/roles').catch(() => []);
            this.render(data);
            this.renderRoles(roles);
        } catch (error) {
            console.error('Error loading usuarios:', error);
            this.render([]);
        }
    }

    renderRoles(roles) {
        const select = document.getElementById('usuarioRol');
        if (!select) return;
        select.innerHTML = '<option value="">Seleccionar</option>';
        roles.forEach(rol => {
            select.innerHTML += `<option value="${rol.cod}">${rol.nombre}</option>`;
        });
    }

    render(data) {
        const tbody = document.querySelector('#tablaUsuarios tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios registrados</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.email}</td>
                    <td>${item.rol_nombre || 'Sin rol'}</td>
                    <td>${new Date(item.created_at).toLocaleDateString('es-BO')}</td>
                    <td>
                        <button class="btn btn-action btn-warning me-1" onclick="usuariosManager.edit(${item.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-action btn-danger" onclick="usuariosManager.delete(${item.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const id = document.getElementById('usuarioId').value;
        const data = {
            email: document.getElementById('usuarioEmail').value,
            rol_id: parseInt(document.getElementById('usuarioRol').value)
        };

        const password = document.getElementById('usuarioPassword').value;
        if (password) {
            data.password = password;
        }

        try {
            if (id) {
                await this.api.put(`/usuarios/${id}`, data);
            } else {
                await this.api.post('/usuarios', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar usuario');
        }
    }

    async edit(id) {
        try {
            const item = await this.api.get(`/usuarios/${id}`).catch(() => null);
            if (!item) return;

            document.getElementById('usuarioId').value = item.id;
            document.getElementById('usuarioEmail').value = item.email;
            document.getElementById('usuarioRol').value = item.rol_id;
            document.getElementById('usuarioPassword').value = '';

            const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
            modal.show();
        } catch (error) {
            console.error('Error editing usuario:', error);
        }
    }

    async delete(id) {
        if (!confirm('¿Está seguro de eliminar este usuario?')) return;

        try {
            await this.api.delete(`/usuarios/${id}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar usuario');
        }
    }

    clearForm() {
        document.getElementById('usuarioId').value = '';
        document.getElementById('formUsuario').reset();
    }
}

class VentasManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/ventas').catch(() => []);
            this.render(data);
        } catch (error) {
            console.error('Error loading ventas:', error);
            this.render([]);
        }
    }

    render(data) {
        const tbody = document.querySelector('#tablaVentas tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay ventas registradas</td></tr>';
            return;
        }

        data.forEach(item => {
            const badgeClass = item.estado === 'entregado' ? 'success' : 
                             item.estado === 'cancelado' ? 'danger' : 'warning';
            const row = `
                <tr>
                    <td>${item.nro}</td>
                    <td>${item.cliente || 'No identificado'}</td>
                    <td>${new Date(item.fecha_hora).toLocaleDateString('es-BO')}</td>
                    <td>Bs ${new Intl.NumberFormat('es-BO').format(item.total)}</td>
                    <td><span class="badge-${badgeClass}">${item.estado}</span></td>
                    <td>
                        <button class="btn btn-action btn-info me-1" onclick="ventasManager.view(${item.nro})" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-action btn-danger" onclick="ventasManager.delete(${item.nro})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async view(nro) {
        try {
            console.log("Cargando detalle de venta:", nro);
            const [venta, detalle] = await Promise.all([
                this.api.get(`/ventas/${nro}`).catch(() => ({})),
                this.api.get(`/ventas/${nro}/detalle`).catch(() => [])
            ]);
            console.log("Venta:", venta, "Detalle:", detalle);
            
            const setIfExists = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            setIfExists('infoVentaNro', nro);
            setIfExists('infoVentaTotal', 'Bs ' + new Intl.NumberFormat('es-BO').format(venta.total || 0));
            setIfExists('infoVentaEstado', venta.estado || '-');
            setIfExists('infoVentaFecha', venta.fecha_hora ? new Date(venta.fecha_hora).toLocaleDateString('es-BO') : '-');

            const tbody = document.querySelector('#tablaDetalleVenta tbody');
            if (!tbody) {
                new bootstrap.Modal(document.getElementById('modalVerVenta')).show();
                return;
            }
            tbody.innerHTML = '';

            if (!detalle || detalle.length === 0) {
                // Verificar inconsistencia: si hay total pero no hay detalle
                const mensaje = (venta.total > 0) 
                    ? 'Venta sin detalle (datos inconsistentes)' 
                    : 'Sin productos registrados';
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${mensaje}</td></tr>`;
            } else {
                detalle.forEach(item => {
                    const subtotal = item.cantidad * item.precio_unitario;
                    tbody.innerHTML += `
                        <tr>
                            <td>${sanitizeText(item.producto_nombre || 'Producto ' + item.cod_producto)}</td>
                            <td>${item.cantidad}</td>
                            <td>Bs ${new Intl.NumberFormat('es-BO').format(item.precio_unitario)}</td>
                            <td>Bs ${new Intl.NumberFormat('es-BO').format(subtotal)}</td>
                        </tr>
                    `;
                });
            }

            const modalEl = document.getElementById('modalVerVenta');
            if (modalEl) new bootstrap.Modal(modalEl).show();
        } catch (error) {
            console.error('Error viewing venta:', error);
        }
    }

    async delete(nro) {
        if (!confirm('¿Eliminar esta venta?')) return;
        try {
            await this.api.delete(`/ventas/${nro}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar');
        }
    }
}

class ReportesManager {
    constructor(api, dashboardManager) {
        this.api = api;
        this.dashboardManager = dashboardManager;
    }

    async load() {
        await this.dashboardManager.loadStats();
        await this.dashboardManager.loadVentasPorCategoria();
        await this.dashboardManager.loadVentasMensuales();
        await this.dashboardManager.loadVentasSucursal();
        await this.dashboardManager.loadProductosPorMarca();
        await this.dashboardManager.loadProductosPorIndustria();
        await this.dashboardManager.loadVentasPorFecha();
        await this.dashboardManager.loadTopClientesChart();
        await this.dashboardManager.loadTopClientes5Chart();
        await this.dashboardManager.loadUltimasVentas();
    }
}

class App {
    constructor() {
        this.api = new APIClient('http://localhost:8090/api');
        this.dashboardManager = new DashboardManager(this.api);
        this.productosManager = new ProductosManager(this.api);
        this.industriasManager = new IndustriasManager(this.api);
        this.categoriasManager = new CategoriasManager(this.api);
        this.marcasManager = new MarcasManager(this.api);
        this.clientesManager = new ClientesManager(this.api);
        this.usuariosManager = new UsuariosManager(this.api);
        this.ventasManager = new VentasManager(this.api);
        this.sucursalesManager = new SucursalesManager(this.api);
        this.reportesManager = new ReportesManager(this.api, this.dashboardManager);

        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });
    }

    navigateTo(page) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const navLink = document.querySelector(`[data-page="${page}"]`);
        if (navLink) navLink.classList.add('active');

        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        const titles = {
            dashboard: 'Dashboard',
            productos: 'Productos',
            industrias: 'Industrias',
            categorias: 'Categorías',
            marcas: 'Marcas',
            clientes: 'Clientes',
            usuarios: 'Usuarios',
            ventas: 'Ventas',
            reportes: 'Reportes',
            sucursales: 'Sucursales'
        };
        setElementText('pageTitle', titles[page] || page);

        this.loadPage(page);
        this.currentPage = page;
    }

    loadPage(page) {
        switch (page) {
            case 'dashboard':
                this.dashboardManager.loadStats();
                this.dashboardManager.loadVentasPorCategoria();
                this.dashboardManager.loadVentasMensuales();
                this.dashboardManager.loadUltimasVentas();
                break;
            case 'productos':
                this.productosManager.load();
                break;
            case 'industrias':
                this.industriasManager.load();
                break;
            case 'categorias':
                this.categoriasManager.load();
                break;
            case 'marcas':
                this.marcasManager.load();
                break;
            case 'clientes':
                this.clientesManager.load();
                break;
            case 'usuarios':
                this.usuariosManager.load();
                break;
            case 'ventas':
                this.ventasManager.load();
                break;
            case 'sucursales':
                this.sucursalesManager.load();
                break;
            case 'reportes':
                this.reportesManager.load();
                break;
        }
    }

    setupEventListeners() {
        document.getElementById('guardarProducto')?.addEventListener('click', () => this.productosManager.save());
        document.getElementById('agregarImagenBtn')?.addEventListener('click', () => {
            const codigo = document.getElementById('productoCodigo').value;
            if (codigo) {
                this.productosManager.agregarImagen(codigo);
            }
        });
        
        // Configurar preview de imagen al seleccionar archivo
        this.productosManager.configurarPreviewImagen();
        
        document.getElementById('guardarIndustria')?.addEventListener('click', () => this.industriasManager.save());
        document.getElementById('guardarCategoria')?.addEventListener('click', () => this.categoriasManager.save());
        document.getElementById('guardarMarca')?.addEventListener('click', () => this.marcasManager.save());
        document.getElementById('guardarCliente')?.addEventListener('click', () => this.clientesManager.save());
        document.getElementById('guardarUsuario')?.addEventListener('click', () => this.usuariosManager.save());
        document.getElementById('guardarSucursal')?.addEventListener('click', () => this.sucursalesManager.save());

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('hidden.bs.modal', () => {
                document.querySelectorAll('form').forEach(form => form.reset());
            });
        });

        document.getElementById('toggleSidebar')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('show');
        });

        let searchTimeout;
        document.getElementById('buscarProducto')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterProductos(e.target.value);
            }, 300);
        });

        document.getElementById('buscarCliente')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterClientes(e.target.value);
            }, 300);
        });

        document.getElementById('buscarIndustria')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterIndustrias(e.target.value);
            }, 300);
        });

        document.getElementById('buscarCategoria')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterCategorias(e.target.value);
            }, 300);
        });

        document.getElementById('buscarMarca')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterMarcas(e.target.value);
            }, 300);
        });

        document.getElementById('buscarVenta')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterVentas(e.target.value);
            }, 300);
        });

        document.getElementById('buscarSucursal')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterSucursales(e.target.value);
            }, 300);
        });
    }

    async filterProductos(query) {
        if (!query) {
            this.productosManager.load();
            return;
        }

        try {
            const data = await this.api.get(`/productos?search=${query}`).catch(() => []);
            this.productosManager.render(data);
        } catch (error) {
            console.error('Error filtering productos:', error);
        }
    }

    async filterClientes(query) {
        if (!query) {
            this.clientesManager.load();
            return;
        }

        try {
            const data = await this.api.get(`/clientes?search=${query}`).catch(() => []);
            this.clientesManager.render(data);
        } catch (error) {
            console.error('Error filtering clientes:', error);
        }
    }

    async filterIndustrias(query) {
        const campo = document.getElementById('filtroIndustria')?.value || 'nombre';
        if (!query) {
            this.industriasManager.load();
            return;
        }
        try {
            const data = await this.api.get(`/industrias?search=${query}&campo=${campo}`).catch(() => []);
            this.industriasManager.render(data);
        } catch (error) {
            console.error('Error filtering industrias:', error);
        }
    }

    async filterCategorias(query) {
        const campo = document.getElementById('filtroCategoria')?.value || 'nombre';
        if (!query) {
            this.categoriasManager.load();
            return;
        }
        try {
            const data = await this.api.get(`/categorias?search=${query}&campo=${campo}`).catch(() => []);
            this.categoriasManager.render(data);
        } catch (error) {
            console.error('Error filtering categorias:', error);
        }
    }

    async filterMarcas(query) {
        const campo = document.getElementById('filtroMarca')?.value || 'nombre';
        if (!query) {
            this.marcasManager.load();
            return;
        }
        try {
            const data = await this.api.get(`/marcas?search=${query}&campo=${campo}`).catch(() => []);
            this.marcasManager.render(data);
        } catch (error) {
            console.error('Error filtering marcas:', error);
        }
    }

    async filterVentas(query) {
        const campo = document.getElementById('filtroVenta')?.value || 'nro';
        if (!query) {
            this.ventasManager.load();
            return;
        }
        try {
            const data = await this.api.get(`/ventas?search=${query}&campo=${campo}`).catch(() => []);
            this.ventasManager.render(data);
        } catch (error) {
            console.error('Error filtering ventas:', error);
        }
    }

    async filterSucursales(query) {
        const campo = document.getElementById('filtroSucursal')?.value || 'nombre';
        if (!query) {
            this.sucursalesManager.load();
            return;
        }
        try {
            const data = await this.api.get(`/sucursales?search=${query}&campo=${campo}`).catch(() => []);
            this.sucursalesManager.render(data);
        } catch (error) {
            console.error('Error filtering sucursales:', error);
        }
    }
}

class SucursalesManager {
    constructor(api) {
        this.api = api;
    }

    async load() {
        try {
            const data = await this.api.get('/sucursales').catch(() => []);
            this.render(data);
        } catch (error) {
            console.error('Error loading sucursales:', error);
            this.render([]);
        }
    }

    render(data) {
        const tbody = document.querySelector('#tablaSucursales tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay sucursales registradas</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.cod}</td>
                    <td>${item.nombre}</td>
                    <td>${item.direccion}</td>
                    <td>${item.numero_telefono || '-'}</td>
                    <td>${item.stock_total || 0}</td>
                    <td>
                        <button class="btn btn-action btn-info me-1" onclick="sucursalesManager.view(${item.cod})" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-action btn-warning me-1" onclick="sucursalesManager.edit(${item.cod})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-action btn-danger" onclick="sucursalesManager.delete(${item.cod})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async save() {
        const codigo = document.getElementById('sucursalCodigo').value;
        const data = {
            nombre: document.getElementById('sucursalNombre').value,
            direccion: document.getElementById('sucursalDireccion').value,
            numero_telefono: document.getElementById('sucursalTelefono').value
        };

        try {
            if (codigo) {
                await this.api.put(`/sucursales/${codigo}`, data);
            } else {
                await this.api.post('/sucursales', data);
            }
            this.clearForm();
            bootstrap.Modal.getInstance(document.getElementById('modalSucursal')).hide();
            this.load();
        } catch (error) {
            alert('Error al guardar sucursal');
        }
    }

    async edit(codigo) {
        try {
            const item = await this.api.get(`/sucursales/${codigo}`).catch(() => null);
            if (!item) return;

            document.getElementById('sucursalCodigo').value = item.cod;
            document.getElementById('sucursalNombre').value = item.nombre;
            document.getElementById('sucursalDireccion').value = item.direccion;
            document.getElementById('sucursalTelefono').value = item.numero_telefono || '';

            const modal = new bootstrap.Modal(document.getElementById('modalSucursal'));
            modal.show();
        } catch (error) {
            console.error('Error editing sucursal:', error);
        }
    }

    async delete(codigo) {
        if (!confirm('¿Está seguro de eliminar esta sucursal?')) return;

        try {
            await this.api.delete(`/sucursales/${codigo}`);
            this.load();
        } catch (error) {
            alert('Error al eliminar sucursal');
        }
    }

    async view(codigo) {
        try {
            const [sucursal, detalle] = await Promise.all([
                this.api.get(`/sucursales/${codigo}`),
                this.api.get(`/sucursales/${codigo}/detalle`).catch(() => [])
            ]);

            document.getElementById('infoSucursalCodigo').textContent = codigo;
            document.getElementById('infoSucursalNombre').textContent = sucursal.nombre || '-';
            document.getElementById('infoSucursalDireccion').textContent = sucursal.direccion || '-';
            document.getElementById('infoSucursalTelefono').textContent = sucursal.numero_telefono || '-';

            const tbody = document.querySelector('#tablaDetalleSucursal tbody');
            tbody.innerHTML = '';

            if (!detalle || detalle.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay productos en stock</td></tr>';
            } else {
                detalle.forEach(item => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${item.producto_nombre || 'Producto ' + item.cod_producto}</td>
                            <td>${item.stock}</td>
                            <td>Bs ${new Intl.NumberFormat('es-BO').format(item.producto_precio || 0)}</td>
                        </tr>
                    `;
                });
            }

            new bootstrap.Modal(document.getElementById('modalVerSucursal')).show();
        } catch (error) {
            console.error('Error viewing sucursal:', error);
        }
    }

    clearForm() {
        document.getElementById('sucursalCodigo').value = '';
        document.getElementById('formSucursal').reset();
    }
}

const api = new APIClient('http://localhost:8090/api');
const app = new App();
const chartConfigManager = new ChartConfigManager(null);
const dashboardManager = new DashboardManager(api, chartConfigManager);
chartConfigManager.dashboardManager = dashboardManager;
const productosManager = new ProductosManager(api);
const industriasManager = new IndustriasManager(api);
const categoriasManager = new CategoriasManager(api);
const marcasManager = new MarcasManager(api);
const clientesManager = new ClientesManager(api);
const usuariosManager = new UsuariosManager(api);
const ventasManager = new VentasManager(api);
const sucursalesManager = new SucursalesManager(api);
const reportesManager = new ReportesManager(api, dashboardManager);

function logout() {
    localStorage.removeItem('usuario');
    window.location.href = '../login.html';
}

function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (user) {
        setElementText('userName', user.email?.split('@')[0] || 'Usuario');
        setElementText('userEmail', user.email || '');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard iniciando...");
    cargarDashboard();
    dashboardManager.load();
    loadUserInfo();
    
    // Detectar navegación a dashboard
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('data-page');
            if (page === 'dashboard') {
                console.log("Entrando a dashboard...");
                cargarDashboard();
            }
        });
    });
});