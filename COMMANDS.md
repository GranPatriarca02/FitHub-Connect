# FitHub-Connect - Guia de comandos

## Requisitos previos

| Herramienta | Version necesaria          | Descarga                                                                                       |
| ----------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| JDK         | 21 o superior              | https://adoptium.net/temurin/releases/?version=21 (o usar el JBR que viene con Android Studio) |
| Node.js     | 18 o superior              | https://nodejs.org                                                                             |
| npm         | Viene incluido con Node.js | -                                                                                              |
| Git         | Cualquier version          | https://git-scm.com                                                                            |

---

## Setup rapido en un PC nuevo

```powershell
git clone https://github.com/TU_USUARIO/FitHub-Connect.git
cd FitHub-Connect

# ejecutar el script de setup automatico
.\setup.ps1
```

Despues del setup hay que editar `backend/.env` y meter la contrasena real de Supabase.

---

## Backend (Kotlin + Ktor)

Los comandos del backend se ejecutan desde la carpeta `backend/`.

```powershell
cd backend
```

| Comando                   | Para que sirve                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `.\gradlew run`           | Arranca el servidor en http://localhost:8080. La primera vez crea las tablas en Supabase.   |
| `.\gradlew build -x test` | Compila el proyecto sin pasar los tests. Sirve para comprobar que no hay errores de codigo. |
| `.\gradlew build`         | Compila y ejecuta los tests.                                                                |
| `.\gradlew clean`         | Borra los archivos compilados de la carpeta build/.                                         |
| `.\gradlew wrapper`       | Regenera el Gradle Wrapper si se pierde el gradle-wrapper.jar.                              |

### Endpoints de la API

| Metodo | Ruta                               | Descripcion                                                                                                             |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                                | Health check. Devuelve `FitHub Connect API v0.1`.                                                                       |
| GET    | `/monitors`                        | Lista todos los monitores con nombre, especialidad y tarifa.                                                            |
| GET    | `/monitors/{id}`                   | Devuelve el detalle de un monitor con su disponibilidad semanal.                                                        |
| GET    | `/availability/{monitorId}`        | Devuelve los horarios disponibles de un monitor.                                                                        |
| POST   | `/availability/{monitorId}/update` | Actualiza la disponibilidad de un monitor. Recibe un JSON con el dia, hora de inicio, hora de fin y si esta disponible. |

Ejemplo de body para el POST de disponibilidad:

```json
{
  "dayOfWeek": "MONDAY",
  "startTime": "09:00",
  "endTime": "17:00",
  "isAvailable": true
}
```

Ejemplo de respuesta de GET `/monitors`:

```json
[
  {
    "id": 1,
    "name": "Carlos Garcia",
    "specialty": "Musculacion",
    "hourlyRate": 25.0
  }
]
```

Ejemplo de respuesta de GET `/monitors/1`:

```json
{
  "id": 1,
  "name": "Carlos Garcia",
  "specialty": "Musculacion",
  "hourlyRate": 25.0,
  "bio": "Entrenador personal con 5 anos de experiencia",
  "availability": [
    {
      "id": 1,
      "monitorId": 1,
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "14:00",
      "isAvailable": true
    }
  ]
}
```

---

## Frontend movil (React Native + Expo)

Los comandos del frontend se ejecutan desde la carpeta `mobile/`.

```powershell
cd mobile
```

| Comando                    | Para que sirve                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `npm install`              | Instala todas las dependencias del proyecto.                                            |
| `npm start`                | Arranca el servidor de desarrollo apuntando al **Backend en Local** (`.env`).           |
| `npm run start:prod`       | Arranca el servidor apuntando al **Backend de Produccion en Webdock**.                  |
| `npm run start:prod -- -c` | Arranca el servidor apuntando al **Backend de Produccion en Webdock** y borra la cache. |
| `npx expo start --android` | Abre directamente en el emulador de Android.                                            |
| `npx expo start --ios`     | Abre en el simulador de iOS (solo funciona en Mac).                                     |
| `npx expo start --web`     | Abre en el navegador.                                                                   |

### Diferencia entre npm y npx

- **`npm` (Node Package Manager)**: Sirve para instalar y gestionar dependencias. Cuando haces `npm install`, guarda las librerias en tu proyecto. Tambien sirve para lanzar scripts ya definidos en tu archivo `package.json` (ejemplo: `npm start`).
- **`npx` (Node Package Execute)**: Sirve para **ejecutar** herramientas que forman parte de tus dependencias directas o bajarlas al vuelo. Por ejemplo, `npx expo` garantiza que estas ejecutando la herramienta de Expo que este proyecto especifico necesita, sin instalar versiones globales en tu PC.

### Cambiar entre Entorno Local y Produccion

El proyecto movil usa variables de entorno con el prefijo `EXPO_PUBLIC_` que Expo lee automaticamente.

- `mobile/.env` → contiene `EXPO_PUBLIC_API_URL=http://localhost:8080` (entorno local)
- `mobile/.env.produccion` → contiene `EXPO_PUBLIC_API_URL=https://fithub.vps.webdock.cloud` (produccion)

#### Escenario A: Probar con el Servidor Webdock (Recomendado para la presentacion)

El servidor ya esta encendido 24/7. **Solo necesitas ejecutar el frontend**.

1. Abre un terminal en `mobile/`
2. Ejecuta `npm run start:prod`
   _(El movil hablara automaticamente con la nube)_

#### Escenario B: Desarrollar en Local (Tu PC)

Necesitas arrancar **las dos cosas** (Backend y Frontend).

1. Abre un terminal en `backend/` y arranca con `.\gradlew run`
2. Abre otro terminal en `mobile/` y arranca con `npm start`
   _(El movil hablara con el backend de tu ordenador)_

> **Nota para el Escenario B:** Si pruebas con un movil fisico en local, cambia `localhost` en `mobile/.env` por la IP de tu PC en el WiFi (ej: `192.168.1.56:8080`).

---

## Base de datos (Supabase)

La base de datos es un PostgreSQL alojado en Supabase.

- Host: `aws-1-eu-west-3.pooler.supabase.com`
- Puerto: `5432`
- Base de datos: `postgres`
- Usuario: `postgres.faorfurslbzfgbbxmbrt`

Las tablas se generan solas cuando se arranca el backend la primera vez:

- `users` - Usuarios del sistema (clientes y entrenadores).
- `monitors` - Datos del entrenador (especialidad, tarifa por hora, biografia).
- `routines` - Rutinas de entrenamiento vinculadas a un entrenador.
- `availabilities` - Franjas horarias disponibles de cada entrenador por dia de la semana.

---

## Estructura del proyecto

```
FitHub-Connect/
├── backend/                    # Servidor API (Kotlin + Ktor)
│   ├── src/main/kotlin/com/example/
│   │   ├── db/                 # Conexion a base de datos
│   │   ├── models/             # Modelos de datos (User, Monitor, etc.)
│   │   ├── models/dto/         # DTOs (AvailabilityDto, MonitorDto)
│   │   ├── routes/             # Endpoints (AvailabilityRoutes, MonitorRoutes)
│   │   ├── Application.kt     # Punto de entrada del servidor
│   │   ├── Routing.kt         # Rutas generales + CORS
│   │   └── Serialization.kt   # Configuracion JSON
│   ├── .env                    # Variables de entorno (NO se sube a Git)
│   ├── .env.example            # Plantilla de variables de entorno
│   └── build.gradle.kts        # Dependencias del backend
├── mobile/                     # App movil (React Native + Expo)
│   ├── src/
│   │   ├── api.js              # Modulo centralizado de llamadas HTTP
│   │   └── screens/            # Pantallas (Login, Home, MonitorList, MonitorDetail)
│   ├── .env                    # Variables de entorno local
│   ├── .env.produccion         # Variables de entorno produccion
│   └── package.json            # Dependencias y scripts
├── setup.ps1                   # Script de setup automatico
├── COMMANDS.md                 # Esta guia
└── .gitignore                  # Archivos ignorados por Git
```

---

## Servidor de Produccion (Webdock)

El backend esta desplegado en un servidor VPS de Webdock. La API es accesible desde cualquier sitio a traves de la URL de produccion.

- **URL de la API**: `https://fithub.vps.webdock.cloud`
- **IP del servidor**: `92.113.147.5`
- **Usuario SSH**: `admin`

Para conectarse al servidor y gestionarlo, abre una terminal de Windows y ejecuta:

```powershell
ssh admin@fithub.vps.webdock.cloud
```

_(Pedira la contrasena del panel de Webdock o se conectara directamente si tienes la clave SSH configurada)._

### Comandos utiles en el servidor

Una vez dentro del servidor por SSH, tienes estos comandos para controlar el backend:

| Comando en el servidor          | Para que sirve                                                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sudo systemctl status fithub`  | Ver si el backend de Kotlin esta corriendo y si hay algun error.                                                                                                      |
| `sudo systemctl restart fithub` | Reiniciar el backend (se hace despues de subir una version nueva del codigo).                                                                                         |
| `sudo systemctl stop fithub`    | Detener el backend.                                                                                                                                                   |
| `sudo journalctl -u fithub -f`  | Ver los **logs en tiempo real** de forma continua. Perfecto para ver las peticiones que llegan, los `println()` del codigo o los errores (pulsa `Ctrl+C` para salir). |

### Como subir una version nueva del codigo al servidor

Si haces cambios en el codigo del backend (por ejemplo, anades una tabla nueva) y quieres que esten en el servidor:

1. **En tu ordenador (en la carpeta `backend`):**
   Crea el archivo ejecutable nuevo:

   ```powershell
   .\gradlew clean shadowJar
   ```

2. **Sube el archivo al servidor:**

   ```powershell
   scp build\libs\ktor-backend-all.jar admin@fithub.vps.webdock.cloud:/home/admin/
   ```

3. **En el servidor (conectado por SSH):**
   Mueve el archivo al directorio de la aplicacion y reinicia:
   ```bash
   sudo mv /home/admin/ktor-backend-all.jar /var/www/fithub/
   sudo chown admin:admin /var/www/fithub/ktor-backend-all.jar
   sudo systemctl restart fithub
   ```
