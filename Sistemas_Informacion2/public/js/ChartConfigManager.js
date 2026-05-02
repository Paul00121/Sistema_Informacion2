class ChartConfigManager {
    constructor(apiBase = '/api') {
        this.apiBase = apiBase;
        this.charts = {};
        this.configs = {};
        this.defaultColors = [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
            '#84cc16', '#22d3ee', '#a855f7', '#fb7185', '#2dd4bf'
        ];
        this.modalChartId = null;
        this.token = (() => { try { return localStorage.getItem('auth_token'); } catch(e) { return null; } })();
    }

    authHeaders() {
        return this.token ? { 'Authorization': 'Bearer ' + this.token } : {};
    }

    async fetchJSON(endpoint) {
        try {
            const res = await fetch(this.apiBase + endpoint, {
                headers: { 'Accept': 'application/json', ...this.authHeaders() }
            });
            const json = await res.json();
            return json.data || json;
        } catch (e) {
            console.error('ChartConfig fetch error:', endpoint, e);
            return [];
        }
    }

    // Registry: each chart has { id, endpoint, labelKey, valueKey, secondaryValueKey, title, defaultType }
    defineChart(id, opts) {
        this.configs[id] = {
            id,
            endpoint: opts.endpoint,
            labelKey: opts.labelKey || 'nombre',
            valueKey: opts.valueKey || 'total',
            secondaryValueKey: opts.secondaryValueKey || null,
            title: opts.title || id,
            defaultType: opts.defaultType || 'bar',
            colors: [...this.defaultColors],
            sort: opts.sort || 'desc',
            showLegend: true,
            showGrid: true,
            borderRadius: 4,
            ...opts
        };
    }

    getConfig(id) {
        if (!this.configs[id]) return null;
        const c = this.configs[id];
        return {
            type: localStorage.getItem('chart_type_' + id) || c.defaultType,
            colors: (() => { try { return JSON.parse(localStorage.getItem('chart_colors_' + id)); } catch(e) { return null; } })() || c.colors,
            sort: localStorage.getItem('chart_sort_' + id) || c.sort,
            showLegend: localStorage.getItem('chart_legend_' + id) !== 'false',
            showGrid: localStorage.getItem('chart_grid_' + id) !== 'false',
            borderRadius: parseInt(localStorage.getItem('chart_radius_' + id)) || c.borderRadius,
        };
    }

    saveConfig(id, cfg) {
        localStorage.setItem('chart_type_' + id, cfg.type);
        localStorage.setItem('chart_colors_' + id, JSON.stringify(cfg.colors));
        localStorage.setItem('chart_sort_' + id, cfg.sort);
        localStorage.setItem('chart_legend_' + id, cfg.showLegend);
        localStorage.setItem('chart_grid_' + id, cfg.showGrid);
        localStorage.setItem('chart_radius_' + id, cfg.borderRadius);
    }

    async loadChart(id) {
        const cfg = this.getConfig(id);
        const def = this.configs[id];
        if (!def) return;

        let data = await this.fetchJSON(def.endpoint);
        if (!Array.isArray(data)) data = [];

        if (cfg.sort === 'desc') {
            data.sort((a, b) => (b[def.valueKey] || 0) - (a[def.valueKey] || 0));
        } else {
            data.sort((a, b) => (a[def.valueKey] || 0) - (b[def.valueKey] || 0));
        }

        const labels = data.map(d => d[def.labelKey] || '—');
        const values = data.map(d => parseFloat(d[def.valueKey]) || 0);
        const secondary = def.secondaryValueKey ? data.map(d => parseFloat(d[def.secondaryValueKey]) || 0) : null;

        this.renderChart(id, labels, values, secondary, cfg, def);
    }

    renderChart(id, labels, values, secondary, cfg, def) {
        const canvas = document.getElementById('chart-' + id);
        if (!canvas) return;

        if (this.charts[id]) {
            this.charts[id].destroy();
        }

        const isPie = ['pie', 'doughnut', 'polarArea'].includes(cfg.type);
        const colors = cfg.colors.slice(0, Math.max(labels.length, 1));
        while (colors.length < labels.length) {
            colors.push(this.defaultColors[colors.length % this.defaultColors.length]);
        }

        const datasets = [];
        const mainDataset = {
            label: def.title,
            data: values,
            backgroundColor: isPie ? colors : colors[0],
            borderColor: isPie ? '#fff' : colors[0],
            borderWidth: isPie ? 2 : 1,
            borderRadius: isPie ? 0 : cfg.borderRadius,
            tension: 0.3,
            fill: !isPie,
        };

        if (!isPie && cfg.type !== 'radar') {
            mainDataset.backgroundColor = colors[0] + '33';
            mainDataset.borderColor = colors[0];
            mainDataset.borderWidth = 2;
            mainDataset.pointBackgroundColor = colors[0];
            mainDataset.pointRadius = 4;
        }

        datasets.push(mainDataset);

        if (secondary && !isPie) {
            datasets.push({
                label: 'Ingresos',
                data: secondary,
                backgroundColor: '#f59e0b33',
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderRadius: cfg.borderRadius,
                tension: 0.3,
                fill: false,
                yAxisID: 'y1',
            });
        }

        this.charts[id] = new Chart(canvas, {
            type: cfg.type,
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: cfg.showLegend, position: 'bottom' },
                    tooltip: { enabled: true, mode: 'index', intersect: false }
                },
                scales: isPie ? {} : {
                    x: {
                        grid: { display: cfg.showGrid },
                        ticks: { maxRotation: 45, font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { display: cfg.showGrid },
                        ticks: { font: { size: 11 } }
                    },
                    ...(secondary ? {
                        y1: {
                            position: 'right',
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: { font: { size: 11 } }
                        }
                    } : {})
                }
            }
        });
    }

    async refreshAll() {
        for (const id of Object.keys(this.configs)) {
            await this.loadChart(id);
        }
    }

    async refresh(id) {
        if (this.configs[id]) await this.loadChart(id);
    }

    openConfig(id) {
        this.modalChartId = id;
        const cfg = this.getConfig(id);
        const def = this.configs[id];
        if (!def) return;

        document.getElementById('configChartTitle').textContent = 'Configurar: ' + (def.title || id);

        document.getElementById('cfg_chartType').value = cfg.type;
        document.getElementById('cfg_colors').value = cfg.colors.join(',');
        document.getElementById('cfg_sort').value = cfg.sort;
        document.getElementById('cfg_showLegend').checked = cfg.showLegend;
        document.getElementById('cfg_showGrid').checked = cfg.showGrid;
        document.getElementById('cfg_borderRadius').value = cfg.borderRadius;

        const modal = new bootstrap.Modal(document.getElementById('configChartModal'));
        modal.show();

        this.previewColors(cfg.colors);
    }

    applyConfig() {
        const id = this.modalChartId;
        if (!id || !this.configs[id]) return;

        const colorsStr = document.getElementById('cfg_colors').value;
        const colors = colorsStr.split(',').map(s => s.trim()).filter(s => s);

        const cfg = {
            type: document.getElementById('cfg_chartType').value,
            colors: colors.length > 0 ? colors : this.defaultColors,
            sort: document.getElementById('cfg_sort').value,
            showLegend: document.getElementById('cfg_showLegend').checked,
            showGrid: document.getElementById('cfg_showGrid').checked,
            borderRadius: parseInt(document.getElementById('cfg_borderRadius').value) || 4,
        };

        this.saveConfig(id, cfg);
        this.refresh(id);

        const modalEl = document.getElementById('configChartModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    previewColors(colors) {
        const preview = document.getElementById('cfg_colorPreview');
        if (!preview) return;
        preview.innerHTML = '';
        colors.forEach(c => {
            const swatch = document.createElement('span');
            swatch.className = 'd-inline-block rounded me-1';
            swatch.style.cssText = 'width:20px;height:20px;background:' + c + ';border:1px solid #ddd;';
            preview.appendChild(swatch);
        });
    }

    setupModalListeners() {
        document.getElementById('cfg_colors').addEventListener('input', (e) => {
            const colors = e.target.value.split(',').map(s => s.trim()).filter(s => s);
            this.previewColors(colors);
        });

        document.getElementById('cfg_chartType').addEventListener('change', () => {
            const id = this.modalChartId;
            if (!id || !this.configs[id]) return;
            const cfg = this.getConfig(id);
            cfg.type = document.getElementById('cfg_chartType').value;
            this.configs[id]._previewType = cfg.type;
            this.refresh(id);
        });

        document.getElementById('cfg_applyBtn').addEventListener('click', () => this.applyConfig());

        document.getElementById('configChartModal').addEventListener('hidden.bs.modal', () => {
            if (this.modalChartId && this.configs[this.modalChartId]) {
                const savedCfg = this.getConfig(this.modalChartId);
                this.configs[this.modalChartId]._previewType = null;
                this.refresh(this.modalChartId);
            }
            this.modalChartId = null;
        });
    }

    static getColorPalettes() {
        return {
            'Moderna': '#4f46e5,#10b981,#f59e0b,#ef4444,#06b6d4',
            'Pastel': '#a5b4fc,#86efac,#fde68a,#fca5a5,#67e8f9',
            'Oscura': '#1e1b4b,#065f46,#92400e,#991b1b,#155e75',
            'Neón': '#6366f1,#22c55e,#eab308,#ef4444,#06b6d4',
            'Monocromo': '#1f2937,#374151,#4b5563,#6b7280,#9ca3af',
        };
    }
}
