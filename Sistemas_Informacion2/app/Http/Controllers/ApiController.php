<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiController extends Controller
{
    // LOGIN
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $usuario = DB::table('usuarios')
            ->where('email', $request->email)
            ->first();

        if (! $usuario || ! Hash::check($request->password, $usuario->password)) {
            return response()->json(['success' => false, 'message' => 'Email o contraseña incorrectos'], 401);
        }

        if (! $usuario->email_verified) {
            return response()->json(['success' => false, 'message' => 'Por favor verifica tu correo electrónico'], 401);
        }

        $token = Str::random(60);
        DB::table('usuarios')->where('id', $usuario->id)->update(['remember_token' => $token]);

        $cliente = DB::table('clientes')->where('usuario_id', $usuario->id)->first();

        return response()->json([
            'success' => true,
            'message' => 'Login exitoso',
            'data' => ['id' => $usuario->id, 'email' => $usuario->email, 'rol' => $usuario->rol_id, 'token' => $token, 'cliente' => $cliente],
        ]);
    }

    // REGISTRAR
    public function registrar(Request $request)
    {
        $request->validate([
            'ci' => 'required|unique:clientes,ci',
            'nombre' => 'required',
            'apellido_paterno' => 'required',
            'correo' => 'required|email|unique:usuarios,email',
            'password' => 'required|min:6',
        ]);

        $token = Str::random(32);
        $password = Hash::make($request->password);

        $usuarioId = DB::table('usuarios')->insertGetId([
            'email' => $request->correo,
            'password' => $password,
            'rol_id' => 2,
            'email_verified' => true,
            'token_verificacion' => null,
            'created_at' => now(),
        ]);

        DB::table('clientes')->insert([
            'ci' => $request->ci,
            'nombre' => $request->nombre,
            'apellido_paterno' => $request->apellido_paterno,
            'apellido_materno' => $request->apellido_materno ?? '',
            'correo' => $request->correo,
            'direccion' => $request->direccion ?? '',
            'numero_telefono' => $request->telefono ?? 0,
            'usuario_id' => $usuarioId,
        ]);

        return response()->json(['success' => true, 'message' => 'Registro exitoso']);
    }

    // PRODUCTOS
    public function productos(Request $request)
    {
        $query = DB::table('productos as p')
            ->select('p.codigo', 'p.nombre', 'p.descripcion', 'p.precio', 'p.estado', 'p.serie',
                'p.cod_marca', 'p.cod_categoria', 'p.cod_industria',
                'm.nombre as marca_nombre', 'i.nombre as industria_nombre', 'c.nombre as categoria_nombre')
            ->leftJoin('marcas as m', 'p.cod_marca', '=', 'm.cod')
            ->leftJoin('industrias as i', 'p.cod_industria', '=', 'i.cod')
            ->leftJoin('categorias as c', 'p.cod_categoria', '=', 'c.cod');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('p.nombre', 'ilike', '%'.$request->search.'%')
                    ->orWhere('p.descripcion', 'ilike', '%'.$request->search.'%');
            });
        }

        if ($request->limit) {
            $query->limit($request->limit);
        }

        $productos = $query->orderBy('p.codigo', 'asc')->get();

        // Agregar imagen a cada producto (busca principal, si no hay toma la primera disponible)
        foreach ($productos as $producto) {
            // Primero buscar imagen principal
            $imagen = DB::table('imagenes_producto')
                ->where('producto_cod', $producto->codigo)
                ->where('es_principal', true)
                ->first();

            // Si no hay principal, tomar cualquier imagen del producto
            if (!$imagen) {
                $imagen = DB::table('imagenes_producto')
                    ->where('producto_cod', $producto->codigo)
                    ->first();
            }

            // Usar la URL directa si existe, no buscar de nuevo
            if ($imagen && isset($imagen->url)) {
                $producto->imagen = $imagen->url;
            } else {
                $producto->imagen = null;
            }
        }

        return response()->json(['success' => true, 'data' => $productos]);
    }

    public function productoPorCodigo($codigo)
    {
        $producto = DB::table('productos as p')
            ->select('p.codigo', 'p.nombre', 'p.descripcion', 'p.precio', 'p.estado', 'p.serie',
                'p.cod_marca', 'p.cod_categoria', 'p.cod_industria',
                'm.nombre as marca_nombre', 'i.nombre as industria_nombre', 'c.nombre as categoria_nombre')
            ->leftJoin('marcas as m', 'p.cod_marca', '=', 'm.cod')
            ->leftJoin('industrias as i', 'p.cod_industria', '=', 'i.cod')
            ->leftJoin('categorias as c', 'p.cod_categoria', '=', 'c.cod')
            ->where('p.codigo', $codigo)
            ->first();

        if (!$producto) {
            return response()->json(['success' => false, 'message' => 'Producto no encontrado'], 404);
        }

        // Obtener imagen principal del producto
        $imagen = DB::table('imagenes_producto')
            ->where('producto_cod', $producto->codigo)
            ->where('es_principal', true)
            ->first();

        if (!$imagen) {
            $imagen = DB::table('imagenes_producto')
                ->where('producto_cod', $producto->codigo)
                ->first();
        }

        $producto->imagen = ($imagen && isset($imagen->url)) ? $imagen->url : null;

        return response()->json(['success' => true, 'data' => $producto]);
    }

    public function crearProducto(Request $request)
    {
        $request->validate([
            'nombre' => 'required',
            'precio' => 'required|numeric',
            'cod_marca' => 'required|integer',
            'cod_categoria' => 'required|integer',
            'cod_industria' => 'required|integer',
        ]);

        $codigo = DB::table('productos')->max('codigo') ?? 0;
        $codigo++;

        DB::table('productos')->insert([
            'codigo' => $codigo,
            'nombre' => $request->nombre,
            'descripcion' => $request->descripcion ?? '',
            'precio' => floatval($request->precio),
            'serie' => $request->serie ?? '',
            'estado' => $request->estado ?? 'activo',
            'cod_marca' => intval($request->cod_marca),
            'cod_categoria' => intval($request->cod_categoria),
            'cod_industria' => intval($request->cod_industria),
        ]);

        return response()->json(['success' => true, 'message' => 'Producto creado', 'data' => ['codigo' => $codigo]]);
    }

    public function actualizarProducto(Request $request, $codigo)
    {
        $request->validate([
            'nombre' => 'required',
            'precio' => 'required|numeric',
        ]);

        DB::table('productos')->where('codigo', $codigo)->update([
            'nombre' => $request->nombre,
            'descripcion' => $request->descripcion ?? '',
            'precio' => floatval($request->precio),
            'serie' => $request->serie ?? '',
            'estado' => $request->estado ?? 'activo',
            'cod_marca' => intval($request->cod_marca ?? 1),
            'cod_categoria' => intval($request->cod_categoria ?? 1),
            'cod_industria' => intval($request->cod_industria ?? 1),
        ]);

        return response()->json(['success' => true, 'message' => 'Producto actualizado']);
    }

    public function eliminarProducto($codigo)
    {
        DB::table('productos')->where('codigo', $codigo)->delete();
        return response()->json(['success' => true, 'message' => 'Producto eliminado']);
    }

    // GESTIÓN DE IMÁGENES DE PRODUCTOS
    // Obtiene todas las imágenes de un producto específico
    public function imagenesPorProducto($producto_cod)
    {
        $imagenes = DB::table('imagenes_producto')
            ->where('producto_cod', $producto_cod)
            ->orderBy('es_principal', 'desc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $imagenes]);
    }

    // Agrega una nueva imagen a un producto (solo archivo)
    public function agregarImagen(Request $request)
    {
        // Validar que llegue el código del producto
        $request->validate([
            'producto_cod' => 'required|integer',
        ]);

        // Validar que llegue el archivo
        if (!$request->hasFile('imagen')) {
            return response()->json(['success' => false, 'message' => 'No se recibió ninguna imagen'], 400);
        }

        $archivo = $request->file('imagen');
        
        // Validar que sea un archivo válido
        if (!$archivo->isValid()) {
            return response()->json(['success' => false, 'message' => 'Archivo corrupto'], 400);
        }

        // Validar extensión
        $extensionesPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $extension = strtolower($archivo->getClientOriginalExtension());
        if (!in_array($extension, $extensionesPermitidas)) {
            return response()->json(['success' => false, 'message' => 'Extensión no permitida'], 400);
        }
        
        // Crear directorio si no existe
        $directorio = public_path('uploads/productos');
        if (!file_exists($directorio)) {
            mkdir($directorio, 0755, true);
        }
        
        // Generar nombre único para evitar conflictos
        $nombre = time() . '_' . uniqid() . '.' . $extension;
        
        // Mover archivo al directorio
        try {
            $archivo->move($directorio, $nombre);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error al guardar archivo'], 500);
        }
        
        // Ruta relativa para guardar en BD y acceder desde navegador
        $url = '/uploads/productos/' . $nombre;

        // Si es principal, quitar principal anterior
        if ($request->es_principal) {
            DB::table('imagenes_producto')
                ->where('producto_cod', $request->producto_cod)
                ->update(['es_principal' => false]);
        }

        // Guardar en BD
        $id = DB::table('imagenes_producto')->insertGetId([
            'producto_cod' => intval($request->producto_cod),
            'url' => $url,
            'es_principal' => $request->es_principal ?? false,
        ]);

        return response()->json(['success' => true, 'message' => 'Imagen agregada', 'data' => ['id' => $id, 'url' => $url]]);
    }

    // Elimina una imagen específica
    public function eliminarImagen($id)
    {
        DB::table('imagenes_producto')->where('id', $id)->delete();
        return response()->json(['success' => true, 'message' => 'Imagen eliminada']);
    }

    // CATEGORÍAS
    public function categorias(Request $request)
    {
        $query = DB::table('categorias as c')
            ->select('c.cod', 'c.nombre', DB::raw('(SELECT COUNT(*) FROM productos p WHERE p.cod_categoria = c.cod) as productos_count'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre'])) {
            $query->where("c.{$campo}", 'ilike', '%'.$request->search.'%');
        }

        $categorias = $query->orderBy('c.cod', 'asc')->get();

        return response()->json(['success' => true, 'data' => $categorias]);
    }

    public function categoriaPorCodigo($cod)
    {
        $categoria = DB::table('categorias')->where('cod', $cod)->first();
        return response()->json(['success' => true, 'data' => $categoria]);
    }

    public function crearCategoria(Request $request)
    {
        $request->validate(['nombre' => 'required']);
        $cod = DB::table('categorias')->max('cod') ?? 0;
        $cod++;
        DB::table('categorias')->insert(['cod' => $cod, 'nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Categoría creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarCategoria(Request $request, $cod)
    {
        DB::table('categorias')->where('cod', $cod)->update(['nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Categoría actualizada']);
    }

    public function eliminarCategoria($cod)
    {
        DB::table('categorias')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Categoría eliminada']);
    }

    // MARCAS
    public function marcas(Request $request)
    {
        $query = DB::table('marcas as m')
            ->select('m.cod', 'm.nombre', DB::raw('(SELECT COUNT(*) FROM productos p WHERE p.cod_marca = m.cod) as productos_count'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre'])) {
            $query->where("m.{$campo}", 'ilike', '%'.$request->search.'%');
        }

        $marcas = $query->orderBy('m.cod', 'asc')->get();

        return response()->json(['success' => true, 'data' => $marcas]);
    }

    public function marcaPorCodigo($cod)
    {
        $marca = DB::table('marcas')->where('cod', $cod)->first();
        return response()->json(['success' => true, 'data' => $marca]);
    }

    public function crearMarca(Request $request)
    {
        $request->validate(['nombre' => 'required']);
        $cod = DB::table('marcas')->max('cod') ?? 0;
        $cod++;
        DB::table('marcas')->insert(['cod' => $cod, 'nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Marca creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarMarca(Request $request, $cod)
    {
        DB::table('marcas')->where('cod', $cod)->update(['nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Marca actualizada']);
    }

    public function eliminarMarca($cod)
    {
        DB::table('marcas')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Marca eliminada']);
    }

    // INDUSTRIAS
    public function industrias(Request $request)
    {
        $query = DB::table('industrias as i')
            ->select('i.cod', 'i.nombre', DB::raw('(SELECT COUNT(*) FROM productos p WHERE p.cod_industria = i.cod) as productos_count'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre'])) {
            $query->where("i.{$campo}", 'ilike', '%'.$request->search.'%');
        }

        $industrias = $query->orderBy('i.cod', 'asc')->get();

        return response()->json(['success' => true, 'data' => $industrias]);
    }

    public function industriaPorCodigo($cod)
    {
        $industria = DB::table('industrias')->where('cod', $cod)->first();
        return response()->json(['success' => true, 'data' => $industria]);
    }

    public function crearIndustria(Request $request)
    {
        $request->validate(['nombre' => 'required']);
        $cod = DB::table('industrias')->max('cod') ?? 0;
        $cod++;
        DB::table('industrias')->insert(['cod' => $cod, 'nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Industria creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarIndustria(Request $request, $cod)
    {
        DB::table('industrias')->where('cod', $cod)->update(['nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Industria actualizada']);
    }

    public function eliminarIndustria($cod)
    {
        DB::table('industrias')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Industria eliminada']);
    }

    // CLIENTES
    public function clientes(Request $request)
    {
        $query = DB::table('clientes as c')
            ->select('c.ci', 'c.nombre', 'c.apellido_paterno', 'c.apellido_materno', 'c.correo', 'c.direccion', 'c.numero_telefono', 'u.rol_id')
            ->leftJoin('usuarios as u', 'c.usuario_id', '=', 'u.id');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('c.nombre', 'ilike', '%'.$request->search.'%')
                    ->orWhere('c.ci', 'ilike', '%'.$request->search.'%')
                    ->orWhere('c.correo', 'ilike', '%'.$request->search.'%');
            });
        }

        $clientes = $query->orderBy('c.ci', 'asc')->get();

        return response()->json(['success' => true, 'data' => $clientes]);
    }

    public function clientePorCi($ci)
    {
        $cliente = DB::table('clientes as c')
            ->select('c.ci', 'c.nombre', 'c.apellido_paterno', 'c.apellido_materno', 'c.correo', 'c.direccion', 'c.numero_telefono')
            ->where('c.ci', $ci)
            ->first();

        if (!$cliente) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $cliente]);
    }

    public function crearCliente(Request $request)
    {
        $request->validate([
            'ci' => 'required|unique:clientes,ci',
            'nombre' => 'required',
            'apellido_paterno' => 'required',
            'correo' => 'required|email',
        ]);

        DB::table('clientes')->insert([
            'ci' => $request->ci,
            'nombre' => $request->nombre,
            'apellido_paterno' => $request->apellido_paterno,
            'apellido_materno' => $request->apellido_materno ?? '',
            'correo' => $request->correo,
            'direccion' => $request->direccion ?? '',
            'numero_telefono' => $request->numero_telefono ?? 0,
        ]);

        return response()->json(['success' => true, 'message' => 'Cliente creado']);
    }

    public function actualizarCliente(Request $request, $ci)
    {
        DB::table('clientes')->where('ci', $ci)->update([
            'nombre' => $request->nombre,
            'apellido_paterno' => $request->apellido_paterno,
            'apellido_materno' => $request->apellido_materno ?? '',
            'correo' => $request->correo,
            'direccion' => $request->direccion ?? '',
            'numero_telefono' => $request->numero_telefono ?? 0,
        ]);

        return response()->json(['success' => true, 'message' => 'Cliente actualizado']);
    }

    public function eliminarCliente($ci)
    {
        DB::table('clientes')->where('ci', $ci)->delete();
        return response()->json(['success' => true, 'message' => 'Cliente eliminado']);
    }

    // USUARIOS
    public function usuarios()
    {
        $usuarios = DB::table('usuarios as u')
            ->select('u.id', 'u.email', 'u.rol_id', 'u.email_verified', 'u.created_at', 'r.nombre as rol_nombre')
            ->leftJoin('roles as r', 'u.rol_id', '=', 'r.cod')
            ->orderBy('u.id', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $usuarios]);
    }

    public function usuarioPorId($id)
    {
        $usuario = DB::table('usuarios')->where('id', $id)->first();
        if (!$usuario) {
            return response()->json(['success' => false, 'message' => 'Usuario no encontrado'], 404);
        }
        return response()->json(['success' => true, 'data' => $usuario]);
    }

    public function roles()
    {
        $roles = DB::table('roles')->orderBy('cod')->get();
        return response()->json(['success' => true, 'data' => $roles]);
    }

    public function crearUsuario(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:usuarios,email',
            'password' => 'required|min:6',
            'rol_id' => 'required|integer',
        ]);

        $id = DB::table('usuarios')->insertGetId([
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'rol_id' => intval($request->rol_id),
            'email_verified' => true,
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Usuario creado', 'data' => ['id' => $id]]);
    }

    public function actualizarUsuario(Request $request, $id)
    {
        $data = [];
        if ($request->email) $data['email'] = $request->email;
        if ($request->rol_id) $data['rol_id'] = intval($request->rol_id);
        if ($request->password) $data['password'] = Hash::make($request->password);

        if (!empty($data)) {
            DB::table('usuarios')->where('id', $id)->update($data);
        }

        return response()->json(['success' => true, 'message' => 'Usuario actualizado']);
    }

    public function eliminarUsuario($id)
    {
        DB::table('usuarios')->where('id', $id)->delete();
        return response()->json(['success' => true, 'message' => 'Usuario eliminado']);
    }

    // VENTAS
    public function ventas(Request $request)
    {
        $query = DB::table('ventas as v')
            ->select('v.nro', 'v.fecha_hora', 'v.total', 'v.estado', 'c.nombre as cliente')
            ->leftJoin('clientes as c', 'v.cod_cliente', '=', 'c.ci');

        $campo = $request->campo ?: 'nro';
        if ($request->search) {
            if ($campo === 'nro') {
                $query->where('v.nro', 'ilike', '%'.$request->search.'%');
            } elseif ($campo === 'cliente') {
                $query->where('c.nombre', 'ilike', '%'.$request->search.'%');
            } elseif ($campo === 'estado') {
                $query->where('v.estado', 'ilike', '%'.$request->search.'%');
            } else {
                $query->where(function ($q) use ($request) {
                    $q->where('v.nro', 'ilike', '%'.$request->search.'%')
                        ->orWhere('c.nombre', 'ilike', '%'.$request->search.'%')
                        ->orWhere('v.estado', 'ilike', '%'.$request->search.'%');
                });
            }
        }

        if ($request->limit) {
            $query->limit($request->limit);
        }

        $ventas = $query->orderBy('v.nro', 'asc')->get();

        return response()->json(['success' => true, 'data' => $ventas]);
    }

    public function ventaPorNro($nro)
    {
        $venta = DB::table('ventas as v')
            ->select('v.nro', 'v.fecha_hora', 'v.total', 'v.estado', 'c.nombre as cliente')
            ->leftJoin('clientes as c', 'v.cod_cliente', '=', 'c.ci')
            ->where('v.nro', $nro)
            ->first();

        return response()->json(['success' => true, 'data' => $venta]);
    }

    public function detalleVenta($nro)
    {
        $detalle = DB::table('detalle_ventas as dv')
            ->select('dv.*', 'p.nombre as producto_nombre')
            ->leftJoin('productos as p', 'dv.cod_producto', '=', 'p.codigo')
            ->where('dv.nro_venta', $nro)
            ->get();

        return response()->json(['success' => true, 'data' => $detalle]);
    }

    public function pagosPorVenta($nro)
    {
        $pagos = DB::table('pagos as pg')
            ->select('pg.*', 'mp.nombre as metodo_nombre')
            ->leftJoin('metodos_pago as mp', 'pg.metodo_pago_id', '=', 'mp.id')
            ->where('pg.venta_nro', $nro)
            ->get();

        $paypal = DB::table('paypal_transacciones')
            ->where('pago_id', function($q) use ($nro) {
                $q->select('id')->from('pagos')->where('venta_nro', $nro)->limit(1);
            })
            ->first();

        return response()->json(['success' => true, 'pagos' => $pagos, 'paypal' => $paypal]);
    }

    public function eliminarVenta($nro)
    {
        DB::table('detalle_ventas')->where('nro_venta', $nro)->delete();
        DB::table('pagos')->where('venta_nro', $nro)->delete();
        DB::table('ventas')->where('nro', $nro)->delete();
        return response()->json(['success' => true, 'message' => 'Venta eliminada']);
    }

    public function totalVentas()
    {
        $total = DB::table('ventas')
            ->whereIn('estado', ['completado', 'pagado', 'captured'])
            ->count();

        return response()->json(['success' => true, 'total' => $total]);
    }

    public function totalIngresos()
    {
        $total = DB::table('ventas')
            ->whereIn('estado', ['completado', 'pagado', 'captured'])
            ->sum('total');

        return response()->json(['success' => true, 'total' => $total]);
    }

    public function crearVenta(Request $request)
    {
        // Validar que vengan productos del carrito
        $request->validate([
            'cod_cliente' => 'required',
            'total' => 'required|numeric',
            'productos' => 'required|array|min:1',
            'cod_sucursal' => 'required|integer',
        ]);

        $productos = $request->productos;
        $cod_sucursal = $request->cod_sucursal;

        if (empty($productos) || !is_array($productos)) {
            return response()->json(['success' => false, 'message' => 'El carrito está vacío'], 400);
        }

        // Usar transacción para asegurar consistencia
        try {
            DB::beginTransaction();

            // Verificar stock disponible en la sucursal
            foreach ($productos as $producto) {
                $cod_producto = $producto['codigo'];
                $cantidad = $producto['cantidad'] ?? 1;

                $stockActual = DB::table('detalle_sucursal')
                    ->where('cod_sucursal', $cod_sucursal)
                    ->where('cod_producto', $cod_producto)
                    ->value('stock');

                if (!$stockActual || $stockActual < $cantidad) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false, 
                        'message' => "Stock insuficiente para producto {$cod_producto}. Disponible: " . ($stockActual ?? 0)
                    ], 400);
                }
            }

            // Descontar stock por cada producto
            foreach ($productos as $producto) {
                $cod_producto = $producto['codigo'];
                $cantidad = $producto['cantidad'] ?? 1;

                DB::table('detalle_sucursal')
                    ->where('cod_sucursal', $cod_sucursal)
                    ->where('cod_producto', $cod_producto)
                    ->decrement('stock', $cantidad);
            }

            $nro = DB::table('ventas')->max('nro') ?? 0;
            $nro++;

            // Insertar venta principal (incluye cod_sucursal)
            DB::table('ventas')->insert([
                'nro' => $nro,
                'fecha_hora' => now(),
                'cod_cliente' => $request->cod_cliente,
                'total' => floatval($request->total),
                'estado' => $request->estado ?? 'pendiente',
                'cod_sucursal' => $cod_sucursal,
            ]);

            // Insertar detalle de cada producto
            $item = 1;
            foreach ($productos as $producto) {
                $cantidad = $producto['cantidad'] ?? 1;
                $precio = $producto['precio'] ?? 0;
                
                DB::table('detalle_ventas')->insert([
                    'nro_venta' => $nro,
                    'cod_producto' => $producto['codigo'],
                    'item' => $item++,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precio,
                    'subtotal' => $precio * $cantidad,
                ]);
            }

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Venta creada', 'data' => ['nro' => $nro]]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Error al crear venta: ' . $e->getMessage()], 500);
        }
    }

    // REPORTES
    public function reportesVentasCategoria()
    {
        $data = DB::table('ventas as v')
            ->select('c.nombre as categoria', DB::raw('COUNT(v.nro) as total'))
            ->leftJoin('detalle_ventas as dv', 'v.nro', '=', 'dv.nro_venta')
            ->leftJoin('productos as p', 'dv.cod_producto', '=', 'p.codigo')
            ->leftJoin('categorias as c', 'p.cod_categoria', '=', 'c.cod')
            ->groupBy('c.nombre')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesVentasMensuales()
    {
        $data = DB::table('ventas')
            ->select(DB::raw("TO_CHAR(fecha_hora, 'YYYY-MM') as mes"), DB::raw('SUM(total) as total'))
            ->groupBy(DB::raw("TO_CHAR(fecha_hora, 'YYYY-MM')"))
            ->orderByDesc('mes')
            ->limit(12)
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesProductosMarca()
    {
        $data = DB::table('productos as p')
            ->select('m.nombre as marca', DB::raw('COUNT(p.codigo) as total'))
            ->leftJoin('marcas as m', 'p.cod_marca', '=', 'm.cod')
            ->groupBy('m.nombre')
            ->orderByDesc('total')
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesProductosIndustria()
    {
        $data = DB::table('productos as p')
            ->select('i.nombre as industria', DB::raw('COUNT(p.codigo) as total'))
            ->leftJoin('industrias as i', 'p.cod_industria', '=', 'i.cod')
            ->groupBy('i.nombre')
            ->orderByDesc('total')
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesVentasFecha()
    {
        $data = DB::table('ventas')
            ->select(DB::raw('DATE(fecha_hora) as fecha'), DB::raw('COUNT(nro) as total'), DB::raw('SUM(total) as monto'))
            ->groupBy(DB::raw('DATE(fecha_hora)'))
            ->orderByDesc('fecha')
            ->limit(30)
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // CARRITO
    public function agregarCarrito(Request $request)
    {
        $request->validate(['producto_id' => 'required|integer']);
        $producto = DB::table('productos')->where('codigo', $request->producto_id)->first();

        if (!$producto) {
            return response()->json(['success' => false, 'message' => 'Producto no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $producto]);
    }

    // DIRECCIONES
    public function direcciones(Request $request)
    {
        $query = DB::table('direcciones')->orderBy('id', 'desc');
        if ($request->cliente_ci) {
            $query->where('cliente_ci', $request->cliente_ci);
        }
        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function crearDireccion(Request $request)
    {
        $request->validate(['direccion' => 'required']);
        $id = DB::table('direcciones')->insertGetId([
            'direccion' => $request->direccion,
            'cliente_ci' => $request->cliente_ci,
            'es_principal' => $request->es_principal ?? false,
        ]);
        return response()->json(['success' => true, 'data' => ['id' => $id]]);
    }

    public function eliminarDireccion($id)
    {
        DB::table('direcciones')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    // PLANES
    public function planes()
    {
        $planes = DB::table('planes')->orderBy('precio')->get();
        return response()->json(['success' => true, 'data' => $planes]);
    }

    // SUSCRIPCIONES
    public function suscripciones(Request $request)
    {
        $query = DB::table('suscripciones as s')
            ->select('s.*', 'p.nombre as plan_nombre', 'p.precio as plan_precio')
            ->leftJoin('planes as p', 's.plan_id', '=', 'p.id')
            ->orderBy('s.id', 'desc');
        if ($request->cliente_ci) {
            $query->where('s.cliente_ci', $request->cliente_ci);
        }
        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function crearSuscripcion(Request $request)
    {
        $request->validate(['plan_id' => 'required']);
        $plan = DB::table('planes')->where('id', $request->plan_id)->first();
        if (!$plan) {
            return response()->json(['success' => false, 'message' => 'Plan no encontrado'], 404);
        }
        $id = DB::table('suscripciones')->insertGetId([
            'cliente_ci' => $request->cliente_ci,
            'plan_id' => $request->plan_id,
            'estado' => 'activa',
            'fecha_inicio' => now(),
            'fecha_fin' => now()->addDays($plan->duracion_dias),
        ]);
        return response()->json(['success' => true, 'data' => ['id' => $id]]);
    }

    // SUCURSALES
    public function sucursales(Request $request)
    {
        $query = DB::table('sucursales as s')
            ->select('s.cod', 's.nombre', 's.direccion', 's.numero_telefono',
                DB::raw('(SELECT COUNT(*) FROM detalle_sucursal ds WHERE ds.cod_sucursal = s.cod) as productos_count'),
                DB::raw('COALESCE((SELECT SUM(stock) FROM detalle_sucursal ds WHERE ds.cod_sucursal = s.cod), 0) as stock_total'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre', 'direccion'])) {
            $query->where("s.{$campo}", 'ilike', '%'.$request->search.'%');
        }

        $sucursales = $query->orderBy('s.cod', 'asc')->get();

        return response()->json(['success' => true, 'data' => $sucursales]);
    }

    public function sucursalPorCodigo($cod)
    {
        $sucursal = DB::table('sucursales')->where('cod', $cod)->first();
        return response()->json(['success' => true, 'data' => $sucursal]);
    }

    // Obtiene sucursales con stock para un producto específico
    public function sucursalesPorProducto($producto_cod)
    {
        $sucursales = DB::table('sucursales as s')
            ->select('s.cod', 's.nombre', 's.direccion', 's.numero_telefono',
                DB::raw('COALESCE(ds.stock, 0) as stock'))
            ->leftJoin('detalle_sucursal as ds', function($join) use ($producto_cod) {
                $join->on('ds.cod_sucursal', '=', 's.cod')
                    ->where('ds.cod_producto', '=', $producto_cod);
            })
            ->orderBy('s.cod', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $sucursales]);
    }

    public function detalleSucursal($cod)
    {
        $detalle = DB::table('detalle_sucursal as ds')
            ->select('ds.*', 'p.nombre as producto_nombre', 'p.precio as producto_precio')
            ->leftJoin('productos as p', 'ds.cod_producto', '=', 'p.codigo')
            ->where('ds.cod_sucursal', $cod)
            ->get();

        return response()->json(['success' => true, 'data' => $detalle]);
    }

    public function crearSucursal(Request $request)
    {
        $request->validate(['nombre' => 'required', 'direccion' => 'required']);

        $cod = DB::table('sucursales')->max('cod') ?? 0;
        $cod++;

        DB::table('sucursales')->insert([
            'cod' => $cod,
            'nombre' => $request->nombre,
            'direccion' => $request->direccion,
            'numero_telefono' => $request->numero_telefono ?? 0,
        ]);

        return response()->json(['success' => true, 'message' => 'Sucursal creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarSucursal(Request $request, $cod)
    {
        $request->validate(['nombre' => 'required']);

        DB::table('sucursales')->where('cod', $cod)->update([
            'nombre' => $request->nombre,
            'direccion' => $request->direccion ?? '',
            'numero_telefono' => $request->numero_telefono ?? 0,
        ]);

        return response()->json(['success' => true, 'message' => 'Sucursal actualizada']);
    }

    public function eliminarSucursal($cod)
    {
        DB::table('sucursales')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Sucursal eliminada']);
    }

    // VENTAS COMPLETADAS (solo para dashboard)
    public function ventasCompletadas()
    {
        $total = DB::table('ventas')
            ->whereIn('estado', ['completado', 'pagado', 'captured'])
            ->count();

        return response()->json(['success' => true, 'total' => $total]);
    }

    public function ingresosCompletados()
    {
        $total = DB::table('ventas')
            ->whereIn('estado', ['completado', 'pagado', 'captured'])
            ->sum('total');

        return response()->json(['success' => true, 'total' => $total]);
    }
}