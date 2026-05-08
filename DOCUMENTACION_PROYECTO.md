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

FitHub Connect es una aplicación móvil diseñada para ayudar a organizar mejor el entrenamiento personal. La idea principal es que tanto los entrenadores como los alumnos tengan un sitio único donde verse, gestionar rutinas y hacer pagos de forma segura. Aunque se puede entrar por web, la app está pensada sobre todo para el móvil, que es lo que llevamos encima en el gimnasio. Para hacerla, hemos usado React Native con Expo para la parte visual y Kotlin para el servidor.

## 4. Abstract

FitHub Connect is a mobile app to help organize personal training. The main goal is for trainers and students to have one place to manage routines and payments safely. While there is a web version, the app is made for mobile devices since people use them at the gym. We built it using React Native with Expo for the front-end and Kotlin for the server.

---

## 5. Planteamiento del problema y justificación

### 5.1 Contexto del Mercado
Hoy en día casi todo el mundo usa aplicaciones para el gimnasio, pero muchos entrenadores personales que trabajan por su cuenta siguen usando herramientas que no están conectadas entre sí. Esto hace que pierdan mucho tiempo organizando las cosas.

### 5.2 El problema que hemos visto
Después de hablar con algunos entrenadores, nos dimos cuenta de que tienen varios problemas:
1. **Demasiadas aplicaciones**: Usan WhatsApp para hablar, Excel para las rutinas y Bizum o PayPal para los pagos. Al final es un lío tener todo separado.
2. **Pagos manuales**: Tener que ir pidiendo el dinero o comprobar si alguien ha pagado es una pérdida de tiempo.
3. **Pérdida de información**: A veces los clientes no saben cómo hacer bien un ejercicio y el entrenador no siempre puede estar delante para recordárselo.

### 5.3 Nuestra solución
**FitHub Connect** quiere juntar todo esto en una sola aplicación para que sea más fácil para todos:
- **Todo en uno**: Desde registrarse hasta pagar, todo se hace desde la misma app.
- **Suscripciones**: Los monitores pueden crear contenido "Premium" para sus alumnos.
- **Vídeos y Rutinas**: El cliente siempre tiene sus ejercicios a mano con vídeos para ver cómo se hacen correctamente.

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

Para el funcionamiento de la aplicación, hemos seleccionado herramientas que son muy populares actualmente y que facilitan el despliegue sin ser expertos en sistemas:

- **Supabase (Base de Datos)**:
  - **Por qué lo elegimos**: Queríamos algo más estructurado que las bases de datos de Firebase. Supabase nos ofrece PostgreSQL, que es lo que hemos aprendido en el ciclo, y nos permite relacionar bien las tablas de usuarios, reservas y monitores.
  - **Cómo lo usamos**: Aquí guardamos toda la información. Es muy cómodo porque nos da una consola web para ver los datos y hace copias de seguridad automáticas por si acaso.

- **Expo (App Móvil)**:
  - **Por qué lo elegimos**: Configurar Android Studio o Xcode puede ser muy complicado al principio. Expo nos permite probar la app directamente en nuestro móvil con un código QR, lo que nos ha ahorrado mucho tiempo de configuración.
  - **Cómo lo usamos**: Usamos sus librerías para cosas como la cámara o el almacenamiento. Con el servicio EAS, podemos generar el archivo instalable (APK) sin complicaciones.

- **Webdock (Servidor para el Backend)**:
  - **Por qué lo elegimos**: Necesitábamos un sitio donde subir nuestro backend de Kotlin. Webdock es un VPS económico y sencillo de usar que nos deja instalar Java y tener el servidor funcionando las 24 horas.

- **Stripe (Pagos)**:
  - **Por qué lo elegimos**: Es la forma más conocida de integrar pagos en una app. Lo mejor es que ellos se encargan de la seguridad de las tarjetas, así nosotros no tenemos que preocuparnos por guardar datos bancarios, reduciendo el riesgo legal y técnico del proyecto.

- **Brevo (Emails)**:
  - **Por qué lo elegimos**: Necesitábamos una forma de mandar correos de validación al registrarse y avisos de reservas. Brevo es fácil de configurar con SMTP y nos permite mandar cientos de correos al día gratis, lo cual es perfecto para este proyecto.

#### 6.1.3 Cómo está organizada la App (Arquitectura)
Para que el código no sea un caos y sea fácil de mantener, hemos separado las cosas:

- **En el Servidor (Ktor)**:
  1. **Rutas**: Aquí es donde llegan las peticiones de la app y miramos que todo esté bien.
  2. **Base de Datos**: Definimos las tablas que necesitamos.
  3. **Lógica**: Aquí es donde pasa "la magia", como cuando nos conectamos con Stripe para los pagos.
- **En el Móvil (React Native)**:
  1. **Vistas**: Todo lo que el usuario ve en la pantalla.
  2. **Lógica de pantalla**: Hooks y funciones que controlan lo que pasa cuando pulsas un botón.
  3. **Conexión**: Las funciones que llaman al servidor para pedir o mandar datos.

#### 6.1.4 Seguridad y Protección
Hemos intentado que la aplicación sea lo más segura posible dentro de nuestras posibilidades:
- **Contraseñas**: Nunca guardamos la contraseña tal cual en la base de datos. Usamos una librería llamada **BCrypt** que la encripta para que, si alguien entrara a la base de datos, no pudiera verla.
- **Pagos con Stripe**: Esta es la parte más segura porque nosotros **no tocamos los datos de las tarjetas**. Stripe nos da un "token" y ellos se encargan de todo el proceso bancario, lo que nos quita un peso de encima.
- **Limpieza de Datos**: Antes de guardar nada en la base de datos, nos aseguramos de que los datos que manda el usuario no tengan código malicioso que pueda romper el servidor.
- **Manual de instalación**:
  1. Clonar el repositorio.
  2. Ejecutar `.\setup.ps1` en Windows para configurar dependencias automáticamente.
  3. Configurar variables de entorno en `backend/.env` (Supabase, Stripe).
  4. Iniciar backend: `cd backend && ./gradlew run`.
  5. Iniciar móvil: `cd mobile && npx expo start`.

#### 6.1.5 Herramientas de Trabajo
Para organizarnos y que el proyecto saliera adelante, hemos usado estas herramientas:
- **Figma**: Aquí es donde dibujamos cómo queríamos que fueran las pantallas antes de ponernos a programar. Nos sirvió para decidir los colores y dónde poner los botones.
- **GitHub**: Lo hemos usado para guardar el código y trabajar los tres a la vez sin pisarnos los cambios.
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

Para la apariencia de FitHub Connect, hemos buscado un estilo que se vea moderno pero que sea fácil de usar. Hemos elegido un "Modo Oscuro" porque cansa menos la vista cuando estás en el gimnasio.

- **Colores**: Usamos el verde (#4CAF50) para destacar los botones importantes y que el usuario sepa dónde tiene que pulsar.
- **Facilidad**: Los botones son grandes para que se puedan pulsar bien incluso si estás haciendo ejercicio. Hemos puesto animaciones sencillas para que la app no parezca "estática".

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
Aunque nos hemos centrado sobre todo en el móvil, la aplicación puede funcionar en varios sitios:

1. **Móvil (Android e iOS)**: Es donde mejor funciona. Al usar React Native, la app se siente rápida y "natural" tanto en móviles Android como en iPhones.
2. **Web**: Gracias a Expo, también se puede abrir desde un navegador en el ordenador. Esto está bien por si alguien quiere mirar sus rutinas en una pantalla más grande.
3. **El Servidor**: El programa que controla todo (el backend) puede funcionar en cualquier servidor Linux, como el que tenemos alquilado en Webdock.

### 6.5 Cómo va de rápida la App (Rendimiento)
Hemos intentado que la aplicación no sea pesada y que funcione bien en cualquier móvil:
- **Carga rápida**: Las listas de ejercicios y el muro social cargan poco a poco para que la memoria del móvil no se llene.
- **Base de datos**: Usamos un sistema que hace que las consultas a la base de datos sean rápidas, para que no haya que esperar mucho al cargar el perfil.
- **Fotos y vídeos**: Intentamos que los archivos multimedia no pesen demasiado para no gastar todos los datos del usuario.

### 6.6 Cómo nos hemos organizado (Planificación)
Hemos dividido el trabajo en 4 etapas principales durante estos meses:
1. **Pensar y diseñar (4 semanas)**: Decidir qué iba a hacer la app, cómo iba a ser la base de datos y dibujar las pantallas.
2. **Hacer el servidor (6 semanas)**: Programar toda la parte de atrás (backend) y conectarlo con la base de datos y los emails.
3. **Hacer la app (6 semanas)**: Montar todas las pantallas del móvil, conectarlas con el servidor y poner los pagos con Stripe.
4. **Probar y subir (4 semanas)**: Ver que no hay fallos graves, subir el servidor a la nube (Webdock) y probar que todo funciona fuera de nuestro ordenador.

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
Hacer este proyecto nos ha servido para juntar todo lo que hemos visto en el grado de DAM. No solo ha sido programar, sino también pelearnos con los servidores, entender cómo funcionan los pagos reales y organizar bien las tablas para que todo encaje. Ha sido un reto, pero nos ha dado una visión mucho más clara de cómo se hace una aplicación completa desde cero.

### 7.2 Logros
- La integración con Stripe funciona y permite hacer pagos reales (en modo prueba).
- Los tres tipos de usuarios (Gratis, Premium y Entrenador) están bien diferenciados y cada uno tiene sus funciones.
- La app funciona tanto en Android como en iPhone sin tener que haber hecho dos códigos distintos, lo que nos ha ahorrado muchísimo trabajo.

### 7.3 Futuro
Como el proyecto siempre se puede mejorar y ampliar, hemos pensado en algunas ideas que podrían ser el siguiente paso:

1. **Notificaciones**: Para que el móvil te avise de que tienes una cita o que han subido una rutina nueva.
2. **Recomendaciones inteligentes**: Un sistema que te sugiera monitores según tus objetivos.
3. **Módulo de Nutrición**: Para que los monitores también puedan subir planes de comidas.

### 7.4 Retos superados
Durante el desarrollo nos hemos encontrado con varios "muros" que nos han obligado a investigar mucho y a aprender por las malas:

- **El lío de la IP y `localhost`**: Al principio la app no se conectaba al servidor. Nos volvimos locos pensando que el código estaba mal, hasta que descubrimos que el móvil no sabe qué es `localhost`. Tuvimos que configurar la IP de nuestro ordenador en los archivos `.env` para que el móvil y el servidor se hablaran por la red WiFi.
- **Webhooks de Stripe**: No sabíamos que Stripe no te avisa directamente a la app de que un pago ha ido bien, sino que llama a tu servidor por detrás. Tuvimos que crear una ruta especial y usar una herramienta para que los avisos de Stripe llegaran a nuestro ordenador local. Fue difícil de entender, pero ahora los pagos se confirman al segundo.
- **Las variables de entorno**: Manejar las claves secretas de Stripe y las URLs de Supabase sin que se subieran a GitHub fue un reto. Tuvimos que aprender a usar archivos `.env` tanto en el servidor como en el móvil para que todo fuera seguro y funcionara igual en cualquier ordenador.
- **Conflictos de versiones**: Más de una vez la app dejó de funcionar al instalar una librería nueva. Pelearse con las versiones de Node, Gradle y las dependencias de Expo nos enseñó a leer bien los errores de la consola y a no instalar cosas "a lo loco".
- **El laberinto del Routing**: Configurar la navegación entre pantallas fue un reto. Tuvimos problemas para que la app supiera cuándo redirigir al usuario al login o a la home según si estaba identificado o no, y a veces nos quedábamos "atrapados" en una pantalla sin poder volver atrás.
- **Compatibilidad Android/iOS**: Al probar en distintos móviles, vimos que lo que se veía perfecto en Android a veces salía descuadrado en iPhone (como los márgenes superiores por el "notch"). Tuvimos que ajustar el código para que la app se adapte automáticamente al sistema que esté usando el usuario.
- **Envío de Correos con Brevo**: Configurar el servidor para que mandara los emails de registro no fue tan fácil como parecía. Tuvimos que pelearnos con los puertos SMTP y las claves de la API para que los correos no acabaran en la carpeta de Spam de los usuarios.
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
