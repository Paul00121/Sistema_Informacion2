<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\PayPalController;
use Illuminate\Support\Facades\Route;

// ============================================================
//  AUTH PÚBLICO
// ============================================================
Route::post('/login', [ApiController::class, 'login']);
Route::post('/register', [ApiController::class, 'register']);
Route::post('/login-social', [ApiController::class, 'loginSocial']);
Route::post('/registrar', [ApiController::class, 'registrar']);
Route::post('/recuperar', [ApiController::class, 'recuperar']);
Route::post('/google/callback', [ApiController::class, 'googleCallback']);

// ============================================================
//  PRODUCTOS – lectura pública
// ============================================================
Route::get('/productos', [ApiController::class, 'productos']);
Route::get('/productos/{codigo}', [ApiController::class, 'productoPorCodigo']);
Route::get('/productos/{producto_cod}/imagenes', [ApiController::class, 'imagenesPorProducto']);

// ============================================================
//  CATÁLOGOS – lectura pública
// ============================================================
Route::get('/categorias', [ApiController::class, 'categorias']);
Route::get('/categorias/{cod}', [ApiController::class, 'categoriaPorCodigo']);
Route::get('/marcas', [ApiController::class, 'marcas']);
Route::get('/marcas/{cod}', [ApiController::class, 'marcaPorCodigo']);
Route::get('/marcas-por-categoria/{categoria}', [ApiController::class, 'marcasPorCategoria']);
Route::get('/industrias', [ApiController::class, 'industrias']);
Route::get('/industrias/{cod}', [ApiController::class, 'industriaPorCodigo']);
Route::get('/clientes', [ApiController::class, 'clientes']);
Route::get('/clientes/{ci}', [ApiController::class, 'clientePorCi']);
Route::get('/usuarios', [ApiController::class, 'usuarios']);
Route::get('/usuarios/{id}', [ApiController::class, 'usuarioPorId']);
Route::get('/roles', [ApiController::class, 'roles']);

// ============================================================
//  VENTAS – lectura pública
// ============================================================
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

// ============================================================
//  CARRITO
// ============================================================
Route::post('/carrito/agregar', [ApiController::class, 'agregarCarrito']);

// ============================================================
//  CARRITO
// ============================================================
Route::post('/carrito/agregar', [ApiController::class, 'agregarCarrito']);

// ============================================================
//  VENTAS – crear
// ============================================================
Route::post('/ventas', [ApiController::class, 'crearVenta']);

// ============================================================
//  DIRECCIONES (público)
// ============================================================
Route::get('/direcciones', [ApiController::class, 'direcciones']);
Route::post('/direcciones', [ApiController::class, 'crearDireccion']);

// ============================================================
//  PLANES Y SUSCRIPCIONES
// ============================================================
Route::get('/planes', [ApiController::class, 'planes']);
Route::get('/suscripciones', [ApiController::class, 'suscripciones']);
Route::post('/suscripciones', [ApiController::class, 'crearSuscripcion']);

// ============================================================
//  SUCURSALES – lectura pública
// ============================================================
Route::get('/sucursales', [ApiController::class, 'sucursales']);
Route::get('/sucursales/{cod}', [ApiController::class, 'sucursalPorCodigo']);
Route::get('/sucursales/{cod}/detalle', [ApiController::class, 'detalleSucursal']);
Route::get('/sucursales/producto/{producto_cod}', [ApiController::class, 'sucursalesPorProducto']);

// ============================================================
//  PAYPAL
// ============================================================
Route::post('/paypal/create-order', [PayPalController::class, 'createOrder']);
Route::post('/paypal/capture-order', [PayPalController::class, 'captureOrder']);
Route::post('/paypal/crear-suscripcion', [PayPalController::class, 'crearSuscripcion']);
Route::post('/paypal/webhook', [ApiController::class, 'paypalWebhook']);

// ============================================================
//  RUTAS PROTEGIDAS (auth:sanctum)
// ============================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/usuario', [ApiController::class, 'usuario']);
    Route::post('/logout', [ApiController::class, 'logout']);
    Route::get('/mis-pedidos', [ApiController::class, 'misPedidos']);
    Route::post('/completar-perfil', [ApiController::class, 'completarPerfil']);

    // CRUD Productos (Admin)
    Route::post('/productos', [ApiController::class, 'crearProducto']);
    Route::put('/productos/{codigo}', [ApiController::class, 'actualizarProducto']);
    Route::delete('/productos/{codigo}', [ApiController::class, 'eliminarProducto']);
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

    // Direcciones (protegido)
    Route::delete('/direcciones/{id}', [ApiController::class, 'eliminarDireccion']);

    // CRUD Sucursales (Admin)
    Route::post('/sucursales', [ApiController::class, 'crearSucursal']);
    Route::put('/sucursales/{cod}', [ApiController::class, 'actualizarSucursal']);
    Route::delete('/sucursales/{cod}', [ApiController::class, 'eliminarSucursal']);

    // Eliminar venta (Admin)
    Route::delete('/ventas/{nro}', [ApiController::class, 'eliminarVenta'])
        ->where('nro', '[0-9]+');

    // Reportes (Admin)
    Route::get('/reportes/ventas-categoria', [ApiController::class, 'reportesVentasCategoria']);
    Route::get('/reportes/ventas-mensuales', [ApiController::class, 'reportesVentasMensuales']);
    Route::get('/reportes/productos-marca', [ApiController::class, 'reportesProductosMarca']);
    Route::get('/reportes/productos-industria', [ApiController::class, 'reportesProductosIndustria']);
    Route::get('/reportes/ventas-fecha', [ApiController::class, 'reportesVentasFecha']);
    Route::get('/top-clientes', [ApiController::class, 'topClientes']);
    Route::get('/top-clientes-5', [ApiController::class, 'topClientes5']);
    Route::get('/ventas-sucursal', [ApiController::class, 'ventasSucursal']);
    Route::get('/ventas-categoria', [ApiController::class, 'ventasCategoria']);
    Route::get('/ventas-mensuales', [ApiController::class, 'ventasMensuales']);
});
