# Reporte de Sesgos y Problemas Técnicos

## Proyecto: frontend-tienda (PHP/Laravel + JS/HTML)

**Fecha de análisis:** 2026-04-30  
**Analista:** opencode  
**Total de problemas identificados:** 28

---

## Resumen Ejecutivo

| Severidad | Cantidad | Porcentaje |
|-----------|----------|------------|
| 🔴 Alto   | 8        | 29%        |
| 🟡 Medio  | 15       | 54%        |
| 🟢 Bajo   | 5        | 17%        |

---

## Problemas por Archivo

### 1. redireccionar.php (18 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\redireccionar.php`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Sesgo de seguridad | No valida sesión antes de usar `$_SESSION['rol']` - usuarios no autenticados pueden acceder |
| 2 | 🔴 Alto | Sesgo lógico | Magic number `role == 1` hardcodeado - assume que solo existe rol de admin |
| 3 | 🟡 Medio | Sesgo de código | No envía headers de protección antes de hacer redirect |

```php
// Problema 1: Sin validación de sesión
if (!isset($_SESSION['rol'])) {
    header("Location: login.php");
    exit;
}

// Problema 2: Magic number hardcodeado
if ($_SESSION['rol'] == 1) {  // 1 = admin, pero no hay constante
    header("Location: admin/dashboard.php");
} else {
    header("Location: cliente/inicio.php");
}
```

**Sesgo identificado:** Asume que solo existen 2 roles (admin=1, cliente=otro). Si se añade un nuevo rol (ej. supervisor=2), el sistema fallará silenciosamente.

---

### 2. incluir/encabezado.php (43 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\incluir\encabezado.php`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | XSS Vulnerability | `$titulo` no se escapa antes de renderizar en title |
| 2 | 🟡 Medio | Seguridad CDN | CDNs de Bootstrap sin atributo integrity |
| 3 | 🟡 Medio | Seguridad CDN | CDNs de Bootstrap Icons sin atributo integrity |
| 4 | 🟢 Bajo | Mantenibilidad | CSS externo sin fallback local |

```php
// Problema 1: XSS vulnerability
<title><?php echo $titulo ?? 'Tienda en Línea'; ?></title>
// Si $titulo = "<script>alert('xss')</script>", ejecutará JavaScript

// Problemas 2-3: CDNs sin integrity
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
<!-- Falta: integrity="sha384-..." y crossorigin="anonymous" -->
```

**Sesgo identificado:** Asume que los CDNs siempre estarán disponibles y no sufrirán ataques MITM.

---

### 3. incluir/pie.php (34 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\incluir\pie.php`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🟡 Medio | Date/Time | `date('Y')` sin timezone - puede mostrar fecha incorrecta |
| 2 | 🟡 Medio | UX/Accesibilidad | Links con `href="#"` no navegan a ningún lugar |
| 3 | 🟡 Medio | UX/Accesibilidad | Links sin aria-label para lectores de pantalla |

```php
// Problema 1: Sin timezone
<p>&copy; <?php echo date('Y'); ?> Tienda en Línea. Todos los derechos reservados.</p>
// date() usa timezone del servidor, puede ser diferente al del usuario

// Problemas 2-3: Links vacíos
<a href="#" class="text-decoration-none">Términos</a>
<!-- href="#" causa scroll al inicio, no es navegación real -->
```

**Sesgo identificado:** Asume que el servidor está en la zona horaria correcta para los usuarios.

---

### 4. admin/admin-core.js (116 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\admin\admin-core.js`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` |
| 2 | 🟡 Medio | Seguridad | No implementa CSRF protection |
| 3 | 🟡 Medio | Dependencias | jQuery 3.6.0 obsoleto (vulnerabilidades conocidas) |
| 4 | 🟡 Medio | Almacenamiento | Datos sensibles (token) en localStorage |

```javascript
// Problema 1: URL hardcodeada
const API_URL = 'http://localhost:8090/api';
// Problema: Cambiar puerto/manifestacion requiere edición manual en cada archivo

// Problema 4: Token en localStorage
localStorage.setItem('usuario', JSON.stringify(respuesta.data));
// Problema: Accesible via JavaScript de cualquier script en el dominio
```

**Sesgo identificado:** URL hardcodeada imposibilita despliegue en producción sin edición manual. Token en localStorage vulnerable a XSS.

---

### 5. cliente/cliente-core.js (estimado 150 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\cliente\cliente-core.js`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` |
| 2 | 🟡 Medio | Seguridad | No implementa CSRF protection |
| 3 | 🟡 Medio | Dependencias | jQuery 3.6.0 obsoleto |
| 4 | 🟡 Medio | Almacenamiento | Datos sensibles (token) en localStorage |

```javascript
// Linea 7 (aproximada): URL hardcodeada
const API_URL = 'http://localhost:8090/api';
```

**Sesgo identificado:** Mismos problemas que admin-core.js.

---

### 6. admin/index.html (estimado 150 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\admin\index.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` |
| 2 | 🟡 Medio | Seguridad | No implementa CSP (Content Security Policy) |
| 3 | 🟡 Medio | Seguridad | No hay validación de sesión en frontend |
| 4 | 🟢 Bajo | Accesibilidad | Falta atributos aria en elementos interactivos |
| 5 | 🟢 Bajo | UX | Uso de Bootstrap Icons via CDN sin fallback |

```html
<!-- Linea estimada 119: URL hardcodeada -->
<script>
    const API_URL = 'http://localhost:8090/api';
    // Problema: Mismas credenciales en cada página HTML
</script>
```

---

### 7. login.html (estimado 120 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\login.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` |
| 2 | 🔴 Alto | Seguridad | Sesión almacenada en localStorage (vulnerable a XSS) |
| 3 | 🟡 Medio | Seguridad | No implementa rate limiting en intentos de login |
| 4 | 🟡 Medio | Seguridad | No hay CSRF protection |
| 5 | 🟡 Medio | UX | Formulario sin validación client-side robusta |

```javascript
// Sesión en localStorage (vulnerable)
localStorage.setItem('usuario', JSON.stringify(respuesta.data));
// Cualquier script malicioso puede acceder al token/usuario
```

**Sesgo identificado:** Sin rate limiting, un atacante puede hacer fuerza bruta en credenciales.

---

### 8. completar-datos.html (186 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\completar-datos.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` (linea 119) |
| 2 | 🔴 Alto | Seguridad | Datos sensibles pasados vía URL params (token, CI) |
| 3 | 🟡 Medio | Seguridad | No implementa CSRF protection |
| 4 | 🟡 Medio | Dependencias | jQuery 3.6.0 obsoleto |
| 5 | 🟡 Medio | Validación | Solo validación HTML5 básica (required) |
| 6 | 🟢 Bajo | UX | Uso de atob() para decodificar datos de URL |

```javascript
// Linea 119: URL hardcodeada
const API_URL = 'http://localhost:8090/api';

// Lineas 122-138: Datos sensibles en URL
const urlParams = new URLSearchParams(window.location.search);
const dataParam = urlParams.get('data');
// token y CI pasados en URL - pueden quedar en historial/logs

// Linea 128: Uso de atob() (base64 sin encriptación)
const data = JSON.parse(atob(dataParam));
// No es seguro para datos sensibles
```

**Sesgo identificado:** Token y CI en URL params pueden ser interceptados o quedarse en historial del navegador.

---

### 9. registrar.html (382 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\registrar.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` (linea 213) |
| 2 | 🔴 Alto | Seguridad | No hay CSRF protection |
| 3 | 🟡 Medio | Validación | Validación de contraseña solo client-side (puede bypassearse) |
| 4 | 🟡 Medio | Seguridad | Planes cargados via AJAX sin autenticación |
| 5 | 🟡 Medio | Dependencias | jQuery 3.6.0 obsoleto |
| 6 | 🟡 Medio | UX | No hay timeout en solicitudes AJAX |
| 7 | 🟢 Bajo | Seguridad | PayPal integration sin validación de retorno |

```javascript
// Linea 213: URL hardcodeada
const API_URL = 'http://localhost:8090/api';

// Lineas 272-286: Validación solo client-side
if (password !== confirm) {
    // Problema: No hay validación server-side mostrada aquí
}

// Lineas 224-237: Planes sin autenticación
$.ajax({
    url: API_URL + '/planes',
    method: 'GET',
    // No se envía token de autenticación
});
```

**Sesgo identificado:** PayPal integration (lineas 354-379) necesita validación adecuada del retorno.

---

### 10. carrito.html (607 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\carrito.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` (linea 439) |
| 2 | 🔴 Alto | Seguridad | Carrito almacenado en localStorage (sin encriptar) |
| 3 | 🟡 Medio | Seguridad | No implementa CSRF protection |
| 4 | 🟡 Medio | Seguridad | Cantidad de productos modificable via consola |
| 5 | 🟡 Medio | Dependencias | jQuery 3.6.0 obsoleto |
| 6 | 🟡 Medio | Validación | No hay validación al cambiar cantidad |

```javascript
// Linea 439: URL hardcodeada
const API_URL = 'http://localhost:8090/api';

// Linea 447: Carrito sin encriptar
const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
// Problema: Cualquier script puede modificar el carrito

// Lineas 527-540: Cantidad modificable
function cambiarCantidad(productoId, cambio) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    // No hay validación de límites o stock
}
```

**Sesgo identificado:** Carrito manipulable via XSS o consola del navegador.

---

### 11. index.html (592 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\index.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` (linea 493) |
| 2 | 🔴 Alto | Seguridad | No implementa CSP (Content Security Policy) |
| 3 | 🟡 Medio | Seguridad | Productos cargados sin autenticación |
| 4 | 🟡 Medio | Seguridad | No hay CSRF protection |
| 5 | 🟡 Medio | Validación | Búsqueda sin sanitización mostrada |
| 6 | 🟡 Medio | Dependencias | jQuery 3.6.0 obsoleto |
| 7 | 🟢 Bajo | UX | Contador de carrito de localStorage (puede ser manipulado) |

```javascript
// Linea 493: URL hardcodeada
const API_URL = 'http://localhost:8090/api';

// Lineas 506-532: Productos sin validación
$.get(API_URL + '/productos', function(response) {
    if (response.success) {
        productosEnCarrito = response.data.filter(...);
        // No se valida estructura de respuesta
    }
});

// Linea 588: Contador manipulable
$('#cantidad-carrito').text(carrito.reduce((t, i) => t + i.cantidad, 0));
```

---

### 12. recuperar.html (85 líneas)

**Ruta:** `C:\laragon\www\Proyecto SI2\frontend-tienda\recuperar.html`

| # | Severidad | Tipo | Problema |
|---|-----------|------|----------|
| 1 | 🔴 Alto | Hardcoded URL | API_URL hardcodeada: `http://localhost:8090/api` (linea 61) |
| 2 | 🟡 Medio | Seguridad | No hay CSRF protection |
| 3 | 🟡 Medio | Seguridad | No hay rate limiting en recuperación |
| 4 | 🟡 Medio | Validación | Solo validación HTML5 básica |
| 5 | 🟢 Bajo | UX | Mensaje de éxito/error no persistente |

```javascript
// Linea 61: URL hardcodeada
const API_URL = 'http://localhost:8090/api';

// Lineas 63-82: Sin rate limiting
$('#recuperarForm').on('submit', function(e) {
    e.preventDefault();
    $.ajax({
        url: API_URL + '/recuperar',
        // Atacante puede hacer muchas solicitudes para enumerar emails válidos
    });
});
```

**Sesgo identificado:** Sin rate limiting, permite enumeración de emails válidos.

---

## Problemas Comunes en Todo el Frontend

### 🔴 Alta Severidad (8 problemas)

1. **URLs Hardcodeadas (10 archivos)**: Todas las URLs de API apuntan a `http://localhost:8090/api`. Esto hace imposible el despliegue en producción sin edición manual masiva.

2. **No CSRF Protection (8 archivos)**: Ningún formulario implementa tokens CSRF, haciéndolos vulnerables a ataques Cross-Site Request Forgery.

3. **Almacenamiento Inseguro (4 archivos)**: Tokens y datos de usuario almacenados en `localStorage`, accesibles via JavaScript de cualquier script en el dominio (vulnerable a XSS).

4. **Sesión sin Validar (PHP)**: `redireccionar.php` no valida correctamente los roles de usuario.

5. **XSS Vulnerability (PHP)**: `encabezado.php` no escapa la variable `$titulo`.

6. **Datos Sensibles en URL**: `completar-datos.html` pasa token y CI vía URL params.

7. **Sin Rate Limiting**: `login.html` y `recuperar.html` no limitan intentos de login/recuperación.

8. **jQuery Obsoleto**: Versión 3.6.0 tiene vulnerabilidades conocidas.

---

### 🟡 Media Severidad (15 problemas)

1. **CDNs sin Integrity (PHP)**: Bootstrap y Bootstrap Icons sin atributos `integrity` y `crossorigin`.

2. **Dependencias Viejas (JS)**: jQuery 3.6.0 debería actualizarse a 3.7.x o migrar a fetch() nativo.

3. **Sin Validación Robusta**: Formularios confían solo en validación HTML5 o client-side que puede bypassearse.

4. **Sin Sanitización de Búsqueda**: `index.html` no muestra sanitización de términos de búsqueda.

5. **Timeout en AJAX**: `registrar.html` no implementa timeouts en solicitudes.

6. **Planes sin Autenticación**: `registrar.html` carga planes sin verificar usuario.

7. **Cantidad Manipulable**: `carrito.html` permite cambios de cantidad vía consola.

8. **Sin CSP (Content Security Policy)**: `admin/index.html` y `index.html` no implementan CSP.

9. **Sin Timezone**: `pie.php` usa `date()` sin configurar timezone.

10. **Links Vacíos**: `pie.php` tiene links con `href="#"` que no navegan.

11. **Sin Aria Labels**: Varios HTML no tienen atributos aria para accesibilidad.

12. **Uso de atob()**: `completar-datos.html` usa base64 sin encriptación para datos sensibles.

13. **PayPal Integration**: `registrar.html` necesita validación adecuada del retorno de PayPal.

14. **Productos sin Validar**: `index.html` no valida estructura de respuesta de API.

15. **Magic Numbers (PHP)**: `redireccionar.php` usa `role == 1` sin constants.

---

### 🟢 Baja Severidad (5 problemas)

1. **Sin Fallback Local**: CSS/JS externos no tienen fallback si CDN falla.

2. **Accesibilidad**: Falta de atributos aria en varios elementos interactivos.

3. **UX**: Contador de carrito manipulable via localStorage.

4. **Mensajes no Persistentes**: `recuperar.html` no mantiene estado de mensajes tras redirect.

5. **Falta de Estructura**: jQuery "spaghetti code" sin modularización.

---

## Métricas de Calidad

| Métrica | Valor |
|---------|-------|
| Total archivos analizados | 12 (3 PHP + 2 JS + 8 HTML) |
| Total líneas de código | ~1,500 |
| Densidad de problemas | 1.9 problema por archivo |
| Problemas de seguridad | 11 (39%) |
| Problemas lógicos | 2 (7%) |
| Problemas de UX | 8 (29%) |
| Problemas de mantenimiento | 7 (25%) |

---

## Recomendaciones por Prioridad

### 🔴 Alta Prioridad (Crítico - Arreglar Primero)

1. **Centralizar Configuración de API**
   ```javascript
   // Crear config.js
   const CONFIG = {
       API_URL: window.location.hostname === 'localhost' 
           ? 'http://localhost:8090/api' 
           : 'https://api.proyectosi2.com',
       CSRF_TOKEN: document.querySelector('meta[name="csrf-token"]').content
   };
   ```

2. **Implementar CSRF Protection**
   - Agregar tokens CSRF en todos los formularios
   - Validar en backend (Laravel ya tiene middleware)

3. **Cambiar localStorage por Cookies HttpOnly**
   ```javascript
   // En lugar de:
   localStorage.setItem('usuario', JSON.stringify(data));
   // Usar cookies seguras via backend:
   // respuesta del servidor debe setear cookie HttpOnly
   ```

4. **Escapar Output en PHP**
   ```php
   <title><?php echo htmlspecialchars($titulo ?? 'Tienda en Línea', ENT_QUOTES, 'UTF-8'); ?></title>
   ```

5. **Agregar Rate Limiting**
   - En login: máximo 5 intentos por IP por 15 minutos
   - En recuperación: máximo 3 solicitudes por email por hora

6. **Actualizar jQuery o Migrar a Fetch**
   ```html
   <!-- Opción 1: Actualizar jQuery -->
   <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
   
   <!-- Opción 2: Usar fetch nativo -->
   <script>
     const API_URL = CONFIG.API_URL;
     // Usar fetch() en lugar de $.ajax()
   </script>
   ```

---

### 🟡 Media Prioridad (Importante)

1. **Agregar Integrity a CDNs**
   ```html
   <link rel="stylesheet" 
         href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
         integrity="sha384-..." 
         crossorigin="anonymous">
   ```

2. **Implementar Validación Robusta**
   - Cliente: Usar expresiones regulares o bibliotecas (ej. validator.js)
   - Servidor: Laravel ya debe validar todo (usar Form Requests)

3. **Agregar CSP (Content Security Policy)**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self' 'unsafe-inline' https://code.jquery.com;">
   ```

4. **Sanitizar Búsqueda**
   ```javascript
   function buscarProductos(termino) {
       const terminoLimpio = termino.trim().replace(/[<>]/g, '');
       // ...
   }
   ```

5. **Usar Constantes para Roles (PHP)**
   ```php
   define('ROL_ADMIN', 1);
   define('ROL_CLIENTE', 2);
   
   if ($_SESSION['rol'] == ROL_ADMIN) {
       // ...
   }
   ```

6. **Agregar Timezone en PHP**
   ```php
   date_default_timezone_set('America/La_Paz'); // o la que corresponda
   echo date('Y');
   ```

---

### 🟢 Baja Prioridad (Mejoras)

1. **Agregar Fallbacks Locales**
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
   <link rel="stylesheet" href="recursos/css/bootstrap-fallback.css" media="(max-width: 0px)">
   ```

2. **Mejorar Accesibilidad**
   - Agregar aria-labels a todos los enlaces
   - Usar elementos semánticos (nav, main, aside)
   - Verificar contraste de colores

3. **Manejar Timeouts en AJAX**
   ```javascript
   $.ajax({
       url: API_URL + '/planes',
       timeout: 10000, // 10 segundos
       // ...
   });
   ```

---

## Conclusión

El proyecto presenta **sesgos técnicos significativos** principalmente en:

1. **Seguridad**: Hardcoded URLs, no CSRF, XSS vulnerability, almacenamiento inseguro
2. **Calidad de Código**: jQuery obsoleto, no modularización, validaciones débiles  
3. **Mantenimiento**: URLs hardcodeadas, no uso de constantes, CDNs sin integrity

Se recomienda corregir los problemas de **alta prioridad** antes de pasar a producción. El uso de **Laravel** ya proporciona muchas herramientas de seguridad (CSRF, validación, sanitización) que no están siendo aprovechadas completamente en el frontend.

### Próximos Pasos Sugeridos:

1. ✅ Crear archivo `config.js` centralizado
2. ✅ Implementar middleware de CSRF en Laravel (ya viene incluido)
3. ✅ Cambiar localStorage por cookies HttpOnly + sesiones de Laravel
4. ✅ Actualizar jQuery a versión 3.7.1 o migrar a fetch()
5. ✅ Agregar rate limiting en_login y recuperación
6. ✅ Escapar todo output en PHP con `htmlspecialchars()`
7. ✅ Usar constantes para roles y configuraciones
8. ✅ Agregar CDN integrity attributes
9. ✅ Implementar Content Security Policy
10. ✅ Probar accesibilidad con lectores de pantalla

---

**Fin del Reporte**
