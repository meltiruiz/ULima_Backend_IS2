# ULima++ Backend

Backend oficial de ULima++, construido con una arquitectura moderna basada en TypeScript y PostgreSQL.

---

## Stack Tecnológico

| Tecnología        | Propósito                          |
|-------------------|------------------------------------|
| **Bun**           | Runtime JavaScript                 |
| **TypeScript**    | Lenguaje principal                 |
| **Hono**          | Framework API REST                 |
| **Drizzle ORM**   | ORM tipado para PostgreSQL         |
| **Neon PostgreSQL** | Base de datos serverless          |
| **Zod**           | Validación de datos                |
| **JWT**           | Autenticación                      |
| **bcryptjs**      | Hash de contraseñas                |
| **Railway**       | Plataforma de deploy               |

---

## Arquitectura General

```
Flutter App
    ↓
Dio HTTP Client
    ↓
Hono REST API
    ↓
Services
    ↓
Drizzle ORM
    ↓
Neon PostgreSQL
```

---

## Objetivos del Backend

- Centralizar toda la lógica académica.
- Gestionar autenticación y autorización.
- Manejar cálculos académicos y reglas de negocio.
- Exponer una API REST para Flutter.
- Gestionar persistencia con PostgreSQL.
- Mantener una arquitectura escalable y modular.

---

## Estructura del Proyecto

```
ulima-backend/
│
├── src/
│   ├── db/
│   │   ├── schema/          # Definición de tablas Drizzle
│   │   ├── relations/       # Relaciones entre tablas
│   │   ├── migrations/      # Migraciones generadas
│   │   ├── seed/            # Datos de prueba
│   │   └── index.ts         # Conexión a la base de datos
│   │
│   ├── modules/             # Dominios de la aplicación (por definir)
│   ├── middleware/          # Middleware (auth, validación, etc.)
│   ├── services/            # Servicios compartidos
│   ├── utils/               # Utilidades generales
│   ├── types/               # Tipos TypeScript globales
│   ├── config/              # Configuración de entorno
│   └── server.ts            # Punto de entrada del servidor
│
├── drizzle/                 # Migraciones generadas por Drizzle
├── .env                     # Variables de entorno (no versionar)
├── .env.example             # Ejemplo de variables de entorno
├── .gitignore
├── drizzle.config.ts        # Configuración de Drizzle Kit
├── tsconfig.json
├── package.json
└── README.md
```

---

## Principios Arquitectónicos

### Modularidad

Cada dominio de la aplicación tendrá su propio módulo independiente dentro de `src/modules/`.

Los módulos se definirán una vez que se establezca el diseño completo del schema de la base de datos y las reglas de negocio.

### Separación de Responsabilidades

| Capa         | Responsabilidad                              |
|--------------|----------------------------------------------|
| **Routes**   | Definen endpoints HTTP dentro de cada módulo |
| **Services** | Contienen la lógica de negocio               |
| **Database** | Acceso a PostgreSQL mediante Drizzle ORM     |
| **Middleware** | Autenticación, validación y seguridad      |

---

## API REST

El backend expondrá endpoints REST consumidos por la app Flutter.

Endpoints actuales:

```
GET    /health
```

Más endpoints se definirán conforme se implementen los módulos.

---

## Base de Datos

- **Proveedor:** Neon PostgreSQL (serverless)
- **ORM:** Drizzle ORM
- **Migraciones:** Drizzle Kit
- **Características:**
  - Relaciones complejas entre entidades académicas
  - Integridad referencial
  - Migraciones automáticas
  - Tipado fuerte mediante TypeScript
  - Escalabilidad serverless

---

## Variables de Entorno

Crear un archivo `.env` basado en `.env.example`:

```env
DATABASE_URL=postgresql://user:password@host:5432/ulima_db?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3000
NODE_ENV=development
```

| Variable       | Descripción                          |
|----------------|--------------------------------------|
| `DATABASE_URL` | URL de conexión a Neon PostgreSQL    |
| `JWT_SECRET`   | Clave secreta para firmar JWTs       |
| `PORT`         | Puerto del servidor (default: 3000)  |
| `NODE_ENV`     | Entorno de ejecución                 |

---

## Scripts Disponibles

| Comando              | Descripción                              |
|----------------------|------------------------------------------|
| `bun run dev`        | Inicia servidor en modo desarrollo       |
| `bun run build`      | Compila TypeScript a JavaScript          |
| `bun run start`      | Inicia servidor en producción            |
| `bun run db:generate`| Genera migraciones desde el schema       |
| `bun run db:migrate` | Aplica migraciones a la base de datos    |
| `bun run db:push`    | Sinc schema directo a DB (sin migraciones)|
| `bun run db:studio`  | Abre Drizzle Studio (UI de base de datos)|
| `bun run db:seed`    | Ejecuta seed de datos de prueba          |

---

## Cómo Correr el Proyecto

### Prerrequisitos

- [Bun](https://bun.sh/) instalado
- Cuenta en [Neon](https://neon.tech/) para PostgreSQL

### Pasos

1. **Clonar el repositorio**

```bash
git clone <repo-url>
cd ULima_Backend_IS2
```

2. **Instalar dependencias**

```bash
bun install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Editar `.env` con tu `DATABASE_URL` de Neon.

4. **Iniciar servidor en desarrollo**

```bash
bun run dev
```

El servidor estará disponible en `http://localhost:3000`.

5. **Verificar health check**

```bash
curl http://localhost:3000/health
```

---

## Cómo Ejecutar Migraciones

### Generar migraciones

```bash
bun run db:generate
```

### Aplicar migraciones

```bash
bun run db:migrate
```

### Abrir Drizzle Studio

```bash
bun run db:studio
```

---

## Roadmap

### Fase 1 - Configuración Base ✅
- [x] Configuración Bun
- [x] Configuración TypeScript
- [x] Configuración Hono
- [x] Configuración Drizzle
- [x] Conexión Neon
- [x] Estructura modular

### Fase 2 - Schema y Base de Datos
- [ ] Diseño completo del schema
- [ ] Relaciones entre entidades
- [ ] Migraciones iniciales
- [ ] Seed de datos de prueba

### Fase 3 - Autenticación
- [ ] Registro de usuarios
- [ ] Login con JWT
- [ ] Roles (alumno, docente, admin)
- [ ] Middleware de autenticación

### Fase 4 - Endpoints Académicos
- [ ] CRUD de cursos
- [ ] Malla curricular
- [ ] Evaluaciones
- [ ] Registro de notas
- [ ] Sistema de alertas

### Fase 5 - Producción
- [ ] Optimización de consultas
- [ ] Seguridad avanzada
- [ ] Testing
- [ ] Deploy en Railway

---

## Futuras Expansiones

La arquitectura permitirá:

- Dashboard web administrativo
- Panel de gestión para docentes
- IA para análisis académico predictivo
- Notificaciones push
- Integraciones con sistemas universitarios
- Analytics y reportes
- Microservicios futuros

---

## Estado Actual

El proyecto se encuentra en **etapa de inicialización de arquitectura backend**.

La estructura modular está configurada y lista para comenzar el desarrollo de:
- Schema de base de datos
- Sistema de autenticación
- Endpoints académicos

No se han implementado endpoints funcionales ni lógica de negocio todavía.
