-- =========================
-- CATALOGOS
-- =========================

CREATE TABLE catalogo_bolso (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_bolso_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_bolso_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_estado_parte (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    descripcion VARCHAR2(255),
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_est_parte_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_est_parte_cod UNIQUE (codigo)
);

CREATE TABLE catalogo_material (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    categoria VARCHAR2(100),
    unidad VARCHAR2(50),
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_mat_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_mat_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_triage (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    color VARCHAR2(50),
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_triage_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_triage_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_grupo_sanguineo (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_grupo_sang_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_grupo_sang_cod UNIQUE (codigo)
);

CREATE TABLE catalogo_estado_licencia (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    descripcion VARCHAR2(255),
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_est_lic_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_est_lic_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_cargo_oficialidad (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_cargo_of_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_cargo_of_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_estado_voluntario (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_est_vol_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_est_vol_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_tipo_voluntario (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_tipo_vol_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_tipo_vol_codigo UNIQUE (codigo)
);

CREATE TABLE catalogo_clave_emergencia (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    descripcion VARCHAR2(255),
    activo NUMBER(1) NOT NULL,
    CONSTRAINT cat_clave_em_PK PRIMARY KEY (id),
    CONSTRAINT uq_cat_clave_em_codigo UNIQUE (codigo)
);

CREATE TABLE rol_usuario (
    id NUMBER,
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) NOT NULL,
    CONSTRAINT rol_usuario_PK PRIMARY KEY (id),
    CONSTRAINT uq_rol_usuario_codigo UNIQUE (codigo)
);

-- =========================
-- BASE
-- =========================

CREATE TABLE carro (
    id VARCHAR2(36),
    patente VARCHAR2(20),
    nomenclatura VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    marca VARCHAR2(100),
    kilometraje NUMBER(10,1),
    estado_operativo NUMBER(1) NOT NULL,
    CONSTRAINT carro_PK PRIMARY KEY (id),
    CONSTRAINT uq_carro_patente UNIQUE (patente),
    CONSTRAINT uq_carro_nomenclatura UNIQUE (nomenclatura)
);

CREATE TABLE usuario (
    rut VARCHAR2(20),
    nombres VARCHAR2(100) NOT NULL,
    apellido_paterno VARCHAR2(100) NOT NULL,
    apellido_materno VARCHAR2(100) NOT NULL,
    email VARCHAR2(150) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    firma_imagen CLOB,
    foto_perfil CLOB,
    rol_id NUMBER NOT NULL,
    cargo_id NUMBER,
    tipo_voluntario_id NUMBER,
    estado_voluntario_id NUMBER,
    grupo_sanguineo_id NUMBER,
    compania VARCHAR2(100),
    cuerpo_bombero VARCHAR2(150),
    activo NUMBER(1) NOT NULL,

    CONSTRAINT usuario_PK PRIMARY KEY (rut),
    CONSTRAINT uq_usuario_email UNIQUE (email),

    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol_usuario(id),
    CONSTRAINT fk_usuario_cargo FOREIGN KEY (cargo_id) REFERENCES catalogo_cargo_oficialidad(id),
    CONSTRAINT fk_usuario_tipo_vol FOREIGN KEY (tipo_voluntario_id) REFERENCES catalogo_tipo_voluntario(id),
    CONSTRAINT fk_usuario_est_vol FOREIGN KEY (estado_voluntario_id) REFERENCES catalogo_estado_voluntario(id),
    CONSTRAINT fk_usuario_grupo_sang FOREIGN KEY (grupo_sanguineo_id) REFERENCES catalogo_grupo_sanguineo(id)
);

-- =========================
-- OPERACIONALES
-- =========================

CREATE TABLE parte_emergencia (
    id VARCHAR2(36),
    correlativo VARCHAR2(50) NOT NULL,
    estado_id NUMBER NOT NULL,
    fecha_emergencia TIMESTAMP WITH TIME ZONE NOT NULL,
    clave_id NUMBER NOT NULL,
    obac_rut VARCHAR2(20) NOT NULL,
    direccion VARCHAR2(200) NOT NULL,
    referencia_lugar VARCHAR2(255),
    trabajo_realizado CLOB,
    material_utilizado CLOB,
    metadata CLOB,
    firma_obac CLOB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT parte_emergencia_PK PRIMARY KEY (id),
    CONSTRAINT uq_parte_correlativo UNIQUE (correlativo),

    CONSTRAINT fk_parte_estado FOREIGN KEY (estado_id) REFERENCES catalogo_estado_parte(id),
    CONSTRAINT fk_parte_clave FOREIGN KEY (clave_id) REFERENCES catalogo_clave_emergencia(id),
    CONSTRAINT fk_parte_obac FOREIGN KEY (obac_rut) REFERENCES usuario(rut)
);

CREATE TABLE unidad_en_emergencia (
    id VARCHAR2(36),
    parte_id VARCHAR2(36) NOT NULL,
    carro_id VARCHAR2(36) NOT NULL,
    conductor_rut VARCHAR2(20),
    hora_salida TIMESTAMP WITH TIME ZONE,
    hora_llegada TIMESTAMP WITH TIME ZONE,
    km_salida NUMBER(10,1),
    km_llegada NUMBER(10,1),

    CONSTRAINT unidad_emerg_PK PRIMARY KEY (id),
    CONSTRAINT fk_unidad_parte FOREIGN KEY (parte_id) REFERENCES parte_emergencia(id),
    CONSTRAINT fk_unidad_carro FOREIGN KEY (carro_id) REFERENCES carro(id),
    CONSTRAINT fk_unidad_conductor FOREIGN KEY (conductor_rut) REFERENCES usuario(rut)
);

CREATE TABLE paciente_emergencia (
    id VARCHAR2(36),
    parte_id VARCHAR2(36) NOT NULL,
    nombre VARCHAR2(150),
    rut_paciente VARCHAR2(20),
    triage_id NUMBER,

    CONSTRAINT paciente_emerg_PK PRIMARY KEY (id),
    CONSTRAINT fk_paciente_parte FOREIGN KEY (parte_id) REFERENCES parte_emergencia(id),
    CONSTRAINT fk_paciente_triage FOREIGN KEY (triage_id) REFERENCES catalogo_triage(id)
);

CREATE TABLE vehiculo_civil_emergencia (
    id VARCHAR2(36),
    parte_id VARCHAR2(36) NOT NULL,
    patente VARCHAR2(20),
    marca VARCHAR2(50),
    conductor VARCHAR2(150),
    rut_conductor VARCHAR2(20),

    CONSTRAINT vehiculo_civil_PK PRIMARY KEY (id),
    CONSTRAINT fk_veh_civil_parte FOREIGN KEY (parte_id) REFERENCES parte_emergencia(id)
);

CREATE TABLE asistencia_personal (
    id VARCHAR2(36),
    parte_id VARCHAR2(36) NOT NULL,
    usuario_rut VARCHAR2(20) NOT NULL,

    CONSTRAINT asistencia_pers_PK PRIMARY KEY (id),
    CONSTRAINT uq_asist_parte_usr UNIQUE (parte_id, usuario_rut),
    CONSTRAINT fk_asistencia_parte FOREIGN KEY (parte_id) REFERENCES parte_emergencia(id),
    CONSTRAINT fk_asistencia_usuario FOREIGN KEY (usuario_rut) REFERENCES usuario(rut)
);
-- =========================
-- INVENTARIO / BOLSOS
-- =========================

CREATE TABLE bolso_trauma (
    id VARCHAR2(36),
    tipo_id NUMBER NOT NULL,
    carro_id VARCHAR2(36) NOT NULL,
    nombre_identificador VARCHAR2(100),
    activo NUMBER(1) NOT NULL,

    CONSTRAINT bolso_trauma_PK PRIMARY KEY (id),
    CONSTRAINT fk_bolso_tr_tipo FOREIGN KEY (tipo_id) REFERENCES catalogo_bolso(id),
    CONSTRAINT fk_bolso_tr_carro FOREIGN KEY (carro_id) REFERENCES carro(id)
);

CREATE TABLE material_por_carro (
    id VARCHAR2(36),
    carro_id VARCHAR2(36) NOT NULL,
    material_id NUMBER NOT NULL,
    cantidad_objetivo NUMBER NOT NULL,
    ubicacion VARCHAR2(100),
    activo NUMBER(1) NOT NULL,

    CONSTRAINT mat_carro_PK PRIMARY KEY (id),
    CONSTRAINT uq_mat_c_car_mat_ubi UNIQUE (carro_id, material_id, ubicacion),

    CONSTRAINT fk_mat_c_carro FOREIGN KEY (carro_id) REFERENCES carro(id),
    CONSTRAINT fk_mat_c_cat FOREIGN KEY (material_id) REFERENCES catalogo_material(id)
);

-- =========================
-- CHECKLIST
-- =========================

CREATE TABLE checklist_plantilla (
    id VARCHAR2(36),
    codigo VARCHAR2(50) NOT NULL,
    nombre VARCHAR2(150) NOT NULL,
    descripcion CLOB,
    entidad_tipo VARCHAR2(50) NOT NULL,
    version NUMBER NOT NULL,
    activo NUMBER(1) NOT NULL,
    estructura_json CLOB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT checklist_plant_PK PRIMARY KEY (id),
    CONSTRAINT uq_ch_plant_codigo UNIQUE (codigo)
);

CREATE TABLE checklist_ejecucion (
    id VARCHAR2(36),
    plantilla_id VARCHAR2(36) NOT NULL,
    entidad_tipo VARCHAR2(50) NOT NULL,
    entidad_id VARCHAR2(36) NOT NULL,
    revisor_rut VARCHAR2(20) NOT NULL,
    fecha_revision TIMESTAMP WITH TIME ZONE NOT NULL,
    estado VARCHAR2(30) NOT NULL,
    respuestas_json CLOB NOT NULL,
    firma_revisor CLOB,
    firma_oficial CLOB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT checklist_ejec_PK PRIMARY KEY (id),

    CONSTRAINT fk_ch_ejec_plant FOREIGN KEY (plantilla_id) REFERENCES checklist_plantilla(id),
    CONSTRAINT fk_ch_ejec_usuario FOREIGN KEY (revisor_rut) REFERENCES usuario(rut)
);

-- =========================
-- LICENCIAS
-- =========================

CREATE TABLE licencia_medica (
    id VARCHAR2(36),
    usuario_rut VARCHAR2(20) NOT NULL,
    resolutor_rut VARCHAR2(20),
    estado_licencia_id NUMBER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE NOT NULL,
    motivo VARCHAR2(255) NOT NULL,
    archivo_url VARCHAR2(255),
    observacion_resolucion CLOB,
    resuelto_en TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT lic_med_PK PRIMARY KEY (id),

    CONSTRAINT fk_lic_usr FOREIGN KEY (usuario_rut) REFERENCES usuario(rut),
    CONSTRAINT fk_lic_usr_res FOREIGN KEY (resolutor_rut) REFERENCES usuario(rut),
    CONSTRAINT fk_lic_est FOREIGN KEY (estado_licencia_id) REFERENCES catalogo_estado_licencia(id)
);

-- =========================
-- AUDITORIA
-- =========================

CREATE TABLE auditoria_usuario (
    id VARCHAR2(36),
    usuario_rut VARCHAR2(20),
    accion VARCHAR2(100) NOT NULL,
    entidad VARCHAR2(100),
    entidad_id VARCHAR2(36),
    metodo_http VARCHAR2(10),
    ruta VARCHAR2(255),
    ip_origen VARCHAR2(45),
    user_agent VARCHAR2(500),
    detalle CLOB,
    resultado VARCHAR2(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT aud_usr_PK PRIMARY KEY (id),
    CONSTRAINT fk_aud_usuario FOREIGN KEY (usuario_rut) REFERENCES usuario(rut)
);


-- =========================
-- MANTENIMIENTO DE CARROS
-- =========================

CREATE TABLE mantenimiento_carro (
    id VARCHAR2(36),
    carro_id VARCHAR2(36) NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_mantenimiento DATE,
    fecha_proximo_mantenimiento DATE,
    fecha_proxima_rev_tecnica DATE,
    fecha_rev_bomba DATE,
    fecha_inspeccion DATE,
    inspector_rut VARCHAR2(20),
    conductor_rut VARCHAR2(20),
    descripcion CLOB,

    CONSTRAINT mant_carro_PK PRIMARY KEY (id),

    -- Relación con la máquina
    CONSTRAINT fk_mant_c_carro FOREIGN KEY (carro_id) REFERENCES carro(id),
    
    -- Relaciones con el personal de bomberos (usuarios)
    CONSTRAINT fk_mant_c_inspector FOREIGN KEY (inspector_rut) REFERENCES usuario(rut),
    CONSTRAINT fk_mant_c_conductor FOREIGN KEY (conductor_rut) REFERENCES usuario(rut)
);