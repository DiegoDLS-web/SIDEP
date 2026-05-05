# Copia retratos oficial al proyecto (rutas usadas por `backend/prisma/seed.ts`).
# Uso: desde la raíz del repo
#   .\scripts\import-fotos-perfiles.ps1 -CarpetaOrigen "C:\ruta\donde\estan\tus\fotos"
#
# Por defecto intenta la carpeta de assets de Cursor asociada a este workspace.
param(
  [string]$CarpetaOrigen = "$env:USERPROFILE\.cursor\projects\c-Users-kiwip-OneDrive-Documentos-GitHub-SIDEP\assets"
)

$ErrorActionPreference = "Stop"
$dest = Join-Path $PSScriptRoot "..\frontend\src\assets\perfiles" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $dest) {
  $dest = (New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "..\frontend\src\assets\perfiles")).FullName
} else {
  $dest = $dest.Path
}

$pairs = @(
  @{ Patron = "*Nicolas*Ponce*"; Destino = "nicolas-alejandro-ponce-ramirez.png" },
  @{ Patron = "*Leonardo*Rios*"; Destino = "leonardo-patricio-rios-guzman.png" },
  @{ Patron = "*Felipe*Villagras*"; Destino = "felipe-andres-villagra-rojas.png" },
  @{ Patron = "*Felipe*Villagra*"; Destino = "felipe-andres-villagra-rojas.png" },
  @{ Patron = "*Sergio*Contreras*"; Destino = "sergio-ariel-contreras-gutierrez.png" },
  @{ Patron = "*Jasmin*Silva*"; Destino = "jasmin-elena-silva-escalona.png" },
  @{ Patron = "*Diego*Salas*"; Destino = "diego-salas-parra.png" },
  @{ Patron = "*Baeza*Neira*"; Destino = "debora-yinett-baeza-neira.png" },
  @{ Patron = "*Lopez*Flores*"; Destino = "felipe-andres-lopez-flores.png" },
  @{ Patron = "*Daniel*Gonzalez*Unda*"; Destino = "daniel-alexander-gonzalez-unda.png" },
  @{ Patron = "*Jonathan*Mora*"; Destino = "jonathan-patricio-mora-bustamante.png" }
)

if (-not (Test-Path $CarpetaOrigen)) {
  Write-Warning "No existe la carpeta: $CarpetaOrigen"
  Write-Host "Pasa -CarpetaOrigen con la ruta donde están los PNG, o copia manualmente estos nombres a: $dest"
  foreach ($p in $pairs) { Write-Host ("  · " + $p.Destino) }
  exit 1
}

# -Include con -Recurse en PowerShell no lista bien; filtramos por extensión.
$fuentes = @(
  Get-ChildItem -Path $CarpetaOrigen -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '^\.(png|jpe?g)$' }
)
$yaCopiado = @{}
foreach ($p in $pairs) {
  if ($yaCopiado[$p.Destino]) { continue }
  $hit = $fuentes | Where-Object { $_.Name -like $p.Patron } | Select-Object -First 1
  if (-not $hit) { Write-Warning "No encontrado: $($p.Patron)"; continue }
  if (-not (Test-Path -LiteralPath $hit.FullName)) {
    Write-Warning "No disponible en disco (p. ej. OneDrive sin sincronizar): $($hit.Name)"
    continue
  }
  Copy-Item -LiteralPath $hit.FullName -Destination (Join-Path $dest $p.Destino) -Force
  $yaCopiado[$p.Destino] = $true
  Write-Host "OK $($p.Destino) <= $($hit.Name)"
}
Write-Host "Listo. Vuelve a ejecutar seed o asigna fotos desde Gestión de usuarios."
