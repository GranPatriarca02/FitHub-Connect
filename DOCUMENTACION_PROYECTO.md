# Proyecto: FitHub Connect

**Trabajo de Fin de Grado (TFG) - Desarrollo de Aplicaciones Multiplataforma (DAM)**

---

## 1. Portada

- **Título del Proyecto**: FitHub Connect
- **Autores**: Iker Lizama , Antonio Nikolaev y Carlos Andres Rojas
- **Instituto**: IES Gaspar Melchor de Jovellanos
- **Ciclo**: Desarrollo de Aplicaciones Multiplataforma (DAM)
- **Profesor Coordinador**: Jose Medina Perez
- **Curso**: 2025/2026

---

## 2. Índice Paginado

1. Portada
2. Índice paginado
3. Resumen
4. Abstract
5. Planteamiento del problema y justificación
6. Desarrollo
   - 6.1 Datos técnicos
   - 6.2 Funcionalidad
   - 6.3 Usabilidad
   - 6.4 Para qué dispositivos sirve
   - 6.5 Rendimiento
   - 6.6 Planificación
   - 6.7 Mantenimiento
   - 6.8 Pruebas
   - 6.9 Módulo de Comunicación en Tiempo Real (Chat)
7. Conclusiones del Proyecto
   - 7.1 Aprendizaje
   - 7.2 Logros
   - 7.3 Futuro
   - 7.4 Retos superados
8. Manual de Usuario
9. Referencias bibliográficas
10. Anexos

---

## 3. Resumen

FitHub Connect es una aplicación móvil diseñada para optimizar la organización del entrenamiento personal. La propuesta central consiste en una plataforma centralizada donde entrenadores y alumnos pueden gestionar rutinas, realizar el seguimiento del progreso y procesar pagos de forma segura. Aunque cuenta con acceso web, la arquitectura está orientada principalmente a dispositivos móviles, optimizando la experiencia en dispositivos portátiles durante el entrenamiento. Para su implementación, se ha utilizado React Native con Expo en el frontend y Kotlin para el desarrollo del servidor.

## 4. Abstract

FitHub Connect is a mobile application designed to optimize personal training management. The core proposal consists of a centralized platform where trainers and students can manage routines, track progress, and process payments securely. While it features web access, the architecture is primarily mobile-oriented, optimizing the user experience for portable devices during training. For its implementation, React Native with Expo was used for the frontend and Kotlin for the server development.

---

## 5. Planteamiento del problema y justificación

### 5.1 Contexto del Mercado

Actualmente, el uso de aplicaciones de fitness es generalizado; sin embargo, muchos entrenadores independientes utilizan herramientas desvinculadas entre sí, lo que conlleva una inversión excesiva de tiempo en tareas administrativas y organizativas.

### 5.2 El problema que hemos visto

A través del análisis del sector, se han identificado varios problemas críticos en la gestión de entrenamientos personales:

1. **Fragmentación de herramientas**: Se utilizan canales independientes (WhatsApp, Excel, pasarelas de pago) para distintas tareas, lo que dificulta el seguimiento centralizado de los alumnos.
2. **Gestión de cobros**: La solicitud manual de pagos y la verificación de transferencias suponen una carga administrativa constante para el profesional.
3. **Soporte técnico limitado**: Los clientes pueden presentar dudas sobre la ejecución correcta de los ejercicios cuando no cuentan con supervisión presencial constante.

### 5.3 Nuestra solución

**FitHub Connect** integra estas funcionalidades en una solución única para facilitar la gestión diaria:

- **Gestión centralizada**: Registro, seguimiento y pagos integrados en una misma plataforma.
- **Suscripciones Premium**: Los monitores pueden ofrecer contenido exclusivo y planes personalizados a sus alumnos.
- **Biblioteca Multimedia**: El cliente dispone de vídeos explicativos para asegurar la ejecución técnica correcta de cada rutina.

---

## 6. Desarrollo

### 6.1 Datos técnicos

#### 6.1.1 Stack Tecnológico Elegido

La elección de las tecnologías se ha basado en criterios de escalabilidad, rendimiento y rapidez de desarrollo:

- **Backend: Kotlin + Ktor**: Lo hemos elegido porque funciona de forma asíncrona, es un lenguaje muy seguro y no gasta mucha memoria en el servidor.
- **Frontend: React Native + Expo**: Nos permite hacer la app para Android e iOS a la vez usando el mismo código.
- **Base de Datos: PostgreSQL**: Es la que mejor conocemos y nos permite relacionar bien todos los datos del sistema.
- **Estilos: Tailwind CSS (NativeWind)**: Nos ha servido para diseñar las pantallas de forma rápida y que todo tenga el mismo estilo.

#### 6.1.2 Infraestructura y Servicios

Para el funcionamiento de la aplicación, hemos seleccionado herramientas que son muy populares actualmente y que facilitan el despliegue y la gestión de infraestructura:

- **Supabase (Base de Datos)**:
  - **Por qué lo elegimos**: Queríamos algo más estructurado que las bases de datos de Firebase. Supabase nos ofrece PostgreSQL, que es lo que hemos aprendido en el ciclo, y nos permite relacionar bien las tablas de usuarios, reservas y monitores.
  - **Cómo lo usamos**: Aquí guardamos toda la información. Es muy cómodo porque nos da una consola web para ver los datos y hace copias de seguridad automáticas para garantizar la integridad de la información.

- **Expo (App Móvil)**:
  - **Por qué lo elegimos**: La configuración de entornos nativos suele presentar una alta complejidad técnica. Expo nos permite probar la app directamente en nuestro móvil con un código QR, lo que nos ha ahorrado mucho tiempo de configuración.
  - **Cómo lo usamos**: Usamos sus librerías para cosas como la cámara o el almacenamiento. Con el servicio EAS, podemos generar el archivo instalable (APK) sin complicaciones.

- **Webdock (Servidor para el Backend)**:
  - **Por qué lo elegimos**: Necesitábamos un sitio donde subir nuestro backend de Kotlin. Webdock es un VPS económico y sencillo de usar que nos deja instalar Java y tener el servidor funcionando las 24 horas.

- **Stripe (Pagos)**:
  - **Por qué lo elegimos**: Es la forma más conocida de integrar pagos en una app. Lo mejor es que ellos se encargan de la seguridad de las tarjetas, así nosotros no tenemos que preocuparnos por guardar datos bancarios, reduciendo el riesgo legal y técnico del proyecto.

- **Brevo (Emails)**:
  - **Por qué lo elegimos**: Necesitábamos una forma de mandar correos de validación al registrarse y avisos de reservas. Brevo es fácil de configurar con SMTP y nos permite mandar cientos de correos al día gratis, lo cual es perfecto para este proyecto.

#### 6.1.3 Cómo está organizada la App (Arquitectura)

Para garantizar un código mantenible y escalable, hemos aplicado una separación de responsabilidades:

- **En el Servidor (Ktor)**:
  1. **Rutas**: Aquí es donde llegan las peticiones de la app y miramos que todo esté bien.
  2. **Base de Datos**: Definimos las tablas que necesitamos.
  3. **Lógica**: Aquí se implementa la lógica de negocio central, como la integración con la pasarela de pagos Stripe.
- **En el Móvil (React Native)**:
  1. **Vistas**: Todo lo que el usuario ve en la pantalla.
  2. **Lógica de pantalla**: Hooks y funciones que controlan lo que pasa cuando pulsas un botón.
  3. **Conexión**: Las funciones que llaman al servidor para pedir o mandar datos.

#### 6.1.4 Seguridad y Protección

Hemos intentado que la aplicación sea lo más segura posible dentro de nuestras posibilidades:

- **Contraseñas**: Nunca guardamos la contraseña tal cual en la base de datos. Usamos una librería llamada **BCrypt** que la encripta para que, si alguien entrara a la base de datos, no pudiera verla.
- **Pagos con Stripe**: Esta es la parte más segura porque nosotros **no tocamos los datos de las tarjetas**. Stripe nos da un "token" y ellos se encargan de todo el proceso bancario, lo que garantiza el cumplimiento de normativas de seguridad bancaria.
- **Limpieza de Datos**: Antes de guardar nada en la base de datos, nos aseguramos de que los datos que manda el usuario no tengan código malicioso que pueda romper el servidor.
- **Manual de instalación**:
  1. Clonar el repositorio.
  2. Ejecutar `.\setup.ps1` en Windows para configurar dependencias automáticamente.
  3. Configurar variables de entorno en `backend/.env` (Supabase, Stripe).
  4. Iniciar backend: `cd backend && ./gradlew run`.
  5. Iniciar móvil: `cd mobile && npx expo start`.

#### 6.1.5 Herramientas de Trabajo

Para organizarnos y que el proyecto saliera adelante, hemos usado estas herramientas:

- **Figma**: Utilizado para el diseño de prototipos de alta fidelidad. Permitió definir la identidad visual (paleta de colores, tipografía) y la disposición de elementos de la interfaz (UI) antes de la fase de desarrollo.
- **GitHub**: Plataforma de control de versiones que facilitó la colaboración simultánea y la integración continua del código entre los miembros del equipo.
- **Postman**: Una herramienta fundamental para probar que el servidor funcionaba bien antes de conectarlo con la aplicación móvil.

### 6.2 Funcionalidad

#### 6.2.1 Qué hace cada parte del sistema

La aplicación está dividida en varias funciones principales:

1. **Usuarios y Cuentas**: Todo lo que tiene que ver con registrarse, entrar a la app y confirmar el correo electrónico.
2. **Buscador de Entrenadores**: Para que los alumnos puedan buscar monitores, ver sus perfiles y qué tal trabajan.
3. **Agenda y Citas**: Donde los monitores ponen cuándo están libres y los alumnos reservan sus clases.
4. **Entrenamientos**: Aquí es donde se crean las rutinas de ejercicios.
5. **Muro Social**: Un pequeño feed donde los usuarios pueden subir fotos de sus progresos, dar likes y comentar.
6. **Pagos y Suscripciones**: Conexión con Stripe para pagos de sesiones sueltas o suscripciones a entrenadores específicos para acceso ilimitado a su contenido y clases.

#### 6.2.2 Diseño de la Base de Datos (E-R)

Se ha diseñado un esquema relacional normalizado para asegurar la integridad de los datos. A continuación se detallan las tablas principales:

| Tabla                 | Descripción                                  | Campos Clave                                                        |
| :-------------------- | :------------------------------------------- | :------------------------------------------------------------------ |
| **Users**             | Entidad base para todos los usuarios.        | `id`, `name`, `email`, `role`, `is_verified`                        |
| **Monitors**          | Información profesional de los entrenadores. | `id`, `user_id` (FK), `specialty`, `hourly_rate`, `bio`             |
| **Availabilities**    | Franjas horarias disponibles para reserva.   | `id`, `monitor_id` (FK), `day_of_week`, `start_time`, `end_time`    |
| **Bookings**          | Reservas de sesiones individuales.           | `id`, `user_id` (FK), `monitor_id` (FK), `date`, `status`, `amount` |
| **Routines**          | Planes de entrenamiento creados.             | `id`, `title`, `creator_id` (FK), `is_public`, `is_premium`         |
| **Exercises**         | Catálogo maestro de ejercicios físicos.      | `id`, `name`, `muscle_group`, `equipment`, `video_url`              |
| **Routine_Exercises** | Detalle de ejercicios dentro de una rutina.  | `id`, `routine_id` (FK), `exercise_id` (FK), `sets`, `reps`, `rest` |
| **Subscriptions**     | Registro de suscripciones premium.           | `id`, `user_id` (FK), `type` ('MONITOR'), `target_id`, `expires_at` |
| **Posts**             | Publicaciones en el feed social.             | `id`, `user_id` (FK), `content`, `image_url`, `created_at`          |

#### 6.2.3 Documentación de la API (Endpoints)

La comunicación entre el frontend y el backend se realiza mediante una API RESTful. Los principales endpoints son:

- **Autenticación (`/auth`)**:
  - `POST /auth/register`: Registro de nuevos usuarios.
  - `POST /auth/login`: Inicio de sesión y obtención de token.
  - `GET /auth/verify/{token}`: Validación de cuenta vía email.
  - `GET /auth/user/{id}`: Obtención de datos de perfil.

- **Monitores (`/monitors`)**:
  - `GET /monitors`: Lista todos los entrenadores activos.
  - `GET /monitors/{id}`: Detalle completo de un entrenador (incluye disponibilidad).
  - `POST /monitors/me/update`: Actualización del perfil profesional (solo para entrenadores).

- **Reservas (`/bookings`)**:
  - `POST /bookings`: Creación de una nueva reserva (flujo nativo).
  - `POST /create-checkout-session`: Inicia el flujo de pago en web.
  - `GET /bookings/user/{userId}`: Historial de reservas del usuario.

- **Suscripciones (`/subscriptions`)**:
  - `GET /subscriptions/check`: Comprueba si el usuario tiene acceso gratuito (por suscripción activa).
  - `POST /subscriptions/intent`: Intento de pago para suscripción a entrenador (móvil).
  - `POST /create-subscription-session`: Sesión Stripe para suscripción a entrenador (web).
  - `GET /subscriptions/user/{userId}`: Lista las suscripciones activas del usuario.

- **Rutinas y Ejercicios (`/routines`, `/exercises`)**:
  - `GET /routines`: Lista rutinas accesibles para el usuario.
  - `POST /routines`: Creación de una nueva rutina.
  - `GET /routines/{id}`: Detalle de rutina con sus ejercicios.
  - `GET /exercises`: Acceso al catálogo maestro de ejercicios.

#### 6.2.4 Snippets de Código Relevantes

Para ilustrar la complejidad técnica del proyecto, se presentan dos fragmentos de código clave:

**Lógica de Reservas (Backend - Kotlin):**
Este fragmento muestra cómo se gestiona la creación de una reserva y la integración con el PaymentIntent de Stripe.

```kotlin
post("/bookings") {
    val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
    val body = call.receive<BookingRequest>()
    transaction {
        val booking = Booking.new {
            this.user = User.findById(userId!!)!!
            this.monitor = Monitor.findById(body.monitorId)!!
            this.date = LocalDateTime.parse("${body.date}T${body.startTime}:00")
            this.status = BookingStatus.PENDING
        }
        val intent = PaymentService.createPaymentIntent(booking.amount, booking.id.value, userId)
        booking.paymentId = intent.id
        call.respond(HttpStatusCode.Created, intent.clientSecret)
    }
}
```

**Sincronización de Sesión (Frontend - React Native):**
Uso de hooks para sincronizar el estado del usuario con el servidor al cargar la aplicación.

```javascript
const loadUserData = async () => {
  const userId = await AsyncStorage.getItem("userId");
  const response = await fetch(`${API_URL}/auth/user/${userId}`);
  if (response.ok) {
    const data = await response.json();
    setRole(data.role);
    setUserName(data.name);
    await AsyncStorage.setItem("userRole", data.role);
  }
};
```

### 6.3 Usabilidad

#### 6.3.1 Ideas de Diseño

- **Identidad Visual (Sistema de Diseño Premium Dark)**: Se ha implementado una estética de "Gama Alta" basada en el contraste de **Negro Puro (#000000)** y **Verde Neón (#22c55e)**, utilizando una paleta coherente para reducir la fatiga visual.
- **Estandarización de Navegación (AppLayout)**: Un componente centralizado gestiona la navegación y el área segura (safe areas) de forma uniforme, evitando interferencias con el hardware del móvil (notch).
- **Diferenciación de Estatus**: Los usuarios Premium y Entrenadores cuentan con anillos distintivos (dorado y verde) y distintivos dinámicos en sus perfiles.
- **Diseño Mobile-First Responsivo**: Cada pantalla se adapta a diferentes tamaños mediante rejillas flexibles y componentes optimizados.
- **Micro-interacciones**: Se han refinado sombras y efectos de hover para una experiencia profesional en PC y móvil.

#### 6.3.2 Descripción Detallada de Pantallas

1. **Pantalla de Inicio (Home)**:
   - Es el centro neurálgico de la app. Muestra un saludo personalizado y una insignia de verificación si el usuario es Premium.
   - Incluye banners dinámicos: "Hazte Premium" para usuarios gratuitos y "Buscador de Monitores" para clientes.
   - Cuadrícula de acciones rápidas: Monitores, Rutinas, Comunidad y Vídeos.

2. **Explorador de Monitores**:
   - Lista vertical con tarjetas de entrenadores. Cada tarjeta muestra foto (avatar), especialidad, valoración por estrellas y precio por hora.
   - Filtros superiores por especialidad (Yoga, CrossFit, etc.) para una búsqueda eficiente.

3. **Perfil del Monitor (Detalle)**:
   - Cabecera con biografía extendida.
   - Selector de fechas y horas basado en la disponibilidad real del profesional.
   - Botón de "Reservar y Pagar" que integra el flujo de Stripe.

4. **Gestor de Rutinas**:
   - Listado de rutinas propias y públicas.
   - Detalle de rutina: Lista de ejercicios con su orden, series y repeticiones.
   - Reproductor de vídeo integrado para consultar la técnica de cada ejercicio.

5. **Gestor de Disponibilidad (Trainer-only)**:
   - Pantalla exclusiva para el monitor donde puede definir sus franjas de trabajo de forma rápida.
   - Incluye un **Resumen Semanal Minimalista** basado en indicadores de puntos que permite al profesional ver su carga semanal de un vistazo sin saturar la interfaz.

6. **Muro Social y Comunidad**:
   - Feed dinámico para compartir progresos. Se ha optimizado el diseño de los botones de interacción y las sombras para evitar fallos visuales en navegadores de PC.

#### 6.3.3 Casos de Uso Formales

**Caso de Uso 1: Reserva de sesión con Monitor**

- **Actor**: Cliente (Usuario Member/Premium).
- **Pre-condiciones**: El usuario debe estar autenticado y tener una cuenta activa.
- **Flujo Principal**:
  1. El usuario accede a "Monitores".
  2. Selecciona un monitor de la lista.
  3. Revisa la disponibilidad y elige una franja horaria.
  4. Pulsa "Confirmar Reserva".
  5. Se abre la pasarela de Stripe.
  6. Tras el pago, la reserva aparece en "Mis Citas".
- **Post-condiciones**: Se descuenta el importe al cliente y se notifica al monitor.

**Caso de Uso 2: Creación de Rutina Premium**

- **Actor**: Entrenador (Usuario Trainer).
- **Pre-condiciones**: El usuario debe tener el rol de monitor activo.
- **Flujo Principal**:
  1. El monitor accede a "Mis Rutinas".
  2. Pulsa en "Crear Nueva".
  3. Define título, objetivo y marca la casilla "Premium".
  4. Añade ejercicios del catálogo maestro, definiendo sets y reps.
  5. Guarda la rutina.
- **Post-condiciones**: La rutina solo es visible para los alumnos suscritos a dicho monitor.

### 6.4 Para qué dispositivos sirve (Portabilidad)

Aunque el enfoque principal es la movilidad, la solución es compatible con diversos entornos:

1. **Móvil (Android e iOS)**: Es donde mejor funciona. Al usar React Native, la app se siente rápida y "natural" tanto en móviles Android como en iPhones.
2. **Web**: Gracias a Expo, también se puede abrir desde un navegador en el ordenador. Esto permite la consulta de rutinas y gestión de perfiles desde estaciones de trabajo fijas.
3. **El Servidor**: El programa que controla todo (el backend) puede funcionar en cualquier servidor Linux, como el que tenemos alquilado en Webdock.

### 6.5 Cómo va de rápida la App (Rendimiento)

Hemos intentado que la aplicación no sea pesada y que funcione bien en cualquier móvil:

- **Carga rápida**: Las listas de ejercicios y el muro social cargan poco a poco para que la memoria del móvil no se llene.
- **Base de datos**: Usamos un sistema que hace que las consultas a la base de datos sean rápidas, para que no haya que esperar mucho al cargar el perfil.
- **Fotos y vídeos**: Intentamos que los archivos multimedia no pesen demasiado para no gastar todos los datos del usuario.

### 6.6 Cómo nos hemos organizado (Planificación)

Hemos dividido el trabajo en 4 etapas principales durante estos meses:

1. **Pensar y diseñar**: Decidir qué iba a hacer la app, cómo iba a ser la base de datos y dibujar las pantallas.
2. **Desarrollo del Backend**: Implementación del núcleo del sistema y su integración con la base de datos y servicios de mensajería.
3. **Hacer la app**: Montar todas las pantallas del móvil, conectarlas con el servidor y poner los pagos con Stripe.
4. **Validación y Despliegue**: Pruebas de calidad, despliegue del servidor en un entorno de producción real (Webdock) y verificación final.

### 6.7 Mantenimiento y Despliegue

Para que la app esté siempre funcionando, hemos pensado en un plan de mantenimiento sencillo:

1. **El Servidor**: Subimos el programa al VPS de Webdock. Si alguna vez se cae, podemos reiniciarlo fácilmente desde su panel de control.
2. **La Base de Datos**: Como usamos Supabase, no tenemos que preocuparnos de que se rompa el disco duro del servidor, porque ellos se encargan de que los datos estén seguros.
3. **Actualizaciones**: Si queremos cambiar algo en la app móvil, usamos Expo para generar una nueva versión y que los usuarios se la puedan descargar.

### 6.8 Pruebas

Para estar seguros de que todo funciona antes de la entrega, hemos hecho estas pruebas:

| Prueba              | Qué queríamos mirar                                      | Resultado |
| :------------------ | :------------------------------------------------------- | :-------- |
| **Registro**        | Que mande el email de validación correctamente.          | **OK**    |
| **Login**           | Que no deje entrar si la contraseña está mal.            | **OK**    |
| **Reserva**         | Que una hora ocupada ya no aparezca disponible.          | **OK**    |
| **Pago Stripe**     | Que tras pagar, el estado de la reserva pase a "Pagado". | **OK**    |
| **Premium**         | Que un usuario gratis no pueda ver rutinas privadas.     | **OK**    |
| **Multiplataforma** | Que la app se vea igual de bien en Android y iPhone.     | **OK**    |

### 6.9 Módulo de Comunicación en Tiempo Real (Chat)

Para potenciar la interacción dentro de la economía de creadores (Creator Economy) y mitigar el soporte técnico limitado fuera de las sesiones presenciales, se ha diseñado e implementado un módulo de mensajería bidireccional instantánea. Este sistema permite una comunicación fluida entre los entrenadores y sus alumnos suscritos en caliente.

#### 6.9.1 Arquitectura e Infraestructura del Chat

El sistema híbrido combina una API REST tradicional para operaciones de consulta masiva o persistencia diferida, y un canal de WebSockets full-duplex gestionado de forma asíncrona por el servidor Ktor.

- **Persistencia**: Cada mensaje se registra en un esquema relacional normalizado mediante el ORM Kotlin Exposed.
- **Sesiones Activas**: El servidor mantiene un mapa concurrente en memoria (sessions) que vincula el identificador único del usuario (userId) con su canal de WebSocket abierto.
- **Control de Concurrencia**: El flujo de WebSocket incorpora un mecanismo de limpieza para desconectar automáticamente sesiones duplicadas o colgadas si el mismo usuario inicia sesión desde otro dispositivo.

#### 6.9.2 Diseño de la Base de Datos (E-R)

Para el soporte de esta funcionalidad, se ha añadido al esquema relacional de PostgreSQL la entidad maestra de mensajes.

**Tabla: chat_messages**
Representa el histórico de interacciones entre usuarios de la plataforma.

| Campo | Tipo de Datos | Restricciones / Descripción |
| :--- | :--- | :--- |
| id | Serial (Int) | Clave Primaria (PK). Identificador autoincremental del mensaje. |
| sender_id | Int | Clave Foránea (FK) referenciada a users. Usuario que emite el mensaje. |
| receiver_id | Int | Clave Foránea (FK) referenciada a users. Usuario que recibe el mensaje. |
| content | Text | Contenido textual del mensaje enviado. |
| created_at | DateTime | Fecha y hora exacta de la creación en formato UTC (por defecto, tiempo del sistema). |
| is_read | Boolean | Estado de lectura del mensaje (por defecto, false). |

#### 6.9.3 Documentación de la API y Protocolo de Comunicación

**Endpoints HTTP (REST)**
La comunicación tradicional mediante HTTP se utiliza para la carga inicial de datos en la interfaz móvil.

- **POST `/social/chat/send`**
  - **Descripción**: Envío de mensajes por fallback HTTP (mantenido por compatibilidad). Registra el mensaje en base de datos y lo reenvía al canal WebSocket del receptor si este se encuentra en línea.
  - **Cabeceras**: `X-User-Id: Int` (ID del emisor).
  - **Respuesta**: `201 Created` con el objeto `ChatMessageResponse`.

- **GET `/social/chat/history/{otherUserId}`**
  - **Descripción**: Recupera el histórico de la conversación ordenada cronológicamente entre el usuario autenticado y un tercero.
  - **Respuesta**: `200 OK` con un listado JSON de mensajes ordenados de forma ascendente por su fecha de creación.

- **GET `/social/chat/contacts`**
  - **Descripción**: Obtiene la lista de contactos válidos basada en el modelo de suscripciones por entrenador. Si el usuario es un TRAINER, extrae sus alumnos activos; si es un usuario básico (FREE), extrae los entrenadores a los que está suscrito. Calcula dinámicamente el conteo de mensajes no leídos (unread) y su estado de conexión (isOnline).

- **POST `/social/chat/read`**
  - **Descripción**: Transiciona el estado de `is_read` a `true` para todos los mensajes recibidos de un emisor específico.

**Eventos WebSocket (`/chat/{userId}`)**
El canal WebSocket maneja una arquitectura orientada a eventos mediante el intercambio de tramas de texto en formato JSON (`Frame.Text`). El ciclo de vida de la conexión opera bajo los siguientes payloads estructurados:

- **Mantenimiento de Canal (PING -> PONG)**: Evita que el socket muera por inactividad o timeouts impuestos por pasarelas de red o el hosting VPS.

```json
// Cliente envía
{ "type": "PING" }
// Servidor responde
{ "type": "PONG" }
```

- **Transmisión en Tiempo Real (SEND_MESSAGE)**: El cliente envía un texto indicando el destino. El servidor lo persiste en base de datos, le asigna su ID definitivo de base de datos y lo despacha de forma asíncrona tanto al emisor (como confirmación de guardado) como al receptor si posee sesión activa.

```json
{
  "type": "SEND_MESSAGE",
  "receiverId": 45,
  "content": "Hola, ¿mañana mantenemos la rutina de pierna?"
}
```

- **Confirmación de Lectura (READ_EVENT)**: Notifica de forma reactiva al emisor original que sus mensajes han sido abiertos en la pantalla del receptor.

```json
{ "type": "READ_EVENT", "senderId": 12 }
```

#### 6.9.4 Fragmentos de Código Críticos (Backend)

**1. Definición del Modelo DAO (Exposed)**
La representación orientada a objetos del mensaje mapea las relaciones de integridad referencial con la entidad de usuarios.

```kotlin
object ChatMessages : IntIdTable("chat_messages") {
    val senderId = reference("sender_id", Users)
    val receiverId = reference("receiver_id", Users)
    val content = text("content")
    val createdAt = datetime("created_at").default(LocalDateTime.now(ZoneOffset.UTC))
    val isRead = bool("is_read").default(false)
}

class ChatMessage(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ChatMessage>(ChatMessages)

    var sender by User referencedOn ChatMessages.senderId
    var receiver by User referencedOn ChatMessages.receiverId
    var content by ChatMessages.content
    var createdAt by ChatMessages.createdAt
    var isRead by ChatMessages.isRead
}
```

**2. Pipeline de Gestión de Sesiones y Estado Online (WebSocket Routing)**
Este fragmento controla el ciclo de vida completo de la conexión TCP persistente, la mutación segura del estado isOnline en la base de datos y la propagación reactiva del estado a toda la red de contactos (broadcast).

```kotlin
webSocket("/chat/{userId}") {
    val myId = call.parameters["userId"]?.toIntOrNull() ?: return@webSocket
    
    // Forzar cierre de sesiones colgadas o duplicadas en caliente
    sessions[myId]?.let { oldSession ->
        try { oldSession.close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Nueva conexión detectada")) } catch(_: Exception){}
    }
    
    sessions[myId] = this

    // Cambiar estado a ONLINE en la Base de Datos de forma limpia
    transaction {
        val user = User.findById(myId)
        user?.isOnline = true
    }
    broadcastStatusChange(myId, isOnline = true)

    try {
        for (frame in incoming) {
            if (frame is Frame.Text) {
                val text = frame.readText()
                val json = Json.parseToJsonElement(text).jsonObject
                
                when (json["type"]?.jsonPrimitive?.content) {
                    "PING" -> {
                        try { send(Frame.Text(buildJsonObject { put("type", "PONG") }.toString())) } catch (_: Exception) {}
                    }
                    "SEND_MESSAGE" -> {
                        val rId = json["receiverId"]?.jsonPrimitive?.int ?: continue
                        val messageContent = json["content"]?.jsonPrimitive?.content ?: ""
                        
                        val savedMsgPayload = transaction {
                            val s = User.findById(myId)
                            val r = User.findById(rId)
                            if (s != null && r != null) {
                                val msg = ChatMessage.new { sender = s; receiver = r; content = messageContent; isRead = false }
                                commit()
                                
                                buildJsonObject {
                                    put("type", "MESSAGE")
                                    put("id", msg.id.value)
                                    put("senderId", myId)
                                    put("receiverId", rId)
                                    put("content", messageContent)
                                    put("createdAt", System.currentTimeMillis())
                                    put("isRead", false)
                                }.toString()
                            } else null
                        }

                        if (savedMsgPayload != null) {
                            sessions[rId]?.let { receiverSession ->
                                try { receiverSession.send(Frame.Text(savedMsgPayload)) } catch (_: Exception) {}
                            }
                            try { this.send(Frame.Text(savedMsgPayload)) } catch (_: Exception) {}
                        }
                    }
                    "READ_EVENT" -> {
                        val sId = json["senderId"]?.jsonPrimitive?.int ?: continue
                        val confirmation = buildJsonObject {
                            put("type", "READ_CONFIRMATION")
                            put("readerId", myId)
                        }.toString()
                        sessions[sId]?.let { try { it.send(Frame.Text(confirmation)) } catch (_: Exception) {} }
                    }
                }
            }
        }
    } catch (e: Exception) {
        // Maneja cierres inesperados de conexión de la app móvil
    } finally {
        // SÍ O SÍ: Limpieza de sesión y paso a OFFLINE definitivo cuando muere el canal
        sessions.remove(myId)
        transaction {
            val user = User.findById(myId)
            user?.isOnline = false
        }
        broadcastStatusChange(myId, isOnline = false)
    }
}
```

#### 6.9.5 Manual de Usuario Relacionado

- **Uso de la mensajería privada**: Los usuarios disponen de un acceso directo a la zona de mensajería desde su área de contactos, vinculada estrictamente al estado de sus suscripciones vigentes.
- **Indicadores visuales**: La interfaz muestra dinámicamente un punto indicador de color verde si el entrenador o alumno se encuentra con la app abierta en primer plano (`isOnline = true`), un contador numérico con los mensajes pendientes de lectura y la doble verificación visual de mensaje leído reactiva al flujo de eventos del servidor.

---

## 7. Conclusión del Proyecto

### 7.1 Aprendizaje

El desarrollo de este proyecto ha permitido consolidar los conocimientos adquiridos en el ciclo de DAM. El proceso ha abarcado desde la programación hasta la gestión de infraestructuras de servidor, integración de pasarelas de pago y diseño de esquemas de datos complejos. Esta experiencia ha proporcionado una visión integral del ciclo de vida de desarrollo de software profesional.

### 7.2 Logros

- La integración con Stripe funciona y permite hacer pagos reales (en modo prueba) tanto en móvil (PaymentSheet) como en PC (Checkout Sessions).
- Los niveles de usuario están bien diferenciados: **Gratis** (pago por uso) y **Suscrito a Entrenador** (acceso libre a un monitor específico).
- La app funciona tanto en Android como en iPhone y Navegador Web, con flujos de pago adaptados a cada plataforma.

### 7.3 Futuro

Como el proyecto siempre se puede mejorar y ampliar, hemos pensado en algunas ideas que podrían ser el siguiente paso:

1. **Notificaciones Push**: Para que el móvil te avise en tiempo real de citas, mensajes o nuevas rutinas publicadas.
2. **Recomendaciones Inteligentes (IA)**: Implementación de un asistente virtual que, basándose en las características, objetivos y preferencias introducidas por el usuario, recomiende los entrenadores más adecuados para su perfil.
3. **Módulo de Nutrición**: Para que los monitores también puedan subir planes de comidas y seguimiento de macros.
4. **Foro de Tiendas Fitness**: Un espacio comunitario donde los usuarios puedan debatir sobre productos, equipamiento y recomendar tiendas especializadas.
5. **Autenticación Extendida**: Integración de **Google Login** y Apple ID para facilitar el acceso rápido y seguro sin necesidad de formularios manuales.
6. **Compartir Multimedia en el Muro Social**: Permitir que los usuarios puedan subir fotos y vídeos de sus entrenamientos directamente en el Muro Social, para mejorar la interacción y motivar a la comunidad.

### 7.4 Retos superados

Durante el desarrollo han surgido diversos desafíos técnicos que han requerido una investigación profunda y resolución de problemas complejos:

- **Configuración de red e IP**: Inicialmente se identificaron fallos de comunicación entre la aplicación móvil y el servidor local. El análisis reveló que el acceso mediante `localhost` no era viable desde dispositivos físicos, lo que requirió la configuración dinámica de la IP del host en las variables de entorno para habilitar la comunicación en red local.
- **Webhooks de Stripe**: La sincronización de estados de pago requirió la implementación de webhooks. Stripe notifica eventos de pago de forma asíncrona al servidor, lo que obligó a configurar un túnel de comunicación y un endpoint específico para procesar estas confirmaciones en tiempo real.
- **Las variables de entorno**: Manejar las claves secretas de Stripe y las URLs de Supabase sin que se subieran a GitHub fue un reto. Tuvimos que aprender a usar archivos `.env` tanto en el servidor como en el móvil para que todo fuera seguro y funcionara igual en cualquier ordenador.
- **Conflictos de versiones**: La gestión de dependencias presentó desafíos significativos. Las incompatibilidades entre versiones de Node, Gradle y librerías de Expo requirieron un análisis exhaustivo de los registros de error y un control estricto de las actualizaciones de paquetes.
- **Navegación y Flujos (Routing)**: La configuración de flujos de navegación complejos, como la redirección condicional basada en el estado de autenticación, supuso un reto para garantizar una experiencia de usuario sin bloqueos y con una gestión de historial coherente.
- **Consistencia Visual Multiplataforma**: Se identificaron disparidades visuales entre Android e iOS, especialmente en la gestión de áreas seguras (Safe Areas) y elementos específicos del hardware como el "notch". Se implementaron ajustes de estilo condicionales para asegurar la homogeneidad visual en ambos sistemas.
- **Integración con Brevo**: La implementación del servicio de mensajería presentó retos técnicos relacionados con la configuración de puertos SMTP y autenticación de API para asegurar la correcta entrega de correos electrónicos.
- **Diseño Responsive**: Que los botones y textos se vieran bien tanto en un móvil pequeño como en una tablet nos dio mucho trabajo con NativeWind, pero al final conseguimos que la app sea cómoda de usar en cualquier pantalla.

---

## 8. Manual de Usuario

### 8.1 Para Clientes (Member/Premium)

1. **Registro**: Introduce tus datos y confirma el email. Sin la confirmación, no podrás acceder a las funciones de reserva.
2. **Búsqueda**: Utiliza los filtros superiores para encontrar un entrenador especializado en lo que necesitas.
3. **Reserva**: Elige una hora verde (disponible). Las rojas ya están ocupadas por otros usuarios.
4. **Pago y Planes**: Puedes pagar sesiones sueltas o elegir la **Suscripción a Monitor** para tener acceso ilimitado a un entrenador específico. Una vez confirmado el pago, las horas de reserva te aparecerán como gratuitas.

### 8.2 Para Entrenadores (Trainer)

1. **Perfil**: Es vital que rellenes tu biografía y precio por hora para aparecer en el marketplace.
2. **Disponibilidad**: Marca las horas que vas a trabajar. Si no marcas ninguna, los clientes no podrán contratarte.
3. **Rutinas**: Crea planes de entrenamiento. Si marcas una rutina como "Pública", cualquier usuario podrá verla. Si es "Premium", solo tus suscriptores de pago tendrán acceso.

### 8.3 Uso del Muro Social

1. **Publicar**: Desde la pantalla de Comunidad, pulsa el botón de "+" para subir una foto de tu entreno y poner un texto.
2. **Interactuar**: Puedes ver lo que suben otros usuarios, darles "Me gusta" y poner comentarios para animarles.

### 8.4 Resolución de Problemas Comunes

- **Error de Conexión**: Asegúrate de tener conexión a internet estable. Si el problema persiste, el servidor backend podría estar en mantenimiento.
- **Pago rechazado**: Verifica que estás usando una tarjeta válida en el entorno de pruebas de Stripe.

---

## 9. Referencias bibliográficas

1. Documentación oficial de Ktor (https://ktor.io/docs/)
2. Documentación oficial de React Native & Expo (https://docs.expo.dev/)
3. Guía de integración de Stripe API (https://stripe.com/docs/api)
4. Kotlin Exposed ORM Wiki (https://github.com/JetBrains/Exposed/wiki)
5. Stack Overflow y Comunidad de Desarrolladores (Consultas técnicas diversas).

---

## 10. Anexos

- 10.1 Historial de Cambios y Evolución Arquitectónica

- **Repositorio de Código**: El código fuente completo, tanto del backend como del frontend móvil, se encuentra disponible en GitHub para su revisión técnica: [FitHub-Connect en GitHub](https://github.com/GranPatriarca02/FitHub-Connect)

### 10.1 Historial de Cambios y Evolución Arquitectónica

A lo largo de las etapas finales del desarrollo, la plataforma FitHub Connect experimentó una evolución significativa en su modelo de negocio y arquitectura subyacente para alinearse mejor con las dinámicas de la economía de los creadores (Creator Economy):

**Transición al Modelo de Suscripciones por Entrenador (Trainer-Centric Model)**
Originalmente, el sistema contemplaba un rol `GLOBAL_PREMIUM` que otorgaba a los usuarios acceso ilimitado a todos los entrenadores y rutinas de la plataforma mediante un pago único o suscripción general. Tras reevaluar el enfoque del producto, se determinó que este modelo desincentivaba a los entrenadores y centralizaba excesivamente la monetización.

Por tanto, se llevó a cabo una refactorización estructural completa:

- **Eliminación del Rol Premium Global:** Se eliminó por completo el rol `GLOBAL_PREMIUM` (y su predecesor genérico `PREMIUM`) de la base de datos y de la lógica de autorización. El sistema ahora opera exclusivamente con los roles `FREE` y `TRAINER` (y roles administrativos).
- **Control de Acceso Basado en Patrocinios:** El acceso a contenido restringido (vídeos premium, rutinas exclusivas y reservas de sesiones gratuitas) ya no depende del rol del usuario, sino de la existencia de un registro activo en la tabla de `Subscriptions` que vincule al usuario directamente con el creador de dicho contenido.
- **Límite de Reservas Gratuitas:** Para evitar el abuso de la agenda de los entrenadores por parte de usuarios suscritos, se ha implementado un límite de **4 horas mensuales gratuitas**. El backend calcula dinámicamente las horas consumidas en el ciclo de facturación actual. Si un usuario excede este límite, el sistema calcula automáticamente el precio de las horas extra y redirige al flujo de pago de Stripe.
- **Limpieza Perezosa (Lazy Cleanup) de Reservas:** Cuando un usuario intenta realizar un pago mediante Stripe, la reserva se bloquea temporalmente en estado `PENDING` para evitar dobles reservas. Para solucionar los carritos abandonados que bloqueaban horas indefinidamente, se ha implementado un mecanismo de "Limpieza Perezosa": el servidor elimina automáticamente las reservas `PENDING` con más de 15 minutos de antigüedad cada vez que alguien consulta la disponibilidad de la agenda, liberando así los huecos abandonados sin necesidad de tareas programadas (cron jobs).
- **Limpieza de Webhooks e Interfaz:** Se actualizaron los procesadores de pagos de Stripe para gestionar únicamente suscripciones específicas. La interfaz móvil fue rediseñada para ocultar las opciones de "Premium Global", mostrando en su lugar el estado dinámico "ACTIVA" basado en el conteo de suscripciones vigentes del usuario, e incorporando distintivos premium (halo dorado y estrella) de forma reactiva al estado de suscripción.

#### Últimos Commits (Registro de Cambios Recientes)

A continuación se expone el registro de los últimos commits realizados durante esta fase de pulido y transición arquitectónica, reflejando el trabajo técnico llevado a cabo en el repositorio:

```text
98c6a8f Refactor: Eliminación total del rol PREMIUM obsoleto
eee5fca Docs: Actualización de documentación tras cambios en la monetización
8e0b38c Refactor: Transición al modelo de suscripciones por entrenador
0c9d52c Fix: Mejoras en UI y validacion de disponibilidad y vídeos
c3b4846 docs: actualizar documentación técnica con el nuevo sistema de suscripciones y endpoints
c6937f9 ui: actualizar indicadores premium y visibilidad de botones para planes globales
44a5dca fix: corregir pasarela de pagos Stripe y configuración de metadatos
8f5c870 feat: implementar rol GLOBAL_PREMIUM y lógica de acceso segmentada por entrenador
d307ff1 refactor: Sistema de notificaciones por base de datos
```
