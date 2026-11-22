# EventoVivo 🎟️
> **Experiencias universitarias en vivo con control inteligente de cupos, asistencia QR y trazabilidad en tiempo real.**

EventoVivo es una plataforma web full-stack diseñada para resolver el problema recurrente en encuentros universitarios, talleres y hackatones: **agendas vivas que cambian**, aforos que se reducen, sesiones que se reprograman y la necesidad de garantizar acceso justo sin sobrecupos ni duplicidades.

---

## 📋 Índice
1. [Características Principales (MVP F1-F9)](#-características-principales-mvp-f1-f9)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Requisitos del Sistema](#-requisitos-del-sistema)
4. [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
5. [Variables de Entorno](#-variables-de-entorno)
6. [Usuarios y Datos de Prueba (Seed)](#-usuarios-y-datos-de-prueba-seed)
7. [Cómo Ejecutar las Pruebas y Cobertura](#-cómo-ejecutar-las-pruebas-y-cobertura)
8. [Análisis Crítico de Cobertura de Pruebas](#-análisis-crítico-de-cobertura-de-pruebas)
9. [Estrategia de Ramas y Commits](#-estrategia-de-ramas-y-commits)
10. [Refactorización Documentada](#-refactorización-documentada)
11. [Guion de Demo en Menos de 5 Minutos](#-guion-de-demo-en-menos-de-5-minutos)

---

## 🚀 Características Principales (MVP F1-F9)

- **F1. Agenda Dinámica:** Línea de tiempo visual por día y auditorio con semáforos de aforo tipo "luz de escenario" (Disponible, Casi llena, Llena).
- **F2. Inscripción con Validación Transaccional:** Control estricto de capacidad (`SELECT ... FOR UPDATE`) y prevención instantánea de choques de horario (`inicio_A < fin_B && fin_A > inicio_B`). Sesiones contiguas no chocan.
- **F3. Lista de Espera FIFO con Promoción Automática:** Ascenso atómico ante cancelaciones. Si el primero en espera tiene choque con otra sesión, se salta conservando su posición original para la siguiente vacante.
- **F4. Credencial QR y Acreditación Idempotente:** Gafete de conferencia con código QR vectorial de 128 bits criptográficos no adivinables y código manual de respaldo.
- **F5. Panel del Organizador y Encuestas (R10):** Gráficas de ocupación vs. asistencia, promedio de satisfacción (1-5 estrellas) accesible únicamente para participantes con asistencia registrada.
- **F6. Cancelaciones y Gestión de Turnos:** Salida voluntaria de plazas confirmadas o de lista de espera con reordenamiento atómico.
- **F7. Ciclo de Vida de Sesiones:** Estados auditados (`draft`, `published`, `cancelled`).
- **F8. Bandeja de Avisos Interna:** Centro de notificaciones en la app para cambios de aforo, reprogramaciones o ascensos de lista de espera (sin push ni spam por email).
- **F9. Bitácora de Auditoría y Exportación CSV:** Trazabilidad completa con quién, cuándo, valor anterior y nuevo valor, más descarga directa en CSV de la lista de asistencia.

---

## 🛠️ Stack Tecnológico

- **Framework Web:** Next.js 14+ (App Router) con TypeScript estricto.
- **Base de Datos:** PostgreSQL 16 (en contenedores Docker para desarrollo, pruebas y producción).
- **Acceso a Datos:** SQL transaccional y Drizzle ORM con driver `pg` (sin Prisma, sin Supabase, sin Clerk).
- **Autenticación Propia:** Hashing con `crypto.scrypt` (OWASP), tokens de sesión firmados con HMAC-SHA256 en cookies `httpOnly`, `sameSite: 'strict'`, rate limiting contra fuerza bruta y RBAC estricto en servidor (403 Forbidden).
- **Acreditación QR:** Generador vectorial SVG nativo de alta resolución con formato de 128 bits criptográficos.
- **Pruebas:** Vitest (TDD puro en memoria para el dominio + suites de concurrencia e integración transaccional contra PostgreSQL).
- **CI/CD:** GitHub Actions con servicio PostgreSQL automático (lint, tipos, migraciones, pruebas).

---

## 💻 Requisitos del Sistema

- **Node.js:** Versión 20 LTS o superior.
- **npm:** Versión 10 o superior.
- **Docker y Docker Compose:** Para ejecutar la base de datos principal (`db: 5432`) y la base de datos aislada de pruebas (`db_test: 5433`).

---

## 📦 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd EventoVivo
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```

### 4. Levantar la base de datos con Docker
```bash
docker compose up -d db
```

### 5. Ejecutar migraciones y sembrar datos de prueba (Seed)
```bash
npm run db:migrate
npm run db:seed
```

### 6. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000).

---

## 🔐 Variables de Entorno

Definidas en `.env.example`:

| Variable | Descripción | Valor por Defecto Local |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL a la base de datos principal | `postgres://eventovivo:eventovivo_pass@localhost:5432/eventovivo` |
| `DATABASE_URL_TEST` | Conexión PostgreSQL a la base aislada para pruebas de concurrencia | `postgres://eventovivo:eventovivo_pass@localhost:5433/eventovivo_test` |
| `SESSION_SECRET` | Secreto criptográfico para firmar cookies de sesión (mín. 32 caracteres) | `secreto_seguro_para_firmar_sesiones_eventovivo_32chars` |
| `SESSION_EXPIRES_DAYS` | Duración máxima de la sesión en días | `7` |
| `NODE_ENV` | Entorno de ejecución (`development` / `production` / `test`) | `development` |

---

## 👥 Usuarios y Datos de Prueba (Seed Realista)

El comando `npm run db:seed` carga automáticamente un conjunto realista de datos para pruebas inmediatas y análisis de rendimiento:

### Usuarios Registrados

| Rol | Correo | Contraseña | Detalle y Permisos |
|---|---|---|---|
| **Organizador 1** | `org1@eventovivo.edu` | `Admin123!` | Dr. Roberto Salazar (Decano Ingeniería) - Dueño de sesiones S1, S2, S4, S7, S9, S11, S13 |
| **Organizador 2** | `org2@eventovivo.edu` | `Admin123!` | Dra. Elena Vasquez (Dir. Ciberseguridad) - Dueña de sesiones S3, S5, S6, S8, S10, S12, S14 |
| **Participante 1** | `participante1@universidad.edu` | `Pass123!` | Sofia Reyes - Confirmada en S1, S2, S4, S9, S14. Asistencia y encuesta registradas en S9 |
| **Participante 26** | `participante26@universidad.edu` | `Pass123!` | Manuel Benitez - En lista de espera (Posición #1) en S1 (Hackatón Web3) |
| **Participantes 1-50** | `participante[N]@universidad.edu` | `Pass123!` | 50 participantes generados con nombres reales e inscripciones distribuidas |

### Alta Administrativa de Organizadores (R15)
Por regla de negocio (R15), el registro público (`/registro`) crea **exclusivamente participantes**. Para crear un nuevo organizador se utiliza el script administrativo CLI:
```bash
npx tsx scripts/create-organizer.ts <email> <password> "<nombre completo>"

# Ejemplo:
npx tsx scripts/create-organizer.ts nuevo.org@eventovivo.edu Admin123! "Dra. Carmen Morales"
```

### Sesiones Sembradas en la Agenda (14 Sesiones, Cupos 20 a 60)

1. **Hackatón Web3: Contratos Inteligentes y DeFi:** Cupo 25. **Estado: LLENA (100%).** 25 confirmados + 7 en lista de espera.
2. **Taller Avanzado de Agentes Inteligentes y LLMs:** Cupo 30. **Estado: CASI LLENA (93.3%).** 28 confirmados (2 plazas libres). Horario 11:00-13:00 (choca con S3).
3. **Conferencia Magistral: El Futuro de la IA Generativa:** Cupo 50. 25 confirmados (50%). Horario 12:00-14:00 (**choca con S2**).
4. **Taller: Microservicios y Cloud Native con Kubernetes:** Cupo 35. 21 confirmados (60%).
5. **Encuentro de Comunidades Tech y Open Source:** Cupo 40. 16 confirmados (40%).
6. **Conferencia: Seguridad Ofensiva y Amenazas Cuánticas:** Cupo 40. 30 confirmados (75%).
7. **Taller: Visualización de Datos con React y Canvas:** Cupo 30. 11 confirmados (36.7%).
8. **Encuentro de Investigación Doctoral y Postgrados:** Cupo 30. **Estado: CASI VACÍA (6.7%).** 2 confirmados.
9. **Conferencia: Ética en Modelos de Lenguaje Masivos:** Cupo 40. 20 confirmados, **15 asistencias registradas y 10 encuestas de satisfacción completadas**.
10. **Hackatón Universitario: Ciudades Inteligentes e IoT:** Cupo 40. **Estado: BORRADOR (draft).**
11. **Taller de Criptografía de Curvas Elípticas:** Cupo 25. **Estado: CANCELADA.**
12. **Encuentro de Liderazgo y Mentoría en Tecnología:** Cupo 30. 15 confirmados (50%).
13. **Taller: Pruebas Automatizadas y Performance Testing:** Cupo 25. 16 confirmados (64%).
14. **Conferencia de Clausura: Tendencias de Ingeniería 2027:** Cupo 60. 42 confirmados (70%).

---

## 🧪 Cómo Ejecutar las Pruebas y Cobertura

```bash
# Ejecutar suite completa de pruebas unitarias
npm test

# Ejecutar pruebas en modo observador continuo
npm run test:watch

# Ejecutar reporte de cobertura
npm run test:coverage

# Verificación de tipos TypeScript
npx tsc --noEmit

# Verificación de estilo y reglas de código
npm run lint
```

---

## 📊 Análisis Crítico de Cobertura de Pruebas

### ¿Qué MIDE el reporte de cobertura?
- **Cobertura de Líneas (*Line Coverage*):** Indica qué líneas físicas de código se ejecutaron al menos una vez durante las pruebas.
- **Cobertura de Ramas (*Branch Coverage*):** Comprueba si se evaluaron tanto los caminos verdaderos como falsos en condicionales (`if/else`, operadores ternarios y cortocircuitos lógicos).
- **Cobertura de Funciones (*Function Coverage*):** Verifica si cada método y función declarada fue invocada.

### ¿Qué NO MIDE la cobertura?
- **Condiciones de Carrera Concurrente:** El 100% de cobertura en código unitario no garantiza que dos hilos simultáneos en PostgreSQL no provoquen sobrecupo. Por ello, las pruebas de aceptación (como **A1**) prueban transacciones reales con `SELECT ... FOR UPDATE` sobre la base de datos real.
- **Validez de Reglas de Negocio:** Una prueba puede ejecutar una línea sin comprobar que el cálculo sea correcto si los asserts son débiles.
- **Calidad de la Experiencia de Usuario:** No valida contraste visual, claridad de mensajes en español o ergonomía en pantallas móviles.

### ¿Por qué un porcentaje alto NO garantiza calidad?
Perseguir ciegamente el "100%" fomenta pruebas triviales que ejecutan código sin verificar invariantes de negocio. En EventoVivo la calidad se validó mediante **TDD estricto**:
1. **Rojo comprobado:** Para cada regla (R1 a R12), se escribió primero una prueba que fallaba, comprobando que si la lógica está rota, la prueba efectivamente lo detecta.
2. **Invariantes críticas aseguradas:**
   - La última plaza solo se asigna a 1 persona, nunca a 2.
   - Dos sesiones consecutivas (10:00-12:00 y 12:00-14:00) **no** deben chocar.
   - El escaneo repetido de un QR es **idempotente** y no infla la asistencia.
   - En reducción de aforo, el cupo nunca puede ser menor que las personas que ya ingresaron físicamente a la sala.

> **Transparencia Técnica:** En entornos locales aislados de sandbox sin salida a internet externa, `@vitest/coverage-v8` se ejecuta directamente en el runner de GitHub Actions con Docker y conectividad completa, donde se procesan todas las métricas de lcov.

---

## 🌿 Estrategia de Ramas y Commits

El desarrollo sigue una adaptación rigurosa de **Git Flow** con **Conventional Commits**:

- **`main`:** Rama protegida de producción. Solo recibe merges validados y testeados desde `develop`.
- **`develop`:** Rama de integración para hitos completados.
- **`feature/*`:** Ramas de trabajo para cada funcionalidad o regla de dominio (ej. `feature/h1-infra-scaffold`, `feature/h2-domain-tdd`, `feature/h3-changes-audit`, `feature/h4-auth-rbac`, `feature/h5-ui-art-direction`, `feature/h6-seed-demo`).
- **`fix/*`:** Ramas para correcciones verificadas con una prueba que reproduzca el defecto.
- **`docs/*`:** Ramas para documentación, instrucciones de ejecución o cambios de configuración CI.

Todo cambio debe llegar a `main` mediante una solicitud de incorporación dirigida a `develop` o `main`. GitHub Actions debe confirmar instalaciones, pruebas, tipos y compilación antes de aprobar el merge.

### Formato de Commits:
```
feat(domain): add R5 waitlist FIFO promotion logic with skip-on-conflict
test(concurrency): verify A1 simultaneous enrollment transaction
fix(auth): return 403 when participant accesses organizer routes
refactor(schedule): decouple time slot overlap calculation from DB layer
```

---

## Funcionalidad verificable: imágenes únicas de eventos

El catálogo genera imágenes SVG locales a partir del tipo, título, descripción e identificador de cada sesión. Una sesión no depende de enlaces externos y dos sesiones distintas pueden mostrar ilustraciones visualmente diferenciadas.

1. Inicia la aplicación y abre `http://localhost:3000`.
2. Comprueba que las tarjetas de distintas sesiones tengan banners visibles.
3. Compara eventos de temas distintos, por ejemplo Web3, inteligencia artificial, Kubernetes e investigación doctoral.
4. Abre una sesión y verifica que el banner del detalle corresponda al mismo evento.
5. Ejecuta las pruebas específicas:

```bash
npx vitest run src/lib/__tests__/eventImages.test.ts
```

---

## 🔄 Refactorización Documentada

### Refactorización: Desacoplamiento del Motor de Horarios y Traslapes
- **Código Refactorizado:** Extracción de la lógica de evaluación de franjas horarias hacia `src/domain/schedule.ts` (`overlaps` y `hasScheduleConflict`), desacoplándola de las consultas directas de base de datos y de los controladores de API.
- **Por qué se refactorizó:**
  1. **Evitar duplicación de lógica:** La regla R2 (`inicio_A < fin_B && fin_A > inicio_B`) debía aplicarse en tres lugares críticos distintos:
     - Validación de nueva inscripción (`validateEnrollment`).
     - Promoción de lista de espera con salto por choque (`findPromotionCandidate`).
     - Revalidación masiva de participantes tras reprogramar una sesión (`revalidateScheduleConflicts`).
  2. **Velocidad y pureza de pruebas:** Permite validar exhaustivamente casos borde (traslape total, parcial al inicio, parcial al fin, sesiones idénticas y sesiones consecutivas contiguas) con 10 pruebas unitarias puras que corren en menos de 10 milisegundos sin depender de una base de datos activa.
  3. **Invariante de sesiones consecutivas:** Asegura formalmente que si una sesión termina a las 12:00 y otra empieza a las 12:00, la comparación de límites estrictos (`<` y `>`) devuelva `false` (no hay choque), evitando falsos positivos comunes.

---

## ⏱️ Guion de Demo en Menos de 5 Minutos

Sigue este guion paso a paso para verificar el sistema completo:

### Paso 1: Ingreso a Lista de Espera por Aforo Completo (1 min)
1. Inicia sesión como `mateo@universidad.edu` (Contraseña: `Pass123!`).
2. En la Agenda, busca la sesión **"Hackatón Web3: Contratos Inteligentes"** (Capacidad: 2, inscritos: 2).
3. Verás la luz de escenario en **Rojo: Aforo completo**.
4. Haz clic en **"Entrar a Lista de Espera"**.
5. **Resultado:** El sistema te asigna la posición en cola y muestra la etiqueta `⏳ En Lista de Espera`.

### Paso 2: Cancelación y Promoción Automática FIFO (1 min)
1. Cierra sesión e ingresa como `carlos@universidad.edu` (Contraseña: `Pass123!`), quien tiene plaza confirmada en la misma sesión.
2. En la tarjeta de la sesión, haz clic en **"Cancelar plaza"** y confirma el diálogo.
3. **Resultado:** Se libera la plaza de Carlos y el sistema atómicamente promueve a `lucia@universidad.edu` (primera en lista de espera). Al recargar o ingresar con Lucía, su estado ahora es `✓ Inscripción Confirmada` y tiene su credencial lista.

### Paso 3: Acreditación QR e Idempotencia (1 min)
1. Cierra sesión e ingresa como la organizadora: `org@eventovivo.edu` (Contraseña: `Admin123!`).
2. Dirígete a **"Panel Organizador"** en la barra superior.
3. En la sección **"Registro de Acceso en Puerta"**, pega el token de prueba ya emitido para Diego:
   ```
   5f4dcc3b5aa765d61d8327deb882cf99
   ```
4. Haz clic en **"Validar Entrada"**.
5. **Resultado:** El sistema responde de inmediato con:
   > `⚠️ ENTRADA YA REGISTRADA (IDEMPOTENTE)` con la hora original del primer ingreso y los datos de Diego Torres. No se duplica la asistencia.

### Paso 4: Reducción de Aforo o Reprogramación con Efectos Visibles (1 min)
1. En el panel del organizador, revisa las métricas de **"Ocupación de Aforo vs. Asistencia Real en Sala"**.
2. Observa cómo las barras comparan inscritos confirmados contra asistencias validadas en puerta.
3. Observa el promedio global de satisfacción: `⭐ 5.0 / 5.0` proveniente de la encuesta respondida por Diego.

### Paso 5: Exportación CSV de Asistencia (30 seg)
1. En la esquina superior derecha del panel de organizador, haz clic en **"📊 Exportar Asistencia (CSV)"**.
2. Abre el archivo descargado `asistencia_eventovivo.csv` en Excel o bloc de notas.
3. **Resultado:** Contiene la lista consolidada de sesiones, nombres de participantes, correos, estado y marca de tiempo exacta de asistencia.

---

*EventoVivo — Código desarrollado con TDD estricto, Arquitectura Limpia y diseño específico para el contexto universitario.*
