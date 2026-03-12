# FitHub Connect

Proyecto final del curso de Desarrollo de Aplicaciones Multiplataforma (DAM).

FitHub Connect es una plataforma orientada al fitness que conecta entrenadores con usuarios. Permite gestionar rutinas, contratar monitores y consultar disponibilidad horaria.

## Estructura del proyecto

```
FitHub-Connect/
├── backend/     # Servidor API (Kotlin + Ktor)
├── mobile/      # App movil (React Native + Expo)
├── setup.ps1    # Script de configuracion automatica
└── COMMANDS.md  # Guia de comandos del proyecto
```

## Requisitos

- Java JDK 21 o superior (o usar el JBR de Android Studio)
- Node.js 18 o superior
- Git

## Configuracion rapida

### Opcion 1: Script automatico (Windows)

Abrir PowerShell en la carpeta del proyecto y ejecutar:

```powershell
.\setup.ps1
```

El script comprueba que tienes Java y Node instalados, genera el Gradle Wrapper si falta, copia el `.env.example` como `.env` y avisa de lo que falta por configurar.

Despues de ejecutarlo hay que editar `backend/.env` y poner la contrasena real de la base de datos.

### Opcion 2: Manual

1. Clonar el repositorio
2. Copiar `backend/.env.example` a `backend/.env` y rellenar la contrasena de Supabase
3. Para el backend: `cd backend && .\gradlew run`
4. Para la app movil: `cd mobile && npm install && npx expo start`

## Como ejecutar

### Backend
```bash
cd backend
.\gradlew run
```
El servidor arranca en http://localhost:8080. La primera vez crea las tablas en la base de datos automaticamente.

### App movil
```bash
cd mobile
npm install
npx expo start
```
Escanear el QR con Expo Go en el movil o pulsar `w` para abrir en el navegador.

## Base de datos

PostgreSQL alojado en Supabase. Las tablas se generan solas al arrancar el backend.

Para mas detalles sobre comandos y endpoints consultar [COMMANDS.md](COMMANDS.md).