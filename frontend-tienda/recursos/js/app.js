// Configuración global

// Detectar si se ejecuta desde file:// o http://
const IS_FILE = window.location.protocol === 'file:';

// Configurar API_URL dinámico - siempre apunta a localhost:8090
const API_URL = 'http://localhost:8090/api';

// Advertencia solo en consola si está en modo file
if (IS_FILE) {
    console.warn('Modo file:// activo - el sistema funcionará correctamente conectándose a http://localhost:8090/api');
}
const APP_URL = 'http://localhost/frontend-tienda';

// Carrito en localStorage
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// Actualizar contador del carrito
function actualizarContadorCarrito() {
    const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
    const badge = document.getElementById('cantidad-carrito');
    if (badge) {
        badge.textContent = cantidad;
    }
}

// Agregar al carrito
function agregarAlCarrito(productoId, cantidad = 1) {
    const existente = carrito.find(item => item.producto_id === productoId);
    
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            producto_id: productoId,
            cantidad: cantidad
        });
    }
    
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    
    // Mostrar notificación
    mostrarNotificacion('Producto agregado al carrito', 'success');
}

// Eliminar del carrito
function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item.producto_id !== productoId);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    actualizarTablaCarrito();
}

// Actualizar cantidad
function actualizarCantidad(productoId, cantidad) {
    const item = carrito.find(item => item.producto_id === productoId);
    if (item) {
        if (cantidad <= 0) {
            eliminarDelCarrito(productoId);
        } else {
            item.cantidad = cantidad;
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarContadorCarrito();
            actualizarTablaCarrito();
        }
    }
}

// Vaciar carrito
function vaciarCarrito() {
    carrito = [];
    localStorage.removeItem('carrito');
    actualizarContadorCarrito();
    window.location.reload();
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${mensaje}</div>
            <button type="button" class="btn-close btn-close-white me-auto m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    setTimeout(() => toast.remove(), 3000);
}

// Funciones API
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    actualizarContadorCarrito();
    
    // Event listeners para botones de agregar al carrito
    document.querySelectorAll('.agregar-carrito').forEach(btn => {
        btn.addEventListener('click', function() {
            const productoId = this.dataset.id;
            agregarAlCarrito(productoId);
        });
    });
});