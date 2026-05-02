/**
 * Admin Core - Sistema de Gestión
 * Programación Orientada a Objetos
 */

console.log("JS admin-core.js cargado");

const API_URL = '/api';
const AUTH_TOKEN = (() => { try { return localStorage.getItem('auth_token'); } catch(e) { return null; } })();

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

async function cargarDashboard() {
    try {
        console.log("Cargando dashboard...");
        
        const resVentas = await fetch(API_URL + '/ventas/completadas', { cache: 'no-store' });
        const dataVentas = await resVentas.json();
        
        const resIngresos = await fetch(API_URL + '/ingresos-completados', { cache: 'no-store' });
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
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.token = AUTH_TOKEN || (() => { try { return localStorage.getItem('auth_token'); } catch(e) { return null; } })();
    }

    async request(endpoint, options = {}) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            };
            if (this.token) {
                headers['Authorization'] = 'Bearer ' + this.token;
            }
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers,
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
    constructor(api) {
        this.api = api;
        this.charts = {};
    }

    async load() {
        await this.loadStats();
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

    createPieChart(canvasId, labels, data, label) {
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
        this.dashboardManager.loadStats();
        this.dashboardManager.loadProductosPorMarca();
        this.dashboardManager.loadProductosPorIndustria();
        this.dashboardManager.loadVentasPorFecha();
    }
}

class App {
    constructor() {
        this.api = new APIClient('/api');
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
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');

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

const api = new APIClient('/api');
const app = new App();
const dashboardManager = new DashboardManager(api);
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