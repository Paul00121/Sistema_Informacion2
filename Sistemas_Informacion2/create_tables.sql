-- =============================================
-- TABLAS DEL SISTEMA E-COMMERCE
-- =============================================

-- 1. ROLES
CREATE TABLE roles (
    cod INTEGER PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- 2. USUARIOS (Login con verificación de correo)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES roles(cod),
    email_verified BOOLEAN DEFAULT FALSE,
    token_verificacion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PASSWORD_RESETS (Recuperar contraseña)
CREATE TABLE password_resets (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- 4. PASSWORD_HISTORY (Historial contraseñas)
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CLIENTES
CREATE TABLE clientes (
    ci VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    direccion VARCHAR(255) NOT NULL,
    numero_telefono BIGINT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- 6. INDUSTRIAS
CREATE TABLE industrias (
    cod INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 7. CATEGORIAS
CREATE TABLE categorias (
    cod INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 8. MARCAS
CREATE TABLE marcas (
    cod INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 9. PRODUCTOS
CREATE TABLE productos (
    codigo INTEGER PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DOUBLE PRECISION NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    serie VARCHAR(100),
    cod_marca INTEGER NOT NULL REFERENCES marcas(cod),
    cod_industria INTEGER NOT NULL REFERENCES industrias(cod),
    cod_categoria INTEGER NOT NULL REFERENCES categorias(cod)
);

-- 10. IMAGENES_PRODUCTO
CREATE TABLE imagenes_producto (
    id SERIAL PRIMARY KEY,
    producto_cod INTEGER NOT NULL REFERENCES productos(codigo),
    url VARCHAR(500) NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE
);

-- 11. SUCURSALES
CREATE TABLE sucursales (
    cod INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    numero_telefono INTEGER NOT NULL
);

-- 12. DETALLE_SUCURSAL (Stock por sucursal)
CREATE TABLE detalle_sucursal (
    cod_sucursal INTEGER NOT NULL REFERENCES sucursales(cod),
    cod_producto INTEGER NOT NULL REFERENCES productos(codigo),
    stock INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (cod_sucursal, cod_producto)
);

-- 13. VENTAS
CREATE TABLE ventas (
    nro INTEGER PRIMARY KEY,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cod_cliente VARCHAR(20) REFERENCES clientes(ci),
    total DOUBLE PRECISION NOT NULL DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'pendiente'
);

-- 14. DETALLE_VENTAS
CREATE TABLE detalle_ventas (
    nro_venta INTEGER NOT NULL REFERENCES ventas(nro),
    cod_producto INTEGER NOT NULL REFERENCES productos(codigo),
    item INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DOUBLE PRECISION NOT NULL,
    subtotal DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (nro_venta, cod_producto)
);

-- 15. METODOS_PAGO
CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255)
);

-- 16. PAGOS
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    venta_nro INTEGER NOT NULL REFERENCES ventas(nro),
    metodo_pago_id INTEGER NOT NULL REFERENCES metodos_pago(id),
    monto DOUBLE PRECISION NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. PAYPAL_TRANSACCIONES
CREATE TABLE paypal_transacciones (
    id SERIAL PRIMARY KEY,
    pago_id INTEGER REFERENCES pagos(id),
    transaction_id VARCHAR(100) UNIQUE,
    payer_email VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. CARRITO
CREATE TABLE carrito (
    id SERIAL PRIMARY KEY,
    cliente_ci VARCHAR(20) REFERENCES clientes(ci),
    producto_cod INTEGER NOT NULL REFERENCES productos(codigo),
    cantidad INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. DIRECCIONES
CREATE TABLE direcciones (
    id SERIAL PRIMARY KEY,
    cliente_ci VARCHAR(20) REFERENCES clientes(ci),
    direccion VARCHAR(255) NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE
);

-- 20. PLANES
CREATE TABLE planes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    precio DOUBLE PRECISION NOT NULL,
    duracion_dias INTEGER NOT NULL
);

-- 21. SUSCRIPCIONES
CREATE TABLE suscripciones (
    id SERIAL PRIMARY KEY,
    cliente_ci VARCHAR(20) REFERENCES clientes(ci),
    plan_id INTEGER REFERENCES planes(id),
    estado VARCHAR(50) DEFAULT 'activa',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Roles
INSERT INTO roles (cod, nombre) VALUES (1, 'admin');
INSERT INTO roles (cod, nombre) VALUES (2, 'cliente');

-- Métodos de pago
INSERT INTO metodos_pago (nombre, descripcion) VALUES ('QR', 'Pago con código QR');
INSERT INTO metodos_pago (nombre, descripcion) VALUES ('tarjeta', 'Pago con tarjeta');
INSERT INTO metodos_pago (nombre, descripcion) VALUES ('paypal', 'Pago con PayPal');