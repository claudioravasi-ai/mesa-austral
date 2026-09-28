-- Mesa Austral · base de datos (Cloudflare D1 / SQLite)
-- Se pega entera en la consola de D1 la primera vez. Se puede volver a correr: no borra nada.
-- Las horas se guardan como minutos del día (1260 = 21:00) y las fechas como 'AAAA-MM-DD', hora de Ushuaia.

CREATE TABLE IF NOT EXISTS restaurantes (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  subtitulo TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',          -- número de contacto que ven los clientes (E.164 sin +)
  politica TEXT NOT NULL,            -- JSON: horas, monto, crédito, tolerancia, señas, limpieza…
  plano TEXT NOT NULL,               -- JSON: ancho, alto y elementos (paredes, ventanas, barra…)
  version INTEGER NOT NULL DEFAULT 0, -- sube con cada cambio: la sala y el dueño lo consultan para refrescar
  creado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mesas (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  codigo TEXT NOT NULL,
  zona TEXT DEFAULT '',
  forma TEXT NOT NULL DEFAULT 'cuadrada',   -- redonda | cuadrada | rect
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
  cap_min INTEGER NOT NULL DEFAULT 1,
  cap_max INTEGER NOT NULL,
  combina TEXT DEFAULT '',            -- letra de grupo: las mesas con la misma letra se pueden juntar
  activa INTEGER NOT NULL DEFAULT 1,
  UNIQUE (resto, codigo)
);

CREATE TABLE IF NOT EXISTS turnos (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  dias TEXT NOT NULL DEFAULT '0123456',   -- 0 = domingo
  desde INTEGER NOT NULL,                 -- primer horario de reserva
  hasta INTEGER NOT NULL,                 -- último horario de reserva
  paso INTEGER NOT NULL DEFAULT 15,
  tope_franja INTEGER NOT NULL DEFAULT 0  -- personas que pueden entrar por franja (0 = sin tope)
);

CREATE TABLE IF NOT EXISTS cierres (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  motivo TEXT DEFAULT '',
  UNIQUE (resto, fecha)
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  tel TEXT NOT NULL,                 -- E.164 sin +: 5492901…
  email TEXT DEFAULT '',
  idioma TEXT NOT NULL DEFAULT 'es',
  acepta_promos INTEGER NOT NULL DEFAULT 0,
  visitas INTEGER NOT NULL DEFAULT 0,
  ultima TEXT DEFAULT '',
  credito INTEGER NOT NULL DEFAULT 0,
  credito_vence TEXT DEFAULT '',
  pide_sena_hasta TEXT DEFAULT '',   -- después de un compromiso impago o dos incidentes
  creado INTEGER NOT NULL,
  UNIQUE (resto, tel)
);

CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  cliente INTEGER,
  nombre TEXT NOT NULL DEFAULT '',   -- copia para la sala (queda aunque se anonimice el cliente)
  fecha TEXT NOT NULL,
  inicio INTEGER NOT NULL,
  fin INTEGER NOT NULL,              -- fin estimado (sin la limpieza)
  pax INTEGER NOT NULL,
  mesas TEXT NOT NULL,               -- ids separados por coma
  estado TEXT NOT NULL,              -- ofrecida | confirmada | sentada | finalizada | cancelada | cancelada_tarde | planton
  confirmo INTEGER NOT NULL DEFAULT 0,
  canal TEXT NOT NULL DEFAULT 'web', -- web | sala | puerta | espera
  ocasion TEXT DEFAULT '',
  alergias TEXT DEFAULT '',          -- dato de salud: se borra 7 días después de la visita
  notas TEXT DEFAULT '',
  al_liberarse INTEGER NOT NULL DEFAULT 0,
  avisos TEXT NOT NULL DEFAULT '',   -- marcas de avisos ya mandados: rec, rec2, vienen…
  sentada_en INTEGER,
  liberada_en INTEGER,
  sena INTEGER NOT NULL DEFAULT 0,
  idem TEXT UNIQUE,                  -- evita que dos toques creen dos reservas
  creado INTEGER NOT NULL,
  actualizado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reservas_dia ON reservas (resto, fecha);

-- Cada reserva ocupa bloques de 15 minutos. La clave primaria hace imposible reservar dos veces la misma mesa.
CREATE TABLE IF NOT EXISTS ocupacion (
  resto INTEGER NOT NULL,
  mesa INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  bloque INTEGER NOT NULL,
  reserva INTEGER NOT NULL,
  PRIMARY KEY (resto, mesa, fecha, bloque)
);
CREATE INDEX IF NOT EXISTS ocupacion_reserva ON ocupacion (reserva);

CREATE TABLE IF NOT EXISTS espera (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  desde INTEGER NOT NULL,
  hasta INTEGER NOT NULL,
  pax INTEGER NOT NULL,
  cliente INTEGER,
  nombre TEXT NOT NULL,
  tel TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'esperando',  -- esperando | ofrecida | aceptada | vencida | cancelada
  reserva INTEGER,
  oferta_vence INTEGER,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS espera_dia ON espera (resto, fecha, estado);

CREATE TABLE IF NOT EXISTS incidentes (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  cliente INTEGER,
  reserva INTEGER,
  tipo TEXT NOT NULL,                -- tardia | planton
  monto INTEGER NOT NULL,
  estado TEXT NOT NULL,              -- pendiente | pagado | condonado | exento | vencido
  quien TEXT DEFAULT '',             -- quién lo condonó
  creado INTEGER NOT NULL,
  vence TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  tipo TEXT NOT NULL,                -- sena | compromiso
  reserva INTEGER,
  incidente INTEGER,
  monto INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente | aprobado | devuelto | cancelado
  proveedor TEXT NOT NULL DEFAULT 'simulado',
  externo TEXT UNIQUE,               -- id del pago en Mercado Pago
  enlace TEXT DEFAULT '',
  creado INTEGER NOT NULL,
  actualizado INTEGER NOT NULL
);

-- Mensajes de WhatsApp. El texto se borra 7 días después (queda la plantilla y el estado).
CREATE TABLE IF NOT EXISTS mensajes (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  reserva INTEGER,
  espera INTEGER,
  tel TEXT NOT NULL,
  plantilla TEXT NOT NULL,
  texto TEXT,
  botones TEXT DEFAULT '[]',
  estado TEXT NOT NULL,              -- simulado | pendiente | enviado | error
  respuesta TEXT DEFAULT '',
  error TEXT DEFAULT '',
  creado INTEGER NOT NULL,
  enviado INTEGER
);
CREATE INDEX IF NOT EXISTS mensajes_tel ON mensajes (resto, tel);

CREATE TABLE IF NOT EXISTS personal (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT,
  rol TEXT NOT NULL,                 -- dueno | encargado | sala | cocina
  clave_hash TEXT,                   -- PBKDF2 (solo quien entra con correo)
  pin_hash TEXT,                     -- PIN de 4 dígitos para la tablet
  activo INTEGER NOT NULL DEFAULT 1,
  creado INTEGER NOT NULL,
  UNIQUE (resto, email)
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  personal INTEGER NOT NULL,
  resto INTEGER NOT NULL,
  vence INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS duraciones (
  resto INTEGER NOT NULL,
  grupo INTEGER NOT NULL,            -- 2, 4, 6 o 99 (más de 6)
  dia INTEGER NOT NULL,              -- día de la semana
  promedio REAL NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (resto, grupo, dia)
);

CREATE TABLE IF NOT EXISTS metricas_dia (
  resto INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  reservas INTEGER NOT NULL DEFAULT 0,
  personas INTEGER NOT NULL DEFAULT 0,
  puerta INTEGER NOT NULL DEFAULT 0,
  plantones INTEGER NOT NULL DEFAULT 0,
  tardias INTEGER NOT NULL DEFAULT 0,
  desde_espera INTEGER NOT NULL DEFAULT 0,
  ocupacion INTEGER NOT NULL DEFAULT 0,
  recuperado INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (resto, fecha)
);

-- Solo se agrega: nunca se edita. Sin datos personales en el detalle.
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY,
  resto INTEGER NOT NULL,
  quien TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle TEXT DEFAULT '',
  cuando INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS limites (
  clave TEXT PRIMARY KEY,
  ventana INTEGER NOT NULL,
  cuenta INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sistema (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
