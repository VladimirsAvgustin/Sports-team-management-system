# Generate PWA icons - Генератор иконок для PWA (Windows)
# Usage: .\generate-icons.ps1 -LogoPath "path/to/logo.png"
# Требует: ImageMagick (https://imagemagick.org/script/download.php)

param(
    [string]$LogoPath = ""
)

if ([string]::IsNullOrEmpty($LogoPath)) {
    Write-Host "❌ Пожалуйста, укажите путь к логотипу" -ForegroundColor Red
    Write-Host "Использование: .\generate-icons.ps1 -LogoPath 'path/to/logo.png'"
    Write-Host ""
    Write-Host "Требования:"
    Write-Host "- ImageMagick: https://imagemagick.org/script/download.php"
    Write-Host ""
    exit 1
}

# Проверяем существует ли файл
if (-not (Test-Path $LogoPath)) {
    Write-Host "❌ Файл не найден: $LogoPath" -ForegroundColor Red
    exit 1
}

# Получаем полный путь
$LogoPath = (Resolve-Path $LogoPath).Path
$OUTPUT_DIR = ".\public"

# Проверяем наличие ImageMagick
$magick = Get-Command convert -ErrorAction SilentlyContinue
if ($null -eq $magick) {
    Write-Host "❌ ImageMagick не установлена" -ForegroundColor Red
    Write-Host "Установите: https://imagemagick.org/script/download.php"
    Write-Host "(Убедитесь, что выбрана опция 'Add ImageMagick to PATH')"
    exit 1
}

Write-Host "🎨 Генерирование иконок PWA..." -ForegroundColor Green
Write-Host "📁 Логотип: $LogoPath"
Write-Host "📂 Выходная папка: $OUTPUT_DIR"
Write-Host ""

# Создаём папку если не существует
if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}

# Размеры иконок
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)

# Генерируем обычные иконки
Write-Host "📦 Генерирование стандартных иконок..." -ForegroundColor Yellow
foreach ($size in $sizes) {
    $outputFile = "$OUTPUT_DIR\icon-$size.png"
    $sizeStr = "${size}x${size}"
    
    # Используем ImageMagick для создания иконок
    & convert "$LogoPath" -resize $sizeStr -gravity center -extent $sizeStr -background white "$outputFile"
    
    if ($?) {
        Write-Host "  ✓ icon-$size.png"
    } else {
        Write-Host "  ✗ icon-$size.png (ошибка)" -ForegroundColor Red
    }
}

# Генерируем maskable иконки
Write-Host ""
Write-Host "🎭 Генерирование maskable иконок..." -ForegroundColor Yellow

# 192x192 maskable
$outputFile192 = "$OUTPUT_DIR\icon-192-maskable.png"
& convert "$LogoPath" -resize 160x160 -gravity center -extent 192x192 -background "rgba(0,0,0,0)" "$outputFile192"
if ($?) {
    Write-Host "  ✓ icon-192-maskable.png"
}

# 512x512 maskable
$outputFile512 = "$OUTPUT_DIR\icon-512-maskable.png"
& convert "$LogoPath" -resize 410x410 -gravity center -extent 512x512 -background "rgba(0,0,0,0)" "$outputFile512"
if ($?) {
    Write-Host "  ✓ icon-512-maskable.png"
}

Write-Host ""
Write-Host "✅ Готово! Иконки созданы в $OUTPUT_DIR" -ForegroundColor Green
Write-Host ""

# Показываем список созданных файлов
Write-Host "Созданные файлы:" -ForegroundColor Cyan
Get-Item "$OUTPUT_DIR\icon-*.png" -ErrorAction SilentlyContinue | ForEach-Object {
    $size = ($_.Length / 1KB).ToString("F1")
    Write-Host "  $(Split-Path $_ -Leaf) ($size KB)"
}

Write-Host ""
Write-Host "💡 Совет: Убедитесь, что иконки хорошо выглядят:" -ForegroundColor Cyan
Write-Host "  1. Откройте $OUTPUT_DIR\icon-512.png для проверки"
Write-Host "  2. Пересоздайте если цвета не подходят"
Write-Host ""
Write-Host "📱 Для тестирования:" -ForegroundColor Cyan
Write-Host "  npm run dev"
Write-Host "  Откройте http://localhost:5173 в Chrome"
Write-Host "  DevTools → Application → Manifest"
