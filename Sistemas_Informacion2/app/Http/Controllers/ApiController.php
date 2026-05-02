<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || (int)$user->rol_id !== 1) {
            abort(403, 'Acceso denegado: se requieren permisos de administrador');
        }
    }
    // ============================================================
    //  AUTH – LOGIN (Sanctum)
    // ============================================================
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $usuario = DB::table('usuarios')
            ->where('email', $request->email)
            ->first();

        if (!$usuario || !Hash::check($request->password, $usuario->password)) {
            return response()->json(['success' => false, 'message' => 'Email o contraseña incorrectos'], 401);
        }

        if (!$usuario->email_verified) {
            return response()->json(['success' => false, 'message' => 'Por favor verifica tu correo electrónico'], 401);
        }

        $user = User::find($usuario->id);
        $token = $user->createToken('auth-token')->plainTextToken;

        $cliente = DB::table('clientes')->where('usuario_id', $usuario->id)->first();

        return response()->json([
            'success' => true,
            'message' => 'Login exitoso',
            'token' => $token,
            'data' => [
                'id' => $usuario->id,
                'email' => $usuario->email,
                'rol' => $usuario->rol_id,
                'tipo_suscripcion' => $usuario->tipo_suscripcion ?? 'free',
                'cliente' => $cliente,
            ],
        ]);
    }

    // ============================================================
    //  AUTH – REGISTER (Sanctum)
    // ============================================================
    public function register(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'apellido_materno' => 'nullable|string|max:100',
            'email' => 'required|email|unique:usuarios,email',
            'password' => 'required|min:6',
            'tipo_usuario' => 'sometimes|string|in:cliente,admin',
            'tipo_suscripcion' => 'sometimes|string|in:free,basic,premium',
            'ci' => 'nullable|string|unique:clientes,ci',
            'telefono' => 'nullable|numeric',
            'direccion' => 'nullable|string',
        ]);

        $tipoUsuario = $request->tipo_usuario ?? 'cliente';
        $tipoSuscripcion = $request->tipo_suscripcion ?? 'free';
        $rolId = $tipoUsuario === 'admin' ? 1 : 2;

        $usuarioId = DB::table('usuarios')->insertGetId([
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'rol_id' => $rolId,
            'tipo_suscripcion' => $tipoSuscripcion,
            'email_verified' => true,
            'created_at' => now(),
        ]);

        $ci = $request->ci ?? 'CI' . $usuarioId;

        DB::table('clientes')->insert([
            'ci' => $ci,
            'nombre' => $request->nombre,
            'apellido_paterno' => $request->apellido_paterno,
            'apellido_materno' => $request->apellido_materno ?? '',
            'correo' => $request->email,
            'direccion' => $request->direccion ?? '',
            'numero_telefono' => $request->telefono ?? 0,
            'usuario_id' => $usuarioId,
        ]);

        $user = User::find($usuarioId);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registro exitoso',
            'token' => $token,
            'data' => [
                'id' => $usuarioId,
                'email' => $request->email,
                'rol' => $rolId,
                'tipo_suscripcion' => $tipoSuscripcion,
            ],
        ], 201);
    }

    // ============================================================
    //  AUTH – LOGIN SOCIAL
    // ============================================================
    public function loginSocial(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'nombre' => 'required',
            'google_id' => 'required',
        ]);

        $usuario = DB::table('usuarios')->where('email', $request->email)->first();

        if ($usuario) {
            DB::table('usuarios')->where('id', $usuario->id)->update([
                'google_id' => $request->google_id,
            ]);
            $user = User::find($usuario->id);
            $token = $user->createToken('auth-token')->plainTextToken;
            $cliente = DB::table('clientes')->where('usuario_id', $usuario->id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Login social exitoso',
                'token' => $token,
                'data' => [
                    'id' => $usuario->id,
                    'email' => $usuario->email,
                    'rol' => $usuario->rol_id,
                    'tipo_suscripcion' => $usuario->tipo_suscripcion ?? 'free',
                    'cliente' => $cliente,
                ],
            ]);
        }

        $usuarioId = DB::table('usuarios')->insertGetId([
            'email' => $request->email,
            'password' => Hash::make(Str::random(32)),
            'rol_id' => 2,
            'tipo_suscripcion' => 'free',
            'google_id' => $request->google_id,
            'email_verified' => true,
            'created_at' => now(),
        ]);

        $ci = 'GS_' . $usuarioId;
        DB::table('clientes')->insert([
            'ci' => $ci,
            'nombre' => $request->nombre,
            'apellido_paterno' => $request->apellido ?? '',
            'apellido_materno' => '',
            'correo' => $request->email,
            'direccion' => '',
            'numero_telefono' => 0,
            'usuario_id' => $usuarioId,
            'google_id' => $request->google_id,
        ]);

        $user = User::find($usuarioId);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registro social exitoso',
            'token' => $token,
            'data' => [
                'id' => $usuarioId,
                'email' => $request->email,
                'rol' => 2,
                'tipo_suscripcion' => 'free',
            ],
        ], 201);
    }

    // ============================================================
    //  AUTH – GOOGLE CALLBACK
    // ============================================================
    public function googleCallback(Request $request)
    {
        $request->validate([
            'credential' => 'required',
        ]);

        $client = new \Google_Client(['client_id' => env('GOOGLE_CLIENT_ID')]);
        $payload = $client->verifyIdToken($request->credential);

        if (!$payload) {
            return response()->json(['success' => false, 'message' => 'Token de Google inválido'], 401);
        }

        $googleId = $payload['sub'];
        $email = $payload['email'];
        $nombre = $payload['given_name'] ?? $payload['name'] ?? '';
        $apellido = $payload['family_name'] ?? '';

        $usuario = DB::table('usuarios')
            ->where(function ($q) use ($googleId, $email) {
                $q->where('google_id', $googleId)->orWhere('email', $email);
            })
            ->first();

        if ($usuario) {
            DB::table('usuarios')->where('id', $usuario->id)->update([
                'google_id' => $googleId,
            ]);
            $user = User::find($usuario->id);
            $token = $user->createToken('auth-token')->plainTextToken;
            $cliente = DB::table('clientes')->where('usuario_id', $usuario->id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Login con Google exitoso',
                'token' => $token,
                'data' => [
                    'id' => $usuario->id,
                    'email' => $usuario->email,
                    'rol' => $usuario->rol_id,
                    'tipo_suscripcion' => $usuario->tipo_suscripcion ?? 'free',
                    'cliente' => $cliente,
                ],
            ]);
        }

        $usuarioId = DB::table('usuarios')->insertGetId([
            'email' => $email,
            'password' => Hash::make(Str::random(32)),
            'rol_id' => 2,
            'tipo_suscripcion' => 'free',
            'google_id' => $googleId,
            'email_verified' => true,
            'created_at' => now(),
        ]);

        $ci = 'GGL_' . $usuarioId;
        DB::table('clientes')->insert([
            'ci' => $ci,
            'nombre' => $nombre,
            'apellido_paterno' => $apellido,
            'apellido_materno' => '',
            'correo' => $email,
            'direccion' => '',
            'numero_telefono' => 0,
            'usuario_id' => $usuarioId,
            'google_id' => $googleId,
        ]);

        $user = User::find($usuarioId);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registro con Google exitoso',
            'token' => $token,
            'data' => [
                'id' => $usuarioId,
                'email' => $email,
                'rol' => 2,
                'tipo_suscripcion' => 'free',
            ],
        ], 201);
    }

    // ============================================================
    //  AUTH – RECUPERAR CONTRASEÑA
    // ============================================================
    public function recuperar(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $usuario = DB::table('usuarios')->where('email', $request->email)->first();
        if (!$usuario) {
            return response()->json(['success' => false, 'message' => 'Email no registrado'], 404);
        }

        $token = Str::random(60);
        DB::table('password_resets')->insert([
            'email' => $request->email,
            'token' => $token,
            'created_at' => now(),
            'expires_at' => now()->addHours(1),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Token de recuperación generado',
            'reset_token' => $token,
        ]);
    }

    // ============================================================
    //  PERFIL – COMPLETAR PERFIL (auth required)
    // ============================================================
    public function completarPerfil(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
        }

        $request->validate([
            'direccion' => 'sometimes|string',
            'telefono' => 'sometimes|numeric',
            'nombre' => 'sometimes|string|max:100',
            'apellido_paterno' => 'sometimes|string|max:100',
            'apellido_materno' => 'sometimes|string|max:100',
        ]);

        $data = [];
        if ($request->has('direccion')) $data['direccion'] = $request->direccion;
        if ($request->has('telefono')) $data['numero_telefono'] = $request->telefono;
        if ($request->has('nombre')) $data['nombre'] = $request->nombre;
        if ($request->has('apellido_paterno')) $data['apellido_paterno'] = $request->apellido_paterno;
        if ($request->has('apellido_materno')) $data['apellido_materno'] = $request->apellido_materno;

        if (!empty($data)) {
            DB::table('clientes')->where('usuario_id', $user->id)->update($data);
        }

        return response()->json([
            'success' => true,
            'message' => 'Perfil actualizado',
            'data' => DB::table('clientes')->where('usuario_id', $user->id)->first(),
        ]);
    }

    // ============================================================
    //  PAYPAL – WEBHOOK (cambiar suscripción a premium)
    // ============================================================
    public function paypalWebhook(Request $request)
    {
        $eventType = $request->input('event_type');
        $resource = $request->input('resource', []);

        if ($eventType === 'PAYMENT.SALE.COMPLETED' || $eventType === 'CHECKOUT.ORDER.APPROVED') {
            $customId = $resource['custom_id'] ?? $request->input('custom_id');
            $planNombre = $resource['plan_id'] ?? 'premium';

            $plan = DB::table('planes')
                ->whereRaw('LOWER(nombre) = ?', [strtolower($planNombre)])
                ->orWhere('id', is_numeric($planNombre) ? (int)$planNombre : 0)
                ->first();

            if (!$plan) {
                $plan = DB::table('planes')->where('precio', '>', 0)->orderBy('precio')->first();
            }

            if ($customId) {
                $cliente = DB::table('clientes')->where('ci', $customId)->first();
                if ($cliente && $plan) {
                    DB::table('suscripciones')->insert([
                        'cliente_ci' => $cliente->ci,
                        'plan_id' => $plan->id,
                        'estado' => 'activa',
                        'fecha_inicio' => now(),
                        'fecha_fin' => now()->addDays($plan->duracion_dias ?? 30),
                    ]);

                    DB::table('usuarios')
                        ->where('id', $cliente->usuario_id)
                        ->update(['tipo_suscripcion' => 'premium']);
                }
            }

            return response()->json(['success' => true, 'message' => 'Webhook procesado']);
        }

        if ($eventType === 'PAYMENT.SALE.DENIED' || $eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
            $customId = $resource['custom_id'] ?? $request->input('custom_id');
            if ($customId) {
                DB::table('suscripciones')
                    ->where('cliente_ci', $customId)
                    ->where('estado', 'activa')
                    ->update(['estado' => 'cancelada']);

                $cliente = DB::table('clientes')->where('ci', $customId)->first();
                if ($cliente) {
                    DB::table('usuarios')
                        ->where('id', $cliente->usuario_id)
                        ->update(['tipo_suscripcion' => 'free']);
                }
            }

            return response()->json(['success' => true, 'message' => 'Suscripción cancelada']);
        }

        return response()->json(['success' => true, 'message' => 'Evento ignorado']);
    }

    // ============================================================
    //  REGISTRAR (legacy – mantiene compatibilidad)
    // ============================================================
    public function registrar(Request $request)
    {
        $request->validate([
            'ci' => 'required|unique:clientes,ci',
            'nombre' => 'required',
            'apellido_paterno' => 'required',
            'correo' => 'required|email|unique:usuarios,email',
            'password' => 'required|min:6',
        ]);

        $usuarioId = DB::table('usuarios')->insertGetId([
            'email' => $request->correo,
            'password' => Hash::make($request->password),
            'rol_id' => 2,
            'tipo_suscripcion' => 'free',
            'email_verified' => true,
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

        $user = User::find($usuarioId);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registro exitoso',
            'token' => $token,
        ]);
    }

    // ============================================================
    //  PRODUCTOS
    // ============================================================
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
                $q->where('p.nombre', 'ilike', '%' . $request->search . '%')
                    ->orWhere('p.descripcion', 'ilike', '%' . $request->search . '%');
            });
        }

        if ($request->categoria) {
            $query->where('p.cod_categoria', $request->categoria);
        }

        if ($request->busqueda) {
            $query->where(function ($q) use ($request) {
                $q->where('p.nombre', 'ilike', '%' . $request->busqueda . '%')
                    ->orWhere('p.descripcion', 'ilike', '%' . $request->busqueda . '%');
            });
        }

        if ($request->limit) {
            $query->limit((int)$request->limit);
        }

        $productos = $query->orderBy('p.codigo', 'asc')->get();

        foreach ($productos as $producto) {
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
        $this->authorizeAdmin($request);
        $request->validate([
            'nombre' => 'required',
            'precio' => 'required|numeric',
            'cod_marca' => 'required|integer',
            'cod_categoria' => 'required|integer',
            'cod_industria' => 'required|integer',
        ]);

        $codigo = (DB::table('productos')->max('codigo') ?? 0) + 1;

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
        $this->authorizeAdmin($request);
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

    public function eliminarProducto(Request $request, $codigo)
    {
        $this->authorizeAdmin($request);
        DB::table('productos')->where('codigo', $codigo)->delete();
        return response()->json(['success' => true, 'message' => 'Producto eliminado']);
    }

    // ============================================================
    //  IMÁGENES DE PRODUCTOS
    // ============================================================
    public function imagenesPorProducto($producto_cod)
    {
        $imagenes = DB::table('imagenes_producto')
            ->where('producto_cod', $producto_cod)
            ->orderBy('es_principal', 'desc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $imagenes]);
    }

    public function agregarImagen(Request $request)
    {
        $this->authorizeAdmin($request);
        $request->validate(['producto_cod' => 'required|integer']);

        if (!$request->hasFile('imagen')) {
            return response()->json(['success' => false, 'message' => 'No se recibió ninguna imagen'], 400);
        }

        $archivo = $request->file('imagen');

        if (!$archivo->isValid()) {
            return response()->json(['success' => false, 'message' => 'Archivo corrupto'], 400);
        }

        $extensionesPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $extension = strtolower($archivo->getClientOriginalExtension());
        if (!in_array($extension, $extensionesPermitidas)) {
            return response()->json(['success' => false, 'message' => 'Extensión no permitida'], 400);
        }

        $directorio = public_path('uploads/productos');
        if (!file_exists($directorio)) {
            mkdir($directorio, 0755, true);
        }

        $nombre = time() . '_' . uniqid() . '.' . $extension;

        try {
            $archivo->move($directorio, $nombre);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error al guardar archivo'], 500);
        }

        $url = '/uploads/productos/' . $nombre;

        if ($request->es_principal) {
            DB::table('imagenes_producto')
                ->where('producto_cod', $request->producto_cod)
                ->update(['es_principal' => false]);
        }

        DB::table('imagenes_producto')->insert([
            'producto_cod' => intval($request->producto_cod),
            'url' => $url,
            'es_principal' => $request->boolean('es_principal'),
        ]);

        return response()->json(['success' => true, 'message' => 'Imagen agregada']);
    }

    public function eliminarImagen(Request $request, $id)
    {
        $this->authorizeAdmin($request);
        DB::table('imagenes_producto')->where('id', $id)->delete();
        return response()->json(['success' => true, 'message' => 'Imagen eliminada']);
    }

    // ============================================================
    //  CATEGORÍAS
    // ============================================================
    public function categorias(Request $request)
    {
        $query = DB::table('categorias as c')
            ->select('c.cod', 'c.nombre',
                DB::raw('(SELECT COUNT(*) FROM productos p WHERE p.cod_categoria = c.cod) as productos_count'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre'])) {
            $query->where("c.{$campo}", 'ilike', '%' . $request->search . '%');
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('c.cod', 'asc')->get()]);
    }

    public function categoriaPorCodigo($cod)
    {
        return response()->json(['success' => true, 'data' => DB::table('categorias')->where('cod', $cod)->first()]);
    }

    public function crearCategoria(Request $request)
    {
        $this->authorizeAdmin($request);
        $request->validate(['nombre' => 'required']);
        $cod = (DB::table('categorias')->max('cod') ?? 0) + 1;
        DB::table('categorias')->insert(['cod' => $cod, 'nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Categoría creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarCategoria(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('categorias')->where('cod', $cod)->update(['nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Categoría actualizada']);
    }

    public function eliminarCategoria(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('categorias')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Categoría eliminada']);
    }

    // ============================================================
    //  MARCAS
    // ============================================================
    public function marcas(Request $request)
    {
        $query = DB::table('marcas as m')
            ->select('m.cod', 'm.nombre',
                DB::raw('(SELECT COUNT(*) FROM productos p WHERE p.cod_marca = m.cod) as productos_count'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre'])) {
            $query->where("m.{$campo}", 'ilike', '%' . $request->search . '%');
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('m.cod', 'asc')->get()]);
    }

    public function marcaPorCodigo($cod)
    {
        return response()->json(['success' => true, 'data' => DB::table('marcas')->where('cod', $cod)->first()]);
    }

    public function marcasPorCategoria($categoria)
    {
        $marcas = DB::table('marca_categoria')
            ->join('marcas', 'marca_categoria.cod_marca', '=', 'marcas.cod')
            ->where('marca_categoria.cod_categoria', $categoria)
            ->select('marcas.*')
            ->get();

        return response()->json(['success' => true, 'data' => $marcas]);
    }

    public function crearMarca(Request $request)
    {
        $this->authorizeAdmin($request);
        $request->validate(['nombre' => 'required']);
        $cod = (DB::table('marcas')->max('cod') ?? 0) + 1;
        DB::table('marcas')->insert(['cod' => $cod, 'nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Marca creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarMarca(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('marcas')->where('cod', $cod)->update(['nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Marca actualizada']);
    }

    public function eliminarMarca(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('marcas')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Marca eliminada']);
    }

    // ============================================================
    //  INDUSTRIAS
    // ============================================================
    public function industrias(Request $request)
    {
        $query = DB::table('industrias as i')
            ->select('i.cod', 'i.nombre',
                DB::raw('(SELECT COUNT(*) FROM productos p WHERE p.cod_industria = i.cod) as productos_count'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre'])) {
            $query->where("i.{$campo}", 'ilike', '%' . $request->search . '%');
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('i.cod', 'asc')->get()]);
    }

    public function industriaPorCodigo($cod)
    {
        return response()->json(['success' => true, 'data' => DB::table('industrias')->where('cod', $cod)->first()]);
    }

    public function crearIndustria(Request $request)
    {
        $this->authorizeAdmin($request);
        $request->validate(['nombre' => 'required']);
        $cod = (DB::table('industrias')->max('cod') ?? 0) + 1;
        DB::table('industrias')->insert(['cod' => $cod, 'nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Industria creada', 'data' => ['cod' => $cod]]);
    }

    public function actualizarIndustria(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('industrias')->where('cod', $cod)->update(['nombre' => $request->nombre]);
        return response()->json(['success' => true, 'message' => 'Industria actualizada']);
    }

    public function eliminarIndustria(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('industrias')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Industria eliminada']);
    }

    // ============================================================
    //  CLIENTES
    // ============================================================
    public function clientes(Request $request)
    {
        $query = DB::table('clientes as c')
            ->select('c.ci', 'c.nombre', 'c.apellido_paterno', 'c.apellido_materno', 'c.correo', 'c.direccion',
                'c.numero_telefono', 'u.rol_id')
            ->leftJoin('usuarios as u', 'c.usuario_id', '=', 'u.id');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('c.nombre', 'ilike', '%' . $request->search . '%')
                    ->orWhere('c.ci', 'ilike', '%' . $request->search . '%')
                    ->orWhere('c.correo', 'ilike', '%' . $request->search . '%');
            });
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('c.ci', 'asc')->get()]);
    }

    public function clientePorCi($ci)
    {
        $cliente = DB::table('clientes')->where('ci', $ci)->first();

        if (!$cliente) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $cliente]);
    }

    public function crearCliente(Request $request)
    {
        $this->authorizeAdmin($request);
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
        $this->authorizeAdmin($request);
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

    public function eliminarCliente(Request $request, $ci)
    {
        $this->authorizeAdmin($request);
        DB::table('clientes')->where('ci', $ci)->delete();
        return response()->json(['success' => true, 'message' => 'Cliente eliminado']);
    }

    // ============================================================
    //  USUARIOS
    // ============================================================
    public function usuarios()
    {
        $usuarios = DB::table('usuarios as u')
            ->select('u.id', 'u.email', 'u.rol_id', 'u.email_verified', 'u.tipo_suscripcion', 'u.created_at', 'r.nombre as rol_nombre')
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
        return response()->json(['success' => true, 'data' => DB::table('roles')->orderBy('cod')->get()]);
    }

    public function crearUsuario(Request $request)
    {
        $this->authorizeAdmin($request);
        $request->validate([
            'email' => 'required|email|unique:usuarios,email',
            'password' => 'required|min:6',
            'rol_id' => 'required|integer',
        ]);

        $id = DB::table('usuarios')->insertGetId([
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'rol_id' => intval($request->rol_id),
            'tipo_suscripcion' => 'free',
            'email_verified' => true,
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Usuario creado', 'data' => ['id' => $id]]);
    }

    public function actualizarUsuario(Request $request, $id)
    {
        $this->authorizeAdmin($request);
        $data = [];
        if ($request->email) $data['email'] = $request->email;
        if ($request->rol_id) $data['rol_id'] = intval($request->rol_id);
        if ($request->password) $data['password'] = Hash::make($request->password);

        if (!empty($data)) {
            DB::table('usuarios')->where('id', $id)->update($data);
        }

        return response()->json(['success' => true, 'message' => 'Usuario actualizado']);
    }

    public function eliminarUsuario(Request $request, $id)
    {
        $this->authorizeAdmin($request);
        DB::table('usuarios')->where('id', $id)->delete();
        return response()->json(['success' => true, 'message' => 'Usuario eliminado']);
    }

    // ============================================================
    //  VENTAS
    // ============================================================
    public function ventas(Request $request)
    {
        $query = DB::table('ventas as v')
            ->select('v.nro', 'v.fecha_hora', 'v.total', 'v.estado', 'c.nombre as cliente')
            ->leftJoin('clientes as c', 'v.cod_cliente', '=', 'c.ci');

        $campo = $request->campo ?: 'nro';
        if ($request->search) {
            if ($campo === 'nro') {
                $query->where('v.nro', 'ilike', '%' . $request->search . '%');
            } elseif ($campo === 'cliente') {
                $query->where('c.nombre', 'ilike', '%' . $request->search . '%');
            } elseif ($campo === 'estado') {
                $query->where('v.estado', 'ilike', '%' . $request->search . '%');
            } else {
                $query->where(function ($q) use ($request) {
                    $q->where('v.nro', 'ilike', '%' . $request->search . '%')
                        ->orWhere('c.nombre', 'ilike', '%' . $request->search . '%')
                        ->orWhere('v.estado', 'ilike', '%' . $request->search . '%');
                });
            }
        }

        if ($request->cliente) {
            $query->where('v.cod_cliente', $request->cliente);
        }

        if ($request->limit) {
            $query->limit((int)$request->limit);
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('v.nro', 'asc')->get()]);
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
            ->where('pago_id', function ($q) use ($nro) {
                $q->select('id')->from('pagos')->where('venta_nro', $nro)->limit(1);
            })
            ->first();

        return response()->json(['success' => true, 'pagos' => $pagos, 'paypal' => $paypal]);
    }

    public function eliminarVenta(Request $request, $nro)
    {
        $this->authorizeAdmin($request);
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
        $request->validate([
            'cod_cliente' => 'required',
            'total' => 'required|numeric',
            'productos' => 'required|array|min:1',
            'cod_sucursal' => 'required|integer',
        ]);

        $productos = $request->productos;
        $codSucursal = $request->cod_sucursal;

        if (empty($productos) || !is_array($productos)) {
            return response()->json(['success' => false, 'message' => 'El carrito está vacío'], 400);
        }

        try {
            DB::beginTransaction();

            foreach ($productos as $producto) {
                $codProducto = $producto['codigo'];
                $cantidad = $producto['cantidad'] ?? 1;

                $stockActual = DB::table('detalle_sucursal')
                    ->where('cod_sucursal', $codSucursal)
                    ->where('cod_producto', $codProducto)
                    ->value('stock');

                if (!$stockActual || $stockActual < $cantidad) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Stock insuficiente para producto {$codProducto}. Disponible: " . ($stockActual ?? 0),
                    ], 400);
                }
            }

            foreach ($productos as $producto) {
                DB::table('detalle_sucursal')
                    ->where('cod_sucursal', $codSucursal)
                    ->where('cod_producto', $producto['codigo'])
                    ->decrement('stock', $producto['cantidad'] ?? 1);
            }

            $nro = (DB::table('ventas')->max('nro') ?? 0) + 1;

            DB::table('ventas')->insert([
                'nro' => $nro,
                'fecha_hora' => now(),
                'cod_cliente' => $request->cod_cliente,
                'total' => floatval($request->total),
                'estado' => $request->estado ?? 'pendiente',
                'cod_sucursal' => $codSucursal,
            ]);

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

    // ============================================================
    //  REPORTES (legacy)
    // ============================================================
    public function reportesVentasCategoria(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('ventas as v')
                ->select(DB::raw("COALESCE(c.nombre, 'Sin categoría') as categoria"),
                    DB::raw('COUNT(v.nro) as total'))
                ->leftJoin('detalle_ventas as dv', 'v.nro', '=', 'dv.nro_venta')
                ->leftJoin('productos as p', 'dv.cod_producto', '=', 'p.codigo')
                ->leftJoin('categorias as c', 'p.cod_categoria', '=', 'c.cod')
                ->groupBy('c.nombre')
                ->orderByDesc('total')
                ->limit(10)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesVentasMensuales(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('ventas')
                ->select(DB::raw("COALESCE(TO_CHAR(fecha_hora, 'YYYY-MM'), 'Sin fecha') as mes"),
                    DB::raw('COALESCE(SUM(total), 0) as total'))
                ->groupBy(DB::raw("TO_CHAR(fecha_hora, 'YYYY-MM')"))
                ->orderBy('mes', 'desc')
                ->limit(12)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesProductosMarca(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('productos as p')
                ->select(DB::raw("COALESCE(m.nombre, 'Sin marca') as marca"),
                    DB::raw('COUNT(p.codigo) as total'))
                ->leftJoin('marcas as m', 'p.cod_marca', '=', 'm.cod')
                ->groupBy('m.nombre')
                ->orderByDesc('total')
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesProductosIndustria(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('productos as p')
                ->select(DB::raw("COALESCE(i.nombre, 'Sin industria') as industria"),
                    DB::raw('COUNT(p.codigo) as total'))
                ->leftJoin('industrias as i', 'p.cod_industria', '=', 'i.cod')
                ->groupBy('i.nombre')
                ->orderByDesc('total')
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function reportesVentasFecha(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('ventas')
                ->select(DB::raw('COALESCE(CAST(DATE(fecha_hora) AS TEXT), \'Sin fecha\') as fecha'),
                    DB::raw('COUNT(nro) as total'),
                    DB::raw('COALESCE(SUM(total), 0) as monto'))
                ->groupBy(DB::raw('DATE(fecha_hora)'))
                ->orderByDesc('fecha')
                ->limit(30)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    // ============================================================
    //  REPORTES NUEVOS (para Chart.js)
    // ============================================================
    public function topClientes(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('clientes as c')
                ->select('c.ci', 'c.nombre', 'c.apellido_paterno', 'c.correo',
                    DB::raw('COALESCE(COUNT(v.nro), 0) as total_compras'),
                    DB::raw('COALESCE(SUM(v.total), 0) as total_gastado'))
                ->leftJoin('ventas as v', 'c.ci', '=', 'v.cod_cliente')
                ->groupBy('c.ci', 'c.nombre', 'c.apellido_paterno', 'c.correo')
                ->orderByDesc('total_gastado')
                ->limit(10)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function topClientes5(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('clientes as c')
                ->select('c.ci', 'c.nombre', 'c.apellido_paterno',
                    DB::raw('COALESCE(COUNT(v.nro), 0) as total_compras'),
                    DB::raw('COALESCE(SUM(v.total), 0) as total_gastado'))
                ->leftJoin('ventas as v', 'c.ci', '=', 'v.cod_cliente')
                ->groupBy('c.ci', 'c.nombre', 'c.apellido_paterno', 'c.correo')
                ->orderByDesc('total_gastado')
                ->limit(5)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function ventasSucursal(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('sucursales as s')
                ->select('s.cod', 's.nombre',
                    DB::raw('COALESCE(COUNT(v.nro), 0) as total_ventas'),
                    DB::raw('COALESCE(SUM(v.total), 0) as total_ingresos'))
                ->leftJoin('ventas as v', 's.cod', '=', 'v.cod_sucursal')
                ->groupBy('s.cod', 's.nombre')
                ->orderByDesc('total_ventas')
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function ventasCategoria(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('ventas as v')
                ->select(DB::raw("COALESCE(c.nombre, 'Sin categoría') as categoria"),
                    DB::raw('COUNT(v.nro) as total_ventas'),
                    DB::raw('COALESCE(SUM(v.total), 0) as total_ingresos'))
                ->leftJoin('detalle_ventas as dv', 'v.nro', '=', 'dv.nro_venta')
                ->leftJoin('productos as p', 'dv.cod_producto', '=', 'p.codigo')
                ->leftJoin('categorias as c', 'p.cod_categoria', '=', 'c.cod')
                ->groupBy('c.nombre')
                ->orderByDesc('total_ventas')
                ->limit(10)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function ventasMensuales(Request $request)
    {
        $this->authorizeAdmin($request);
        try {
            $data = DB::table('ventas')
                ->select(DB::raw("COALESCE(TO_CHAR(fecha_hora, 'YYYY-MM'), 'Sin fecha') as mes"),
                    DB::raw('COUNT(nro) as total_ventas'),
                    DB::raw('COALESCE(SUM(total), 0) as total_ingresos'))
                ->groupBy(DB::raw("TO_CHAR(fecha_hora, 'YYYY-MM')"))
                ->orderBy('mes', 'asc')
                ->limit(12)
                ->get();
        } catch (\Exception $e) {
            $data = [];
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    // ============================================================
    //  CARRITO
    // ============================================================
    public function agregarCarrito(Request $request)
    {
        $request->validate(['producto_id' => 'required|integer']);

        $producto = DB::table('productos')->where('codigo', $request->producto_id)->first();

        if (!$producto) {
            return response()->json(['success' => false, 'message' => 'Producto no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $producto]);
    }

    // ============================================================
    //  DIRECCIONES
    // ============================================================
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
            'es_principal' => $request->boolean('es_principal'),
        ]);

        return response()->json(['success' => true, 'data' => ['id' => $id]]);
    }

    public function eliminarDireccion(Request $request, $id)
    {
        $this->authorizeAdmin($request);
        DB::table('direcciones')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    // ============================================================
    //  PLANES
    // ============================================================
    public function planes()
    {
        return response()->json(['success' => true, 'data' => DB::table('planes')->orderBy('precio')->get()]);
    }

    // ============================================================
    //  SUSCRIPCIONES
    // ============================================================
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

        if ($request->cliente_ci) {
            $cliente = DB::table('clientes')->where('ci', $request->cliente_ci)->first();
            if ($cliente) {
                $planNombre = strtolower($plan->nombre);
                $tipoSuscripcion = in_array($planNombre, ['free', 'basic', 'premium']) ? $planNombre : 'basic';
                DB::table('usuarios')
                    ->where('id', $cliente->usuario_id)
                    ->update(['tipo_suscripcion' => $tipoSuscripcion]);
            }
        }

        return response()->json(['success' => true, 'data' => ['id' => $id]]);
    }

    // ============================================================
    //  SUCURSALES
    // ============================================================
    public function sucursales(Request $request)
    {
        $query = DB::table('sucursales as s')
            ->select('s.cod', 's.nombre', 's.direccion', 's.numero_telefono',
                DB::raw('(SELECT COUNT(*) FROM detalle_sucursal ds WHERE ds.cod_sucursal = s.cod) as productos_count'),
                DB::raw('COALESCE((SELECT SUM(stock) FROM detalle_sucursal ds WHERE ds.cod_sucursal = s.cod), 0) as stock_total'));

        $campo = $request->campo ?: 'nombre';
        if ($request->search && in_array($campo, ['cod', 'nombre', 'direccion'])) {
            $query->where("s.{$campo}", 'ilike', '%' . $request->search . '%');
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('s.cod', 'asc')->get()]);
    }

    public function sucursalPorCodigo($cod)
    {
        return response()->json(['success' => true, 'data' => DB::table('sucursales')->where('cod', $cod)->first()]);
    }

    public function sucursalesPorProducto($productoCod)
    {
        $sucursales = DB::table('sucursales as s')
            ->select('s.cod', 's.nombre', 's.direccion', 's.numero_telefono',
                DB::raw('COALESCE(ds.stock, 0) as stock'))
            ->leftJoin('detalle_sucursal as ds', function ($join) use ($productoCod) {
                $join->on('ds.cod_sucursal', '=', 's.cod')
                    ->where('ds.cod_producto', '=', $productoCod);
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
        $this->authorizeAdmin($request);
        $request->validate(['nombre' => 'required', 'direccion' => 'required']);

        $cod = (DB::table('sucursales')->max('cod') ?? 0) + 1;

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
        $this->authorizeAdmin($request);
        $request->validate(['nombre' => 'required']);

        DB::table('sucursales')->where('cod', $cod)->update([
            'nombre' => $request->nombre,
            'direccion' => $request->direccion ?? '',
            'numero_telefono' => $request->numero_telefono ?? 0,
        ]);

        return response()->json(['success' => true, 'message' => 'Sucursal actualizada']);
    }

    public function eliminarSucursal(Request $request, $cod)
    {
        $this->authorizeAdmin($request);
        DB::table('sucursales')->where('cod', $cod)->delete();
        return response()->json(['success' => true, 'message' => 'Sucursal eliminada']);
    }

    // ============================================================
    //  VENTAS COMPLETADAS / INGRESOS (dashboard)
    // ============================================================
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

    // ============================================================
    //  AUTH-PROTECTED ENDPOINTS
    // ============================================================
    public function usuario(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
        }

        $cliente = DB::table('clientes')->where('usuario_id', $user->id)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
                'rol_id' => $user->rol_id,
                'tipo_suscripcion' => $user->tipo_suscripcion ?? 'free',
                'cliente' => $cliente,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['success' => true, 'message' => 'Sesión cerrada']);
    }

    public function misPedidos(Request $request)
    {
        $user = $request->user();
        $cliente = DB::table('clientes')->where('usuario_id', $user->id)->first();

        if (!$cliente) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $pedidos = DB::table('ventas')
            ->where('cod_cliente', $cliente->ci)
            ->orderBy('nro', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $pedidos]);
    }
}
