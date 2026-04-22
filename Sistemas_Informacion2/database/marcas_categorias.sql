-- Tabla pivote para relación marca-categoría
CREATE TABLE IF NOT EXISTS marca_categoria (
    cod_marca INTEGER NOT NULL,
    cod_categoria INTEGER NOT NULL,
    PRIMARY KEY (cod_marca, cod_categoria),
    FOREIGN KEY (cod_marca) REFERENCES marcas(cod) ON DELETE CASCADE,
    FOREIGN KEY (cod_categoria) REFERENCES categorias(cod) ON DELETE CASCADE
);

-- Insertar relaciones existentes (basado en los datos actuales)
-- Hugo Boss -> Moda para Hombres, Accesorios
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Hugo Boss' AND c.nombre IN ('Moda para Hombres', 'Accesorios')
ON CONFLICT DO NOTHING;

-- Samsung -> Electrónica, Smartphones
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Samsung' AND c.nombre IN ('Electrónica', 'Smartphones')
ON CONFLICT DO NOTHING;

-- Apple -> Electrónica, Smartphones
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Apple' AND c.nombre IN ('Electrónica', 'Smartphones')
ON CONFLICT DO NOTHING;

-- Xiaomi -> Electrónica, Smartphones
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Xiaomi' AND c.nombre IN ('Electrónica', 'Smartphones')
ON CONFLICT DO NOTHING;

-- Huawei -> Electrónica, Smartphones
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Huawei' AND c.nombre IN ('Electrónica', 'Smartphones')
ON CONFLICT DO NOTHING;

-- Lenovo -> Electrónica, Oficina
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Lenovo' AND c.nombre IN ('Electrónica', 'Oficina')
ON CONFLICT DO NOTHING;

-- Dell -> Electrónica, Oficina
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'Dell' AND c.nombre IN ('Electrónica', 'Oficina')
ON CONFLICT DO NOTHING;

-- HP -> Electrónica, Oficina
INSERT INTO marca_categoria (cod_marca, cod_categoria) 
SELECT m.cod, c.cod FROM marcas m, categorias c WHERE m.nombre = 'HP' AND c.nombre IN ('Electrónica', 'Oficina')
ON CONFLICT DO NOTHING;