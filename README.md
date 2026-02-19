# FitHub Connect

Proyecto final académico del curso de Desarrollo de Aplicaciones Multiplataforma (DAM).

FitHub Connect es una plataforma social orientada al fitness que unifica conceptos de diferentes redes sociales:
- Funcionalidades sociales para compartir rutinas y entrenamientos (visibilidad pública/privada).
- Perfiles profesionales y roles estructurados (Usuarios estándar y Entrenadores).
- Sistema de suscripciones y monetización de servicios (control de peso, dietas, rutinas personalizadas).

## Estructura del Proyecto (Monorepo)

Este repositorio contiene todo el código fuente del proyecto, dividido en las siguientes carpetas principales:

* `/backend`: Código del servidor. Desarrollado en Kotlin utilizando el framework Ktor.
* `/app-kmp`: Código de la aplicación cliente (próximamente). Se desarrollará utilizando Kotlin Multiplatform para abarcar dispositivos móviles.

## Requisitos Previos

Para colaborar en este proyecto, necesitas tener instalado:
* IntelliJ IDEA (Community o Ultimate).
* Java Development Kit (JDK) 17 o superior.
* Git.

## Cómo ejecutar el servidor backend en local

1. Clona este repositorio en tu equipo local.
2. Abre **IntelliJ IDEA** y selecciona "Open".
3. Navega hasta la carpeta del proyecto y selecciona la subcarpeta `/backend`. Es importante abrir esta carpeta directamente para que IntelliJ detecte la configuración de Gradle.
4. Espera a que Gradle descargue las dependencias y sincronice el proyecto.
5. Ve a la ruta `src/main/kotlin/...` y abre el archivo `Application.kt`.
6. Haz clic en el icono de ejecución (Play) situado junto a la función `main`.
7. El servidor se iniciará y estará disponible en: `http://localhost:8080`