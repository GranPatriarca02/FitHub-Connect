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
6. **Pagos y Premium**: La parte que conecta con Stripe para pagar sesiones sueltas o hacerse Premium.

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
| **Subscriptions**     | Registro de suscripciones premium.           | `id`, `user_id` (FK), `monitor_id` (FK), `status`, `expires_at`     |
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

- **Identidad Visual (Adaptación de Plantilla Premium)**: Para garantizar un acabado visual de alta calidad, se ha utilizado una **plantilla de diseño profesional** como base, la cual ha sido **completamente adaptada y personalizada** para encajar con la identidad de FitHub Connect. Se ha realizado una transición integral desde los colores originales hacia una estética de "Gama Alta" basada en el contraste de **Negro Puro (#000000)** y **Verde Neón (#22c55e)**.
- **Personalización de Colores**: Hemos sustituido todos los elementos visuales genéricos por una paleta propia donde el verde destaca las acciones clave y los fondos negros neutros eliminan distracciones, mejorando el enfoque en el entrenamiento.
- **Facilidad**: Los botones presentan dimensiones optimizadas para facilitar la interacción durante la actividad física. Hemos implementado transiciones fluidas y micro-animaciones en los componentes para mejorar la experiencia de usuario.

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

5. **Panel del Entrenador**:
   - Vista exclusiva para el rol TRAINER.
   - Permite gestionar su biografía, precio y horarios de trabajo.
   - Herramienta de edición de rutinas para asignar entrenamientos a sus alumnos.

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

---

## 7. Conclusión del Proyecto

### 7.1 Aprendizaje

El desarrollo de este proyecto ha permitido consolidar los conocimientos adquiridos en el ciclo de DAM. El proceso ha abarcado desde la programación hasta la gestión de infraestructuras de servidor, integración de pasarelas de pago y diseño de esquemas de datos complejos. Esta experiencia ha proporcionado una visión integral del ciclo de vida de desarrollo de software profesional.

### 7.2 Logros

- La integración con Stripe funciona y permite hacer pagos reales (en modo prueba).
- Los tres tipos de usuarios (Gratis, Premium y Entrenador) están bien diferenciados y cada uno tiene sus funciones.
- La app funciona tanto en Android como en iPhone sin tener que haber hecho dos códigos distintos, lo que nos ha ahorrado muchísimo trabajo.

### 7.3 Futuro

Como el proyecto siempre se puede mejorar y ampliar, hemos pensado en algunas ideas que podrían ser el siguiente paso:

1. **Notificaciones Push**: Para que el móvil te avise en tiempo real de citas, mensajes o nuevas rutinas publicadas.
2. **Recomendaciones Inteligentes (IA)**: Implementación de un asistente virtual que, basándose en las características, objetivos y preferencias introducidas por el usuario, recomiende los entrenadores más adecuados para su perfil.
3. **Módulo de Nutrición**: Para que los monitores también puedan subir planes de comidas y seguimiento de macros.
4. **Foro de Tiendas Fitness**: Un espacio comunitario donde los usuarios puedan debatir sobre productos, equipamiento y recomendar tiendas especializadas.
5. **Autenticación Extendida**: Integración de **Google Login** y Apple ID para facilitar el acceso rápido y seguro sin necesidad de formularios manuales.

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
4. **Pago**: Introduce los datos de tu tarjeta de prueba de Stripe. Una vez confirmado, verás tu cita en el calendario.

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

- **Repositorio de Código**: El código fuente completo, tanto del backend como del frontend móvil, se encuentra disponible en GitHub para su revisión técnica: [FitHub-Connect en GitHub](https://github.com/GranPatriarca02/FitHub-Connect)
