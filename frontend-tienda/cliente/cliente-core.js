// Cliente Core - Tienda Online

const API_URL = 'http://localhost:8090/api';
let cart = [];
let currentUser = null;
let windowCurrentProduct = null;

class TiendaAPI {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async get(endpoint) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                headers: { 'Accept': 'application/json' }
            });
            const json = await response.json();
            return json.data || json;
        } catch (error) {
            console.error('API Error:', error);
            return [];
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await response.json();
            return json;
        } catch (error) {
            console.error('API Error:', error);
            return { success: false };
        }
    }
}

const api = new TiendaAPI(API_URL);

function init() {
    const userData = localStorage.getItem('usuario');
    if (userData) {
        currentUser = JSON.parse(userData);
    }
    if (!currentUser) {
        window.location.href = '../login.html';
        return;
    }

    handlePayPalReturn();

    // Cargar descuento del usuario
    loadUserDiscount();

    loadCategories();
    loadFeaturedProducts();
    updateCartCount();
    loadProfile();
}

// Variable global para almacenar descuento
window.userDiscount = 0;

async function loadUserDiscount() {
    if (!currentUser) return;

    // Yo reseteo el descuento a 0 cada vez que se llama esta función
    window.userDiscount = 0;

    try {
        // Yo obtengo las suscripciones del usuario actual
        const clienteId = currentUser?.cliente?.ci || currentUser?.id;
        const suscripciones = await api.get('/suscripciones?cliente_ci=' + clienteId);
        const activeSub = suscripciones.find(function(s) { return s.estado === 'activa'; });

        if (activeSub) {
            // Yo determino el descuento según el nombre del plan en la BD
            const planName = (activeSub.plan_nombre || '').toLowerCase();
            if (planName.includes('premium')) {
                window.userDiscount = 20;
            } else if (planName.includes('basic')) {
                window.userDiscount = 5;
            } else if (planName.includes('free')) {
                window.userDiscount = 0;
            }
            console.log("Yo apliqué descuento:", window.userDiscount + "%");
        }
    } catch(e) {
        console.error("Yo atrapé un error al cargar el descuento:", e);
    }
}

function handlePayPalReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const paypalStatus = urlParams.get('paypal');
    const orderId = urlParams.get('token') || urlParams.get('orderId');
    const subscriptionId = urlParams.get('subscriptionId');

    // Si viene de suscripción (tiene subscriptionId en la URL)
    if (subscriptionId) {
        processPendingSubscription();
        return;
    }

    // Si viene de pago de productos (tiene orderId)
    if (paypalStatus === 'success' && orderId) {
        captureOrderAndComplete(orderId);
    } else if (paypalStatus === 'cancel') {
        showPaymentError('Pago cancelado en PayPal');
        window.history.replaceState({}, '', window.location.pathname);
    }
}

async function captureOrderAndComplete(orderId) {
    // Mostrar loader
    showPaymentLoader('Completando pago...');

    try {
        const response = await fetch(API_URL + '/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: orderId })
        });
        const result = await response.json();

        if (result.success && result.data?.status === 'COMPLETED') {
            const total = parseFloat(localStorage.getItem('pendingOrderTotal') || '0');
            localStorage.removeItem('pendingOrderTotal');

            // Confirmar payment y redirigir a pedidos
            await confirmPaymentAndRedirect(total);
        } else {
            hidePaymentLoader();
            showPaymentError('Error al completar el pago: ' + (result.error || 'Intente más tarde'));
        }
    } catch(e) {
        hidePaymentLoader();
        showPaymentError('Error al procesar pago: ' + e.message);
    }
    window.history.replaceState({}, '', window.location.pathname);
}

function showPage(page) {
    document.querySelectorAll('[id^="page-"]').forEach(function(p) {
        p.style.display = 'none';
    });
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) {
        pageEl.style.display = 'block';
    }
    
    if (page === 'products') loadAllProducts();
    if (page === 'account') loadProfile();
    if (page === 'addresses') loadAddresses();
    if (page === 'orders') loadOrders();
    if (page === 'subscription') loadPlans();
    if (page === 'sucursales') loadSucursales();
}

async function loadCategories() {
    const categorias = await api.get('/categorias');
    const marcas = await api.get('/marcas');
    const industrias = await api.get('/industrias');
    
    window.allCategoriesData = [
        ...categorias.map(c => ({...c, tipo: 'categoria'})),
        ...marcas.map(m => ({...m, tipo: 'marca'})),
        ...industrias.map(i => ({...i, tipo: 'industria'}))
    ];
    
    renderCategories(window.allCategoriesData);
    
    const select = document.getElementById('searchCategory');
    if (select) {
        select.innerHTML = '<option value="">Todos</option>';
        categorias.forEach(function(c) {
            select.innerHTML += '<option value="' + c.cod + '">' + c.nombre + '</option>';
        });
    }
    
    filterCategories();
}

function renderCategories(categories) {
    let html = '';
    categories.forEach(function(cat) {
        const icon = cat.tipo === 'categoria' ? 'bi-grid' : 
                     cat.tipo === 'marca' ? 'bi-award' : 'bi-building';
        html += '<div class="col-6 col-md-4 col-lg-3 mb-3">' +
            '<div class="category-card" onclick="filterByCategory(' + cat.cod + ')">' +
            '<i class="bi ' + icon + '"></i>' +
            '<h4>' + cat.nombre + '</h4>' +
            '<span class="cat-count">' + (cat.tipo.charAt(0).toUpperCase() + cat.tipo.slice(1)) + '</span></div></div>';
    });
    document.getElementById('categoriesGrid').innerHTML = html;
}

function filterCategories() {
    const searchTerm = document.getElementById('categorySearchInput').value.toLowerCase();
    const filterType = document.getElementById('categoryFilterSelect').value;
    
    if (!window.allCategoriesData) return;
    
    let filtered = window.allCategoriesData;
    
    if (filterType !== 'todos') {
        filtered = filtered.filter(c => c.tipo === filterType);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(c => c.nombre.toLowerCase().includes(searchTerm));
    }
    
    renderCategories(filtered);
}

async function loadFeaturedProducts() {
    const productos = await api.get('/productos?limit=8');
    renderProducts(productos, 'featuredProducts');
}

async function loadAllProducts() {
    const productos = await api.get('/productos');
    renderProducts(productos, 'productsGrid');
}

function renderProducts(productos, containerId) {
    let html = '';

    if (productos.length === 0) {
        html = '<div class="col-12"><p class="text-muted">No hay productos disponibles</p></div>';
    }
    productos.forEach(function(p) {
        // Yo construyo la URL de la imagen del producto
        const imgUrl = getImageUrl(p.imagen, 'medium');
        const precioOriginal = p.precio;

        // Yo calculo el precio con descuento si el usuario tiene suscripción activa
        let precioFinal = precioOriginal;
        let priceHtml = '<div class="price">Bs ' + new Intl.NumberFormat('es-BO').format(precioOriginal) + '</div>';

        // Si hay descuento, mostrar precio tachado y precio con descuento
        if (window.userDiscount > 0) {
            precioFinal = precioOriginal * (1 - window.userDiscount / 100);
            priceHtml = '<div class="price text-decoration-line-through text-muted small">Bs ' + new Intl.NumberFormat('es-BO').format(precioOriginal) + '</div>' +
                '<div class="price text-success fw-bold">Bs ' + new Intl.NumberFormat('es-BO').format(precioFinal) + '</div>' +
                '<span class="badge bg-success">-' + window.userDiscount + '%</span>';
        }

        html += '<div class="col-6 col-md-4 col-lg-3 mb-4">' +
            '<div class="product-card" onclick="viewProduct(' + p.codigo + ')">' +
            '<img class="image" src="' + imgUrl + '" alt="' + p.nombre + '" style="width:100%;height:180px;object-fit:contain;">' +
            '<div class="title">' + p.nombre + '</div>' +
            priceHtml +
            '</div></div>';
    });
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
}

// Variable global para almacenar selección de sucursal
let selectedSucursal = null;
let currentProductStock = 0;

function viewProduct(codigo) {
    selectedSucursal = null;
    currentProductStock = 0;

    api.get('/productos/' + codigo).then(function(p) {
        if (!p) return;
        windowCurrentProduct = p;
        document.getElementById('productImage').src = getImageUrl(p.imagen, 'large');
        document.getElementById('productTitle').textContent = p.nombre;
        document.getElementById('productDesc').textContent = p.descripcion || '';
        document.getElementById('productPrice').textContent = new Intl.NumberFormat('es-BO').format(p.precio);
        document.getElementById('productMarca').textContent = p.marca_nombre || '-';
        document.getElementById('productCategoria').textContent = p.categoria_nombre || '-';
        document.getElementById('productQty').value = 1;

        // Ocultar info de stock inicialmente
        document.getElementById('stockInfo').style.display = 'none';

        // Obtener referencia al botón antes de cargar sucursales
        const addToCartBtn = document.querySelector('#page-product button[onclick="addToCartFromProduct()"]');
        const qtyInput = document.getElementById('productQty');

        // Deshabilitar botón inicialmente hasta que se seleccione sucursal
        if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.classList.add('disabled');
        }

        // Cargar sucursales con stock para este producto
        // La función loadSucursalesForProduct maneja la habilitación según stock disponible
        loadSucursalesForProduct(codigo);

        showPage('product');
    });
}

// Carga las sucursales disponibles para un producto específico
// Mejora: muestra AGOTADO si no hay stock, deshabilita opciones sin stock
async function loadSucursalesForProduct(productoCod) {
    const container = document.getElementById('sucursalesList');
    container.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm"></span> Cargando...</div>';

    // Referencias a elementos UI
    const addToCartBtn = document.querySelector('#page-product button[onclick="addToCartFromProduct()"]');
    const qtyInput = document.getElementById('productQty');
    const stockInfo = document.getElementById('stockInfo');

    try {
        const response = await fetch(API_URL + '/sucursales/producto/' + productoCod);
        const result = await response.json();

        // Validar: si no hay ninguna sucursal con stock, mostrar AGOTADO
        const sucursalesConStock = result.data ? result.data.filter(function(s) { return s.stock > 0; }) : [];

        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No hay sucursales disponibles para este producto</div>';
            // Deshabilitar botones
            if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.classList.add('disabled');
                addToCartBtn.setAttribute('aria-disabled', 'true');
            }
            if (qtyInput) qtyInput.disabled = true;
            return;
        }

        // Si ninguna sucursal tiene stock, mostrar AGOTADO en rojo
        if (sucursalesConStock.length === 0) {
            container.innerHTML = '<div class="alert alert-danger p-2">' +
                '<strong class="text-danger"><i class="bi bi-x-circle"></i> AGOTADO</strong>' +
                '<p class="mb-0 small text-muted">No hay stock disponible en ninguna sucursal</p></div>';
            // Deshabilitar botones
            if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.classList.add('disabled');
                addToCartBtn.setAttribute('aria-disabled', 'true');
            }
            if (qtyInput) qtyInput.disabled = true;
            // Ocultar info de stock
            if (stockInfo) stockInfo.style.display = 'none';
            return;
        }

        // Hay stock: generar opciones de sucursales
        let html = '';
        result.data.forEach(function(s) {
            const stock = s.stock || 0;
            const disabled = stock <= 0 ? 'disabled' : '';
            const stockClass = stock > 0 ? 'border-success' : 'border-secondary';
            const bgClass = stock > 0 ? '' : 'bg-light';
            const labelClass = stock > 0 ? 'text-success' : 'text-muted text-decoration-line-through';

            html += '<div class="form-check ' + bgClass + ' p-2 border rounded ' + stockClass + '" ' + disabled + '>' +
                '<input class="form-check-input" type="radio" name="sucursalRadio" id="sucursal' + s.cod + '" data-stock="' + stock + '" ' + disabled + '>' +
                '<label class="form-check-label w-100' + (stock <= 0 ? ' text-muted' : '') + '" for="sucursal' + s.cod + '">' +
                '<strong>' + s.nombre + '</strong> - ' +
                '<span class="' + labelClass + '">Stock: ' + stock + (stock <= 0 ? ' (Sin stock)' : '') + '</span>' +
                '</label></div>';
        });

        container.innerHTML = html;
        
        // Agregar eventos click a las opciones
        document.querySelectorAll('input[name="sucursalRadio"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                const sucursalId = parseInt(this.id.replace('sucursal', ''));
                const sucursal = result.data.find(function(s) { return s.cod === sucursalId; });

                if (sucursal) {
                    selectedSucursal = sucursal.cod;
                    currentProductStock = sucursal.stock || 0;

                    // Actualizar info de stock
                    if (stockInfo) {
                        stockInfo.style.display = 'block';
                        stockInfo.className = 'alert alert-info mb-3';
                        document.getElementById('stockCantidad').textContent = currentProductStock;
                    }

                    // Habilitar botón y cantidad
                    if (addToCartBtn) {
                        addToCartBtn.disabled = false;
                        addToCartBtn.classList.remove('disabled');
                        addToCartBtn.removeAttribute('aria-disabled');
                    }
                    if (qtyInput) qtyInput.disabled = false;

                    // Actualizar máximo de cantidad
                    if (qtyInput) {
                        qtyInput.max = currentProductStock;
                        if (parseInt(qtyInput.value) > currentProductStock) {
                            qtyInput.value = Math.min(1, currentProductStock);
                        }
                    }
                }
            });
        });

    } catch (error) {
        console.error('Error loading sucursales:', error);
        container.innerHTML = '<div class="alert alert-danger">Error al cargar sucursales</div>';
    }
}

// Cancela la selección de producto y vuelve a la lista
function cancelProductDetail() {
    selectedSucursal = null;
    currentProductStock = 0;
    windowCurrentProduct = null;
    showPage('products');
    loadAllProducts();
}

function addToCartFromProduct() {
    if (!windowCurrentProduct) return;

    // Validar selección de sucursal
    if (!selectedSucursal) {
        showToastMessage('Seleccione una sucursal', 'error');
        return;
    }

    const qty = parseInt(document.getElementById('productQty').value) || 1;

    // Validar stock
    if (!currentProductStock || qty > currentProductStock) {
        showToastMessage('Stock insuficiente', 'error');
        return;
    }

    // Añadir al carrito
    addToCart(windowCurrentProduct, qty, selectedSucursal);

    // Mostrar feedback en UI (toast)
    showToastMessage('Producto añadido al carrito', 'success');

    // Limpiar selección y volver a productos
    selectedSucursal = null;
    currentProductStock = 0;
    windowCurrentProduct = null;
    showPage('products');
    loadAllProducts();
}

function addToCart(product, cantidad, codSucursal) {
    if (!cantidad) cantidad = 1;

    // Calcular precio con descuento si existe
    let precioFinal = product.precio;
    if (window.userDiscount > 0) {
        precioFinal = product.precio * (1 - window.userDiscount / 100);
    }

    const existing = cart.find(function(item) { return item.codigo === product.codigo && item.cod_sucursal === codSucursal; });
    if (existing) {
        existing.cantidad += cantidad;
    } else {
        cart.push({
            codigo: product.codigo,
            nombre: product.nombre,
            precio: precioFinal,
            precioOriginal: product.precio,
            imagen: product.imagen,
            cantidad: cantidad,
            cod_sucursal: codSucursal
        });
    }
    saveCart();
    updateCartCount();
}

function removeFromCart(codigo) {
    cart = cart.filter(function(item) { return item.codigo !== codigo; });
    saveCart();
    updateCartCount();
    renderCart();
}

function saveCart() {
    localStorage.setItem('carrito', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce(function(sum, item) { return sum + item.cantidad; }, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = count;
}

function openCart() {
    renderCart();
    document.querySelector('.cart-overlay').classList.add('open');
    document.querySelector('.cart-sidebar').classList.add('open');
}

function closeCart() {
    document.querySelector('.cart-overlay').classList.remove('open');
    document.querySelector('.cart-sidebar').classList.remove('open');
}

// Funciones UI para mostrar mensajes (sin alert())
// IMPORTANTE: Siempre validar que el elemento exista antes de usar
function showPaymentLoader(message) {
    const modal = document.getElementById('successCardModal');
    if (modal && modal.querySelector) {
        const body = modal.querySelector('.modal-body');
        if (body) {
            body.innerHTML =
                '<div class="text-center p-4">' +
                '<div class="spinner-border text-primary mb-3"></div>' +
                '<h5>' + (message || 'Procesando...') + '</h5>' +
                '<p class="text-muted">Por favor espere</p></div>';
            new bootstrap.Modal(modal).show();
        }
    }
}

function hidePaymentLoader() {
    const modal = document.getElementById('successCardModal');
    if (modal) {
        try {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) instance.hide();
        } catch(e) {
            // Ignorar errores
        }
    }
}

function showPaymentError(message) {
    const modal = document.getElementById('paymentErrorModal');
    const messageEl = document.getElementById('errorMessageText');

    // Actualizar mensaje
    if (messageEl) {
        messageEl.textContent = message || 'Ha ocurrido un error';
    }

    if (modal) {
        try {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        } catch(e) {
            // Fallback
            modal.style.display = 'block';
            modal.classList.add('show');
        }
    } else {
        showToastMessage(message || 'Error', 'error');
    }
}

function closeErrorModal() {
    const modal = document.getElementById('paymentErrorModal');
    if (modal) {
        try {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) instance.hide();
        } catch(e) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }
}

function showPaymentSuccess(message) {
    const modal = document.getElementById('successModal');
    if (modal && modal.querySelector) {
        const content = modal.querySelector('.modal-body');
        if (content) {
            content.innerHTML =
                '<div class="text-center p-4">' +
                '<i class="bi bi-check-circle text-success" style="font-size:4rem;"></i>' +
                '<h5 class="mt-3">¡Éxito!</h5>' +
                '<p class="text-muted">' + (message || 'Operación completada') + '</p>' +
                '<button class="btn btn-primary" onclick="closeSuccessPayment()">Aceptar</button></div>';
            try {
                new bootstrap.Modal(modal).show();
            } catch(e) {
                console.error('Modal error:', e);
            }
        }
    } else {
        showToastMessage(message || 'Éxito', 'success');
    }
}

function closeSuccessPayment() {
    const modal = document.getElementById('successModal');
    if (modal) {
        try {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) instance.hide();
        } catch(e) {
            // Ignorar
        }
    }
}

// Mostrar mensaje toast (alternativa cuando no hay modal)
function showToastMessage(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast-container position-fixed top-50 start-50 translate-middle';
    toast.style.zIndex = '9999';

    const bgClass = type === 'error' ? 'bg-danger' : 'bg-success';
    const icon = type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle';

    toast.innerHTML =
        '<div class="toast show" role="alert">' +
        '<div class="toast-header ' + bgClass + ' text-white">' +
        '<i class="bi ' + icon + ' me-2"></i>' +
        '<strong class="me-auto">' + (type === 'error' ? 'Error' : 'Éxito') + '</strong>' +
        '<button type="button" class="btn-close" onclick="this.closest(\'.toast-container\').remove()"></button></div>' +
        '<div class="toast-body text-center">' + message + '</div></div>';

    document.body.appendChild(toast);

    // Auto ocultar después de 3 segundos
    setTimeout(function() {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

function getImageUrl(imagen, size = 'thumb') {
    // Yo defino los placeholders según el tamaño solicitado
    const placeholders = {
        'thumb': 'https://placehold.co/60x60?text=Sin+Imagen',
        'medium': 'https://placehold.co/200x200?text=Sin+Imagen',
        'large': 'https://placehold.co/400x400?text=Sin+Imagen'
    };
    const placeholder = placeholders[size] || placeholders['thumb'];

    // Yo valido que la imagen exista y sea un string válido
    if (!imagen || typeof imagen !== 'string') return placeholder;

    // Yo verifico si es una imagen en formato base64
    if (imagen.startsWith('data:')) return imagen;

    // Yo verifico si es una ruta relativa (/uploads/...) y agrego el dominio
    if (imagen.startsWith('/uploads/')) {
        return 'http://localhost:8090' + imagen;
    }

    // Yo verifico si ya es una URL completa
    if (imagen.startsWith('http')) return imagen;

    // Yo retorno el placeholder si no coincide con ningún formato conocido
    return placeholder;
}

function renderCart() {
    const total = cart.reduce(function(sum, item) { return sum + (item.precio * item.cantidad); }, 0);
    let html = '';
    if (cart.length === 0) {
        html = '<p class="text-muted">El carrito está vacío</p>';
    }
    cart.forEach(function(item) {
        const imgUrl = getImageUrl(item.imagen, 'thumb');
        html += '<div class="d-flex align-items-center mb-3 pb-3 border-bottom">' +
            '<img src="' + imgUrl + '" style="width:60px;height:60px;object-fit:contain;margin-right:10px;">' +
            '<div class="flex-grow-1">' +
            '<div style="font-size:0.9rem;">' + item.nombre + '</div>' +
            '<div class="text-muted">Bs ' + new Intl.NumberFormat('es-BO').format(item.precio) + ' x ' + item.cantidad + '</div></div>' +
            '<button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(' + item.codigo + ')"><i class="bi bi-trash"></i></button></div>';
    });
    const cartItems = document.getElementById('cartItems');
    if (cartItems) cartItems.innerHTML = html;
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = 'Bs ' + new Intl.NumberFormat('es-BO').format(total);
    return total;
}

function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const cat = document.getElementById('searchCategory').value;
    
    if (!query && !cat) {
        showPage('home');
        loadFeaturedProducts();
        return;
    }
    
    showPage('products');
    
    if (query) {
        api.get('/productos?search=' + query).then(function(productos) {
            if (cat) {
                productos = productos.filter(function(p) { return p.cod_categoria == cat; });
            }
            renderProducts(productos, 'productsGrid');
        });
    } else if (cat) {
        api.get('/productos?categoria=' + cat).then(function(productos) {
            renderProducts(productos, 'productsGrid');
        });
    }
}

function filterByCategory(cod) {
    showPage('products');
    api.get('/productos?categoria=' + cod).then(function(productos) {
        renderProducts(productos, 'productsGrid');
    });
}

function filterCategories() {
    const searchTerm = document.getElementById('categorySearchInput').value.toLowerCase();
    const filterType = document.getElementById('categoryFilterSelect').value;
    
    if (!window.allCategoriesData) return;
    
    let filtered = window.allCategoriesData;
    
    if (filterType !== 'todos') {
        filtered = filtered.filter(c => c.tipo === filterType);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(c => c.nombre.toLowerCase().includes(searchTerm));
    }
    
    renderCategories(filtered);
}

function filterByCategory(cod) {
    showPage('products');
    api.get('/productos?categoria=' + cod).then(function(productos) {
        renderProducts(productos, 'productsGrid');
    });
}

async function getUserDiscount() {
    const suscripciones = await api.get('/suscripciones?cliente_ci=' + (currentUser?.cliente?.ci || currentUser?.id));
    if (suscripciones.length > 0 && suscripciones[0].estado === 'activa') {
        const plan = suscripciones[0];
        if (plan.plan_nombre && plan.plan_nombre.toLowerCase().includes('premium')) {
            return 20;
        } else if (plan.plan_nombre && (plan.plan_nombre.toLowerCase().includes('basico') || plan.plan_nombre.toLowerCase().includes('basic'))) {
            return 5;
        }
    }
    return 0;
}

function goToCheckout() {
    if (cart.length === 0) {
        showToastMessage('El carrito está vacío', 'error');
        return;
    }
    closeCart();
    loadAddresses();
    const total = renderCart();
    const checkoutTotal = document.getElementById('checkoutTotal');
    if (checkoutTotal) {
        checkoutTotal.textContent = 'Bs ' + new Intl.NumberFormat('es-BO').format(total);
    }
    let html = '';
    cart.forEach(function(item) {
        html += '<div class="d-flex justify-content-between mb-2">' +
            '<span>' + item.nombre + ' x' + item.cantidad + '</span>' +
            '<span>Bs ' + new Intl.NumberFormat('es-BO').format(item.precio * item.cantidad) + '</span></div>';
    });
    const checkoutSummary = document.getElementById('checkoutSummary');
    if (checkoutSummary) {
        checkoutSummary.innerHTML = html;
    }
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        new bootstrap.Modal(checkoutModal).show();
    }
}

async function loadAddresses() {
    if (!currentUser) return;
    const clienteId = currentUser?.cliente?.ci || currentUser?.id;
    const direcciones = await api.get('/direcciones?cliente_ci=' + clienteId);
    let html = '';
    if (direcciones.length === 0) {
        html = '<p class="text-muted">No hay direcciones guardadas</p>';
    }
    direcciones.forEach(function(d) {
        html += '<div class="col-md-6 mb-3">' +
            '<div class="card p-3">' +
            '<div class="form-check">' +
            '<input type="radio" name="selectedAddress" value="' + d.id + '" ' + (d.es_principal ? 'checked' : '') + ' class="form-check-input">' +
            '</div><p class="mb-0">' + d.direccion + '</p>' +
            (d.es_principal ? '<small class="text-success">Principal</small>' : '') + '</div></div>';
    });
    const checkoutAddresses = document.getElementById('checkoutAddresses');
    if (checkoutAddresses) checkoutAddresses.innerHTML = html;
    const addressesList = document.getElementById('addressesList');
    if (addressesList) addressesList.innerHTML = html;
}

async function saveAddress() {
    const direccionInput = document.getElementById('newAddress');
    if (!direccionInput || !direccionInput.value) {
        showToastMessage('Ingrese una dirección', 'error');
        return;
    }
    const direccion = direccionInput.value;
    const principal = document.getElementById('newAddressPrincipal')?.checked || false;

    const result = await api.post('/direcciones', {
        direccion: direccion,
        es_principal: principal,
        cliente_ci: currentUser?.cliente?.ci || currentUser?.id
    });

    if (result.success) {
        // Cerrar modal de dirección
        const addressModal = document.getElementById('addressModal');
        if (addressModal) {
            try {
                const instance = bootstrap.Modal.getInstance(addressModal);
                if (instance) instance.hide();
            } catch(e) {
                // Ignorar
            }
        }
        if (direccionInput) direccionInput.value = '';
        loadAddresses();
    }
}

function showAddressModal() {
    const addressModal = document.getElementById('addressModal');
    if (addressModal) {
        new bootstrap.Modal(addressModal).show();
    }
}

function togglePaymentMethod() {
    const method = document.querySelector('input[name="payment"]:checked').value;
    const cardForm = document.getElementById('cardForm');
    if (cardForm) {
        cardForm.style.display = method === 'card' ? 'block' : 'none';
    }
}

async function processPayment() {
    const paymentMethodEl = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethodEl) {
        showToastMessage('Seleccione método de pago', 'error');
        return;
    }
    const paymentMethod = paymentMethodEl.value;

    const selectedAddress = document.querySelector('input[name="selectedAddress"]:checked');
    if (!selectedAddress) {
        showToastMessage('Seleccione una dirección de entrega', 'error');
        return;
    }

    const discount = await getUserDiscount();
    const total = cart.reduce(function(sum, item) {
        let price = item.precio;
        if (discount > 0) price = price * (1 - discount / 100);
        return sum + (price * item.cantidad);
    }, 0);

    if (paymentMethod === 'paypal') {
        // Try PayPal (usar siempre el flujo real)
        await processPayPalPayment(total);
    } else {
        // Tarjeta simulada
        showCardSimulation(total);
    }
}

function showCardSimulation(total) {
    showPaymentLoader('Procesando pago con tarjeta...');
    setTimeout(async function() {
        hidePaymentLoader();
        await confirmPaymentAndRedirect(total);
    }, 2000);
}

async function processPayPalPayment(total) {
    showPaymentLoader('Conectando con PayPal...');

    try {
        const response = await fetch(API_URL + '/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: total,
                description: 'Compra en Tienda Online'
            })
        });
        const result = await response.json();

        if (result.success && result.approveUrl) {
            localStorage.setItem('pendingOrderTotal', total.toString());
            window.location.href = result.approveUrl;
            return;
        }

        // Error del servidor
        hidePaymentLoader();
        showPaymentError(result.error || 'Error al conectar con PayPal');
    } catch (error) {
        hidePaymentLoader();
        showPaymentError('Error de conexión: ' + error.message);
    }
}

function showPayPalSimulation(total) {
    showPaymentLoader('Pago simulado...');
    setTimeout(async function() {
        hidePaymentLoader();
        await confirmPaymentAndRedirect(total);
    }, 2000);
}

async function confirmPayment(total) {
    const productos = cart.map(function(item) {
        return {
            codigo: item.codigo,
            precio: item.precio,
            cantidad: item.cantidad
        };
    });

    showPaymentLoader('Procesando...');

    const result = await api.post('/ventas', {
        cod_cliente: currentUser?.cliente?.ci || currentUser?.id,
        total: total,
        estado: 'pendiente',
        productos: productos
    });

    if (result.success) {
        cart = [];
        saveCart();
        updateCartCount();

        // Cerrar modal checkout
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            try { bootstrap.Modal.getInstance(checkoutModal).hide(); } catch(e) {}
        }

        hidePaymentLoader();
        showToastMessage('Pedido #' + (result.data?.nro || 'N/A') + ' creado', 'success');

        // Redirigir a pedidos
        showPage('orders');
        loadOrders();
    } else {
        hidePaymentLoader();
        showPaymentError(result.message || 'Error al procesar el pago');
    }
}

async function confirmPaymentAndRedirect(total) {
    // Validar que todos los productos tengan sucursal seleccionada
    const sinSucursal = cart.filter(function(item) { return !item.cod_sucursal; });
    if (sinSucursal.length > 0) {
        showPaymentError('Algunos productos no tienen sucursal seleccionada');
        return;
    }

    // Obtener la primera sucursal del carrito
    const primeraSucursal = cart[0]?.cod_sucursal;

    const productos = cart.map(function(item) {
        return {
            codigo: item.codigo,
            precio: item.precio,
            cantidad: item.cantidad
        };
    });

// Mostrar loader
    showPaymentLoader('Procesando pedido...');

    const result = await api.post('/ventas', {
        cod_cliente: currentUser?.cliente?.ci || currentUser?.id,
        total: total,
        estado: 'completado',
        cod_sucursal: primeraSucursal,
        productos: productos
    });

    if (result.success) {
        // Limpiar carrito
        cart = [];
        saveCart();
        updateCartCount();

        // Cerrar modal checkout
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            try { bootstrap.Modal.getInstance(checkoutModal).hide(); } catch(e) {}
        }

        hidePaymentLoader();
        showToastMessage('Pedido #' + (result.data?.nro || 'N/A') + ' creado correctamente', 'success');

        // Redirigir a pedidos Y cargar lista
        showPage('orders');
        loadOrders();
    } else {
        hidePaymentLoader();
        showPaymentError(result.message || 'Error al procesar el pago');
    }
}

function closeSuccess() {
    // Cerrar modal success si existe
    const successModal = document.getElementById('successModal');
    if (successModal) {
        try { bootstrap.Modal.getInstance(successModal).hide(); } catch(e) {}
    }
    // Redirigir a pedidos y cargar lista
    showPage('orders');
    loadOrders();
}

async function loadProfile() {
    if (!currentUser) return;
    const nombreEl = document.getElementById('profileNombre');
    const emailEl = document.getElementById('profileEmail');
    const telefonoEl = document.getElementById('profileTelefono');
    const direccionEl = document.getElementById('profileDireccion');

    if (nombreEl) nombreEl.value = currentUser.cliente?.nombre || currentUser.email.split('@')[0];
    if (emailEl) emailEl.value = currentUser.email || '';
    if (telefonoEl) telefonoEl.value = currentUser.cliente?.numero_telefono || '';
    if (direccionEl) direccionEl.value = currentUser.cliente?.direccion || '';
}

function editProfile() {
    alert('Funcionalidad de edición - Coming soon');
}

async function loadOrders() {
    const orders = await api.get('/ventas?cliente=' + (currentUser?.cliente?.ci || currentUser?.id));
    let html = '';
    if (orders.length === 0) {
        html = '<p class="text-muted">No tienes pedidos</p>';
    }
    orders.forEach(function(o) {
        html += '<div class="order-card"><div class="order-header"><div><strong>Pedido #' + o.nro + '</strong><div class="text-muted">' + new Date(o.fecha_hora).toLocaleDateString() + '</div></div><span class="badge-success">' + o.estado + '</span></div>' +
            '<div class="d-flex justify-content-between"><span>Total:</span><strong>Bs ' + new Intl.NumberFormat('es-BO').format(o.total) + '</strong></div></div>';
    });
    document.getElementById('ordersList').innerHTML = html;
}

async function loadPlans() {
    const planes = await api.get('/planes');
    const clienteId = currentUser?.cliente?.ci || currentUser?.id;
    const suscripciones = await api.get('/suscripciones?cliente_ci=' + clienteId);
    const activeSub = suscripciones.find(function(s) { return s.estado === 'activa'; });

    // Yo calculo los días restantes de la suscripción activa
    let diasRestantes = 0;
    let currentPlanDiscount = 0;
    if (activeSub) {
        const fechaFin = new Date(activeSub.fecha_fin);
        const fechaActual = new Date();
        diasRestantes = Math.max(0, Math.ceil((fechaFin - fechaActual) / (1000 * 60 * 60 * 24)));

        // Yo determino el descuento según el nombre del plan en la BD
        const planName = (activeSub.plan_nombre || '').toLowerCase();
        if (planName.includes('premium')) {
            currentPlanDiscount = 20;
        } else if (planName.includes('basic')) {
            currentPlanDiscount = 5;
        }
    }

    // Yo renderizo los planes de suscripción con su información
    let html = '';
    planes.forEach(function(p) {
        // Yo normalizo el nombre del plan a minúsculas para comparar
        const planName = (p.nombre || '').toLowerCase();
        const hasPlan = activeSub && activeSub.plan_id === p.id;

        // Yo determino el tipo de plan según el nombre en la BD
        const isPremium = planName.includes('premium');
        const isBasic = planName.includes('basic');
        const isFree = planName.includes('free') || p.precio === 0;

        // Yo configuro el estilo visual según el tipo de plan
        let cardClass = 'border-secondary';
        let badge = '';
        let btnClass = 'btn-primary';
        let beneficios = '';
        let btnText = 'Suscribirse';

        if (isFree) {
            // Yo configuro el estilo para plan gratuito
            cardClass = 'border-success';
            badge = '<span class="badge bg-success">0% dto</span>';
            btnClass = 'btn-success';
            beneficios = '<ul class="text-start small text-muted"><li>Acceso básico</li><li>Sin descuento</li></ul>';
            btnText = 'Activar Gratis';
        } else if (isPremium) {
            // Yo configuro el estilo para plan premium (20% descuento)
            cardClass = 'border-warning';
            badge = '<span class="badge bg-warning text-dark">20% dto</span>';
            btnClass = 'btn-warning text-dark';
            beneficios = '<ul class="text-start small text-muted"><li>20% descuento</li><li>Acceso prioritario</li><li>Soporte exclusivo</li></ul>';
            btnText = 'Suscribirse';
        } else if (isBasic) {
            // Yo configuro el estilo para plan basic (5% descuento)
            cardClass = 'border-info';
            badge = '<span class="badge bg-info">5% dto</span>';
            btnClass = 'btn-info text-dark';
            beneficios = '<ul class="text-start small text-muted"><li>5% descuento</li></ul>';
            btnText = 'Suscribirse';
        }

        // Yo construyo el HTML de la card del plan
        // Uso el nombre original (planName) para enviar al backend
        html += '<div class="col-md-6 mb-3">' +
            '<div class="card h-100 p-4 text-center ' + (hasPlan ? 'border-success' : cardClass) + '">' +
            badge +
            '<h4 class="mt-2">' + p.nombre + '</h4>' +
            '<p class="text-muted small">' + (p.descripcion || 'Plan de suscripción') + '</p>' +
            beneficios +
            '<div style="font-size:1.8rem;font-weight:700;">' + (p.precio === 0 ? 'GRATIS' : 'Bs ' + p.precio) + '</div>' +
            '<small class="text-muted">' + (p.duracion_dias ? 'Válido por ' + p.duracion_dias + ' días' : '') + '</small>' +
            '<div class="mt-3">' +
            (hasPlan ? '<button class="btn btn-success w-100" disabled><i class="bi bi-check-circle"></i> Plan Activo</button>' :
            '<button class="btn ' + btnClass + ' w-100" onclick="subscribe(\'' + planName + '\', ' + p.precio + ')">' +
            '<i class="bi bi-credit-card"></i> ' + btnText + '</button>') +
            '</div></div></div>';
    });
    const plansListEl = document.getElementById('plansList');
    if (plansListEl) plansListEl.innerHTML = html;

    // Mostrar suscripción actual con días restantes
    const currentSubEl = document.getElementById('currentSubscription');
    if (currentSubEl) {
        if (activeSub) {
            currentSubEl.innerHTML =
                '<div class="card border-success p-4">' +
                '<div class="d-flex justify-content-between align-items-center">' +
                '<div>' +
                '<h5 class="text-success"><i class="bi bi-check-circle-fill"></i> Plan activo: ' + activeSub.plan_nombre + '</h5>' +
                '<p class="mb-0"><strong>Descuento: </strong>' + currentPlanDiscount + '%</p>' +
                '</div>' +
                '<div class="text-end">' +
                '<small class="text-muted">Desde:</small>' +
                '<div>' + new Date(activeSub.fecha_inicio).toLocaleDateString() + '</div>' +
                '<small class="text-muted">Hasta:</small>' +
                '<div>' + new Date(activeSub.fecha_fin).toLocaleDateString() + '</div>' +
                (diasRestantes > 0 ? '<div class="badge bg-success mt-2">' + diasRestantes + ' días restantes</div>' : '') +
                '</div></div></div>';
        } else {
            currentSubEl.innerHTML =
                '<div class="alert alert-info p-4">' +
                '<h5><i class="bi bi-info-circle"></i> Sin suscripción activa</h5>' +
                '<p class="mb-0">¡Suscríbete para obtener descuentos en todas tus compras!</p></div>';
        }
    }
}

async function subscribe(planNombre, precio) {
    // Yo recibo el nombre del plan desde el botón (free, basic, premium)
    if (!currentUser) {
        showPaymentError('Debe iniciar sesión');
        return;
    }

    if (!planNombre) {
        showPaymentError('Plan no válido');
        return;
    }

    // Yo normalizo el nombre del plan a minúsculas
    planNombre = planNombre.toLowerCase();
    console.log("Yo envío el plan:", planNombre);

    // Yo muestro el loader mientras proceso
    showPaymentLoader('Procesando...');

    // Yo obtengo el ID del cliente del usuario actual
    const clienteCi = currentUser?.cliente?.ci || currentUser?.id;

    try {
        // Yo llamo al backend para crear la suscripción
        const response = await fetch(API_URL + '/paypal/crear-suscripcion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: planNombre, cliente_ci: clienteCi })
        });

        hidePaymentLoader();

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Yo manejé el error HTTP:", errorData);
            showPaymentError(errorData.message || 'Error en suscripción');
            return;
        }

        const result = await response.json();
        console.log("Yo recibí la respuesta:", result);

        // Yo verifico si es un plan gratuito (se activa sin PayPal)
        if (result.tipo === 'gratis') {
            showToastMessage('¡Plan gratuito activado!', 'success');
            showPage('subscription');
            loadPlans();
            loadUserDiscount();
            return;
        }

        // Yo verifico si es un plan de pago (basic o premium)
        // Si tiene approveUrl,redirijo a PayPal para completar el pago
        if (result.success && result.approveUrl) {
            // Yo guardo la información del plan pendiente en localStorage
            localStorage.setItem('pendingSubscription', JSON.stringify({
                plan: planNombre,
                precio: precio
            }));
            // Yo redirijo al usuario a PayPal
            window.location.href = result.approveUrl;
        } else {
            // Yo muestro el error si algo falla
            showPaymentError(result.message || 'Error al procesar');
        }
    } catch (error) {
        hidePaymentLoader();
        console.error("Yo atrapé un error:", error);
        showPaymentError('Error de conexión');
    }
}
        if (result.tipo === 'gratis') {
            showToastMessage('¡Plan gratuito activado!', 'success');
            showPage('subscription');
            loadPlans();
            loadUserDiscount();
            return;
        }

        // Planes de pago - redirigir a PayPal
        if (result.success && result.approveUrl) {
            localStorage.setItem('pendingSubscription', JSON.stringify({
                plan: planNombre,
                precio: precio
            }));
            window.location.href = result.approveUrl;
        } else {
            showPaymentError(result.message || 'Error al procesar');
        }
    } catch (error) {
        hidePaymentLoader();
        console.error("Error:", error);
        showPaymentError('Error de conexión');
    }
}
        } else {
            showPaymentError(result.message || result.error || 'Error al procesar');
        }
    } catch (error) {
        hidePaymentLoader();
        console.error("Error:", error);
        showPaymentError('Error de conexión');
    }
}

// Procesar suscripción luego de completar pago en PayPal
async function processPendingSubscription() {
    const pendingData = localStorage.getItem('pendingSubscription');
    if (!pendingData) return;

    const data = JSON.parse(pendingData);
    localStorage.removeItem('pendingSubscription');

    // Validar que usuario esté logueado
    if (!currentUser) {
        showPaymentError('Debe iniciar sesión');
        return;
    }

    try {
        // Crear suscripción en la base de datos
        const result = await api.post('/suscripciones', {
            plan_id: data.planId,
            cliente_ci: currentUser?.cliente?.ci || currentUser?.id
        });

        if (result.success) {
            // Redirigir a página de suscripción
            showPage('subscription');
            loadPlans();

            // Mostrar mensaje de éxito
            const currentSubEl = document.getElementById('currentSubscription');
            if (currentSubEl) {
                currentSubEl.innerHTML =
                    '<div class="alert alert-success p-4">' +
                    '<h5><i class="bi bi-check-circle-fill"></i> ¡Suscripción activada!</h5>' +
                    '<p class="mb-0">Tu suscripción ha sido activada correctamente.</p></div>';
            }
        } else {
            showPaymentError(result.message || 'Error al activar suscripción');
        }
    } catch (error) {
        showPaymentError('Error al activar suscripción: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('carrito');
    window.location.href = '../login.html';
}

// Cargar sucursales para el cliente - versión interactiva
async function loadSucursales() {
    const container = document.getElementById('sucursalesGrid');
    if (!container) return;
    
    // Mostrar estado de carga
    container.innerHTML = '<div class="col-12 text-center"><span class="spinner-border"></span> Cargando sucursales...</div>';
    
    try {
        const sucursales = await api.get('/sucursales');
        
        if (!sucursales || sucursales.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">No hay sucursales disponibles</p></div>';
            return;
        }
        
        // Generar HTML con datos de sucursales
        let html = '';
        for (const s of sucursales) {
            const stockTotal = s.stock_total || 0;
            html += '<div class="col-md-6 mb-4">' +
                '<div class="card h-100 sucursal-card" style="cursor:pointer;" onclick="loadProductosSucursal(' + s.cod + ', \'' + s.nombre + '\')">' +
                '<div class="card-body">' +
                '<h5 class="card-title"><i class="bi bi-shop-window"></i> ' + s.nombre + '</h5>' +
                '<p class="card-text"><i class="bi bi-geo-alt"></i> ' + (s.direccion || 'Sin dirección') + '</p>' +
                '<p class="card-text"><i class="bi bi-phone"></i> ' + (s.numero_telefono || 'Sin teléfono') + '</p>' +
                '<p class="card-text"><span class="badge ' + (stockTotal > 0 ? 'bg-success' : 'bg-secondary') + '">Stock total: ' + stockTotal + '</span></p>' +
                '<p class="text-primary small"><i class="bi bi-hand-index"></i> Click para ver productos</p>' +
                '</div></div></div>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading sucursales:', error);
        container.innerHTML = '<div class="col-12 text-danger">Error al cargar sucursales</div>';
    }
}

// Cargar productos de una sucursal específica
// Mejora: mostrar todos los productos (con stock y sin stock), botón comprar solo si hay stock
async function loadProductosSucursal(sucursalCod, sucursalNombre) {
    const container = document.getElementById('sucursalesGrid');
    if (!container) return;

    // Mostrar botón de volver y estado de carga
    container.innerHTML = '<div class="col-12 mb-3">' +
        '<button class="btn btn-outline-secondary" onclick="loadSucursales()"><i class="bi bi-arrow-left"></i> Volver a sucursales</button>' +
        '<h4 class="d-inline-block ms-3">Productos en: ' + sucursalNombre + '</h4></div>' +
        '<div class="col-12 text-center"><span class="spinner-border"></span> Cargando productos...</div>';

    try {
        // Obtener detalle de la sucursal (todos los productos)
        const detalle = await api.get('/sucursales/' + sucursalCod + '/detalle');

        // Obtener información de productos
        const todosProductos = await api.get('/productos');

        // Crear mapa de productos por código
        const productosMap = {};
        todosProductos.forEach(function(p) { productosMap[p.codigo] = p; });

        // Si no hay detalle, mostrar mensaje
        if (!detalle || detalle.length === 0) {
            container.innerHTML = '<div class="col-12 mb-3">' +
                '<button class="btn btn-outline-secondary" onclick="loadSucursales()"><i class="bi bi-arrow-left"></i> Volver a sucursales</button>' +
                '<h4 class="d-inline-block ms-3">Productos en: ' + sucursalNombre + '</h4></div>' +
                '<div class="col-12"><p class="text-muted">No hay productos disponibles en esta sucursal</p></div>';
            return;
        }

        // Generar cards de productos (incluye los sin stock)
        let html = '';
        detalle.forEach(function(dp) {
            const producto = productosMap[dp.cod_producto] || {};
            const imgUrl = getImageUrl(producto.imagen, 'medium');
            const nombre = producto.nombre || 'Producto ' + dp.cod_producto;
            const precio = producto.precio || 0;
            const stock = dp.stock || 0;
            const hasStock = stock > 0;

            // Estilo según stock
            const stockBadge = hasStock ?
                '<span class="badge bg-success">Stock: ' + stock + '</span>' :
                '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> AGOTADO</span>';

            const btnDisabled = hasStock ?
                '<button class="btn btn-primary btn-sm w-100" onclick="agregarDesdeSucursal(' + dp.cod_producto + ', ' + sucursalCod + ', ' + stock + ')">' +
                '<i class="bi bi-cart-plus"></i> Añadir al carrito</button>' :
                '<button class="btn btn-secondary btn-sm w-100" disabled>' +
                '<i class="bi bi-cart-x"></i> No disponible</button>';

            html += '<div class="col-md-4 col-lg-3 mb-4">' +
                '<div class="card h-100 product-card ' + (hasStock ? '' : 'opacity-75') + '">' +
                '<img src="' + imgUrl + '" class="card-img-top" style="height:150px;object-fit:contain;padding:10px;" alt="' + nombre + '">' +
                '<div class="card-body">' +
                '<h6 class="card-title" style="font-size:0.9rem;">' + nombre + '</h6>' +
                '<p class="card-text text-success fw-bold">Bs ' + new Intl.NumberFormat('es-BO').format(precio) + '</p>' +
                '<p class="card-text">' + stockBadge + '</p>' +
                '<div class="mt-2">' + btnDisabled + '</div>' +
                '</div></div></div>';
        });

        container.innerHTML = '<div class="col-12 mb-3">' +
            '<button class="btn btn-outline-secondary" onclick="loadSucursales()"><i class="bi bi-arrow-left"></i> Volver a sucursales</button>' +
            '<h4 class="d-inline-block ms-3">Productos en: ' + sucursalNombre + '</h4></div>' +
            '<div class="row">' + html + '</div>';

    } catch (error) {
        console.error('Error loading productos:', error);
        container.innerHTML = '<div class="col-12 mb-3">' +
            '<button class="btn btn-outline-secondary" onclick="loadSucursales()"><i class="bi bi-arrow-left"></i> Volver a sucursales</button></div>' +
            '<div class="col-12 text-danger">Error al cargar productos</div>';
    }
}

// Función para agregar producto directamente desde la vista de sucursal
function agregarDesdeSucursal(codProducto, sucursalCod, stockMax) {
    // Buscar producto en la lista de productos
    api.get('/productos/' + codProducto).then(function(producto) {
        if (!producto) {
            alert('Producto no encontrado');
            return;
        }

        // Verificar stock actual
        if (stockMax <= 0) {
            alert('Producto agotado');
            return;
        }

        // Solicitar cantidad
        const cantidad = parseInt(prompt('Cantidad (stock disponible: ' + stockMax + '):', '1'));
        if (!cantidad || cantidad < 1) return;
        if (cantidad > stockMax) {
            alert('Cantidad excede stock disponible. Máximo: ' + stockMax);
            return;
        }

        // Agregar al carrito con la sucursal
        addToCart(producto, cantidad, sucursalCod);
    });
}

document.addEventListener('DOMContentLoaded', init);
cart = JSON.parse(localStorage.getItem('carrito') || '[]');