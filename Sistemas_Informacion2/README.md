# Sistemas de Información II - E-commerce

**Proyecto Formativo** - Tienda en línea tipo Amazon

## Tecnologías

- **Backend**: Laravel 13
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Base de datos**: PostgreSQL
- **API**: REST en puerto 8090

## Estructura del Proyecto

```
Sistemas_Informacion2/    # Backend Laravel
├── app/Http/Controllers/ # Controladores API
├── routes/api.php        # Rutas API
frontend-tienda/         # Frontend
├── index.html            # Tienda (cliente)
├── login.html
├── registrar.html
├── admin/
│   ├── panel.html       # Dashboard
│   ├── productos.html  # CRUD
│   ├── categorias.html
│   ├── marcas.html
│   ├── industria.html
│   ├── clientes.html
│   ├── usuarios.html
│   └── ventas.html
```

## Módulos Implementados

| Módulo | Descripción |
|--------|-------------|
| Autenticación | Login, Registro, Recuperar contraseña |
| Admin Panel | Dashboard con estadísticas |
| Productos | CRUD con imágenes (base64) |
| Categorías | CRUD |
| Marcas | CRUD |
| Industrias | CRUD |
| Clientes | Ver clientes |
| Usuarios | Gestion usuarios + cambio de rol |
| Ventas | Ver ventas |

## Base de Datos

- **Host**: localhost:5432
- **Nombre**: dbsistemainfo2
- **Tablas**: usuarios, clientes, productos, categorias, marcas, industrias, imagenes_producto, ventas, detalle_ventas, marca_categoria, password_resets

## Credenciales Admin

- **Email**: paulquispechoque2018@gmail.com
- **Password**: 74545356

## Ejecutar Proyecto

```bash
# Iniciar servidor Laravel
cd C:/laragon/www/Sistemas_Informacion2
php artisan serve --port=8090

# Acceder a:
# Frontend: http://localhost:8090/frontend-tienda/index.html
# API: http://localhost:8090/api/productos
```

## API Endpoints

### Públicos
- `POST /api/login` - Autenticación
- `POST /api/login-social` - Login social
- `POST /api/registrar` - Registro usuario
- `POST /api/recuperar` - Recuperar contraseña
- `GET /api/productos` - Lista productos (público)
- `GET /api/categorias` - Lista categorías
- `GET /api/marcas` - Lista marcas
- `GET /api/marcas-por-categoria/{id}` - Marcas por categoría
- `GET /api/industrias` - Lista industrias
- `POST /api/carrito/agregar` - Agregar al carrito
- `POST /api/venta/crear` - Crear venta

### Admin
- `GET /api/admin/stats` - Estadísticas
- `GET /api/admin/ventas` - Lista ventas
- `GET /api/admin/clientes` - Lista clientes
- `GET /api/admin/usuarios` - Lista usuarios
- `GET /api/admin/productos` - Lista productos admin
- `POST /api/admin/producto/crear` - Crear producto
- `POST /api/admin/producto/actualizar` - Actualizar producto
- `DELETE /api/admin/producto/{codigo}` - Eliminar producto
- `POST /api/admin/categoria/crear` - Crear categoría
- `POST /api/admin/categoria/actualizar` - Actualizar categoría
- `DELETE /api/admin/categoria/{cod}` - Eliminar categoría
- `POST /api/admin/marca/crear` - Crear marca
- `POST /api/admin/marca/actualizar` - Actualizar marca
- `DELETE /api/admin/marca/{cod}` - Eliminar marca
- `POST /api/admin/industria/crear` - Crear industria
- `POST /api/admin/industria/actualizar` - Actualizar industria
- `DELETE /api/admin/industria/{cod}` - Eliminar industria
- `POST /api/admin/usuario/cambiar-rol` - Cambiar rol usuario
- `POST /api/admin/usuario/actualizar` - Actualizar usuario
- `DELETE /api/admin/usuario/{id}` - Eliminar usuario

## Pendiente

- Sistema de suscripciones/planes
- Carrito de compras completo
- Checkout y pago

## Diseño

Frontend tipo Amazon con:
- Barra de búsqueda
- Cards de productos
- Modal de carrito
- Panel administrativo con sidebar
- Estilo visual consistente (naranja Amazon)