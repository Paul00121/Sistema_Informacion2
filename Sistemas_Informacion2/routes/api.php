<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\PayPalController;
use Illuminate\Support\Facades\Route;

// Rutas públicas
Route::post('/login', [ApiController::class, 'login']);
Route::post('/login-social', [ApiController::class, 'loginSocial']);
Route::post('/registrar', [ApiController::class, 'registrar']);
Route::post('/recuperar', [ApiController::class, 'recuperar']);

// Productos público
Route::get('/productos', [ApiController::class, 'productos']);
Route::get('/productos/{codigo}', [ApiController::class, 'productoPorCodigo']);

// Categorías
Route::get('/categorias', [ApiController::class, 'categorias']);
Route::get('/categorias/{cod}', [ApiController::class, 'categoriaPorCodigo']);

// Marcas
Route::get('/marcas', [ApiController::class, 'marcas']);
Route::get('/marcas/{cod}', [ApiController::class, 'marcaPorCodigo']);
Route::get('/marcas-por-categoria/{categoria}', [ApiController::class, 'marcasPorCategoria']);

// Industrias
Route::get('/industrias', [ApiController::class, 'industrias']);
Route::get('/industrias/{cod}', [ApiController::class, 'industriaPorCodigo']);

// Clientes
Route::get('/clientes', [ApiController::class, 'clientes']);
Route::get('/clientes/{ci}', [ApiController::class, 'clientePorCi']);

// Usuarios
Route::get('/usuarios', [ApiController::class, 'usuarios']);
Route::get('/usuarios/{id}', [ApiController::class, 'usuarioPorId']);
Route::get('/roles', [ApiController::class, 'roles']);

// Ventas
Route::get('/ventas', [ApiController::class, 'ventas']);
Route::get('/ventas/total', [ApiController::class, 'totalVentas']);
Route::get('/ventas/ingresos', [ApiController::class, 'totalIngresos']);
Route::get('/ventas/completadas', [ApiController::class, 'ventasCompletadas']);
Route::get('/ingresos-completados', [ApiController::class, 'ingresosCompletados']);
Route::get('/ventas/{nro}/detalle', [ApiController::class, 'detalleVenta'])
    ->where('nro', '[0-9]+');
Route::get('/ventas/{nro}/pagos', [ApiController::class, 'pagosPorVenta'])
    ->where('nro', '[0-9]+');
Route::get('/ventas/{nro}', [ApiController::class, 'ventaPorNro'])
    ->where('nro', '[0-9]+');
Route::delete('/ventas/{nro}', [ApiController::class, 'eliminarVenta'])
    ->where('nro', '[0-9]+');

// Reportes
Route::get('/reportes/ventas-categoria', [ApiController::class, 'reportesVentasCategoria']);
Route::get('/reportes/ventas-mensuales', [ApiController::class, 'reportesVentasMensuales']);
Route::get('/reportes/productos-marca', [ApiController::class, 'reportesProductosMarca']);
Route::get('/reportes/productos-industria', [ApiController::class, 'reportesProductosIndustria']);
Route::get('/reportes/ventas-fecha', [ApiController::class, 'reportesVentasFecha']);

// Carrito
Route::post('/carrito/agregar', [ApiController::class, 'agregarCarrito']);

// Ventas crear
Route::post('/ventas', [ApiController::class, 'crearVenta']);

// Rutas protegidas (requieren autenticación)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/usuario', [ApiController::class, 'usuario']);
    Route::post('/logout', [ApiController::class, 'logout']);
    Route::get('/mis-pedidos', [ApiController::class, 'misPedidos']);
});

// CRUD Productos (Admin)
Route::post('/productos', [ApiController::class, 'crearProducto']);
Route::put('/productos/{codigo}', [ApiController::class, 'actualizarProducto']);
Route::delete('/productos/{codigo}', [ApiController::class, 'eliminarProducto']);

// Imágenes de Productos (Admin)
Route::get('/productos/{producto_cod}/imagenes', [ApiController::class, 'imagenesPorProducto']);
Route::post('/productos/imagenes', [ApiController::class, 'agregarImagen']);
Route::delete('/productos/imagenes/{id}', [ApiController::class, 'eliminarImagen']);

// CRUD Categorías (Admin)
Route::post('/categorias', [ApiController::class, 'crearCategoria']);
Route::put('/categorias/{cod}', [ApiController::class, 'actualizarCategoria']);
Route::delete('/categorias/{cod}', [ApiController::class, 'eliminarCategoria']);

// CRUD Marcas (Admin)
Route::post('/marcas', [ApiController::class, 'crearMarca']);
Route::put('/marcas/{cod}', [ApiController::class, 'actualizarMarca']);
Route::delete('/marcas/{cod}', [ApiController::class, 'eliminarMarca']);

// CRUD Industrias (Admin)
Route::post('/industrias', [ApiController::class, 'crearIndustria']);
Route::put('/industrias/{cod}', [ApiController::class, 'actualizarIndustria']);
Route::delete('/industrias/{cod}', [ApiController::class, 'eliminarIndustria']);

// CRUD Clientes (Admin)
Route::post('/clientes', [ApiController::class, 'crearCliente']);
Route::put('/clientes/{ci}', [ApiController::class, 'actualizarCliente']);
Route::delete('/clientes/{ci}', [ApiController::class, 'eliminarCliente']);

// CRUD Usuarios (Admin)
Route::post('/usuarios', [ApiController::class, 'crearUsuario']);
Route::put('/usuarios/{id}', [ApiController::class, 'actualizarUsuario']);
Route::delete('/usuarios/{id}', [ApiController::class, 'eliminarUsuario']);

// Direcciones
Route::get('/direcciones', [ApiController::class, 'direcciones']);
Route::post('/direcciones', [ApiController::class, 'crearDireccion']);
Route::delete('/direcciones/{id}', [ApiController::class, 'eliminarDireccion']);

// Planes
Route::get('/planes', [ApiController::class, 'planes']);

// Suscripciones
Route::get('/suscripciones', [ApiController::class, 'suscripciones']);
Route::post('/suscripciones', [ApiController::class, 'crearSuscripcion']);

// PayPal
Route::post('/paypal/create-order', [PayPalController::class, 'createOrder']);

// Sucursales
Route::get('/sucursales', [ApiController::class, 'sucursales']);
Route::get('/sucursales/{cod}', [ApiController::class, 'sucursalPorCodigo']);
Route::get('/sucursales/{cod}/detalle', [ApiController::class, 'detalleSucursal']);
Route::get('/sucursales/producto/{producto_cod}', [ApiController::class, 'sucursalesPorProducto']);
Route::post('/sucursales', [ApiController::class, 'crearSucursal']);
Route::put('/sucursales/{cod}', [ApiController::class, 'actualizarSucursal']);
Route::delete('/sucursales/{cod}', [ApiController::class, 'eliminarSucursal']);
Route::post('/paypal/capture-order', [PayPalController::class, 'captureOrder']);
Route::post('/paypal/crear-suscripcion', [PayPalController::class, 'crearSuscripcion']);