# ============================================================
# FitHub-Connect - Script de preparacion del entorno (Windows)
# ============================================================
# Ejecutar desde PowerShell:
#   .\setup.ps1
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FitHub-Connect - Setup del Proyecto" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- 1. Comprobar Java (JDK 21) ----
Write-Host "[1/5] Comprobando Java..." -ForegroundColor Yellow
$javaVersion = & java -version 2>&1 | Select-Object -First 1
if ($javaVersion) {
    Write-Host "  OK: $javaVersion" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Java no encontrado. Instala JDK 21 o usa el JBR de Android Studio." -ForegroundColor Red
    Write-Host "  Descarga: https://adoptium.net/temurin/releases/?version=21" -ForegroundColor Gray
}

# ---- 2. Comprobar Node.js (para el frontend movil) ----
Write-Host "[2/5] Comprobando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "  OK: Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js no encontrado. Instalalo desde https://nodejs.org" -ForegroundColor Red
}

# ---- 3. Configurar Gradle Wrapper (Backend) ----
Write-Host "[3/5] Configurando Gradle Wrapper para el Backend..." -ForegroundColor Yellow
$wrapperJar = ".\backend\gradle\wrapper\gradle-wrapper.jar"
if (Test-Path $wrapperJar) {
    Write-Host "  OK: gradle-wrapper.jar ya existe." -ForegroundColor Green
} else {
    Write-Host "  Descargando Gradle 8.11.1 para generar el wrapper..." -ForegroundColor Gray
    $gradleZip = "$env:TEMP\gradle-8.11.1-bin.zip"
    $gradleDir = "$env:TEMP\gradle-8.11.1"
    
    if (-not (Test-Path "$gradleDir\bin\gradle.bat")) {
        Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-8.11.1-bin.zip" -OutFile $gradleZip
        Expand-Archive -Path $gradleZip -DestinationPath $env:TEMP -Force
    }
    
    # Usar JBR de Android Studio si esta disponible
    $jbrPath = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path $jbrPath) {
        $env:JAVA_HOME = $jbrPath
        $env:PATH = "$jbrPath\bin;$env:PATH"
    }
    
    Push-Location .\backend
    & "$gradleDir\bin\gradle.bat" wrapper
    Pop-Location
    
    if (Test-Path $wrapperJar) {
        Write-Host "  OK: Wrapper generado correctamente." -ForegroundColor Green
    } else {
        Write-Host "  AVISO: No se pudo generar el wrapper." -ForegroundColor Red
    }
}

# ---- 4. Crear .env del Backend (si no existe) ----
Write-Host "[4/5] Comprobando archivo .env del Backend..." -ForegroundColor Yellow
$envFile = ".\backend\.env"
if (Test-Path $envFile) {
    Write-Host "  OK: .env ya existe." -ForegroundColor Green
} else {
    if (Test-Path ".\backend\.env.example") {
        Copy-Item ".\backend\.env.example" $envFile
        Write-Host "  CREADO: .env copiado desde .env.example." -ForegroundColor Green
        Write-Host "  IMPORTANTE: Edita backend\.env y pon tu contrasena real de Supabase." -ForegroundColor Red
    } else {
        Write-Host "  AVISO: No se encontro .env.example. Crea backend\.env a mano." -ForegroundColor Red
    }
}

# ---- 5. Instalar dependencias del Frontend Movil (si existe) ----
Write-Host "[5/5] Comprobando Frontend Movil..." -ForegroundColor Yellow
$mobileDir = ".\mobile"
if (Test-Path "$mobileDir\package.json") {
    Write-Host "  Instalando dependencias del frontend movil..." -ForegroundColor Gray
    Push-Location $mobileDir
    & npm install
    Pop-Location
    Write-Host "  OK: Dependencias instaladas." -ForegroundColor Green
} else {
    Write-Host "  INFO: El proyecto movil todavia no existe en .\mobile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setup completado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguientes pasos:" -ForegroundColor White
Write-Host "  1. Edita backend\.env con tu contrasena de Supabase (si no lo has hecho)." -ForegroundColor White
Write-Host "  2. Arranca el backend:  cd backend && .\gradlew run" -ForegroundColor White
Write-Host "  3. Arranca el movil:    cd mobile && npx expo start" -ForegroundColor White
Write-Host ""
