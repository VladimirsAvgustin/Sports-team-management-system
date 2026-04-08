#!/bin/bash
# Generate PWA icons - Генератор иконок для PWA
# Usage: ./generate-icons.sh path/to/logo.png

if [ $# -eq 0 ]; then
    echo "❌ Пожалуйста, укажите путь к логотипу"
    echo "Использование: ./generate-icons.sh path/to/logo.png"
    echo ""
    echo "Требования:"
    echo "- ImageMagick: brew install imagemagick (Mac) или apt install imagemagick (Linux)"
    echo ""
    exit 1
fi

LOGO_PATH="$1"
OUTPUT_DIR="./public"

# Проверяем, существует ли файл
if [ ! -f "$LOGO_PATH" ]; then
    echo "❌ Файл не найден: $LOGO_PATH"
    exit 1
fi

# Проверяем наличие ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick не установлена"
    echo "Установите:"
    echo "- Mac: brew install imagemagick"
    echo "- Linux: sudo apt install imagemagick"
    echo "- Windows: https://imagemagick.org/script/download.php"
    exit 1
fi

echo "🎨 Генерирование иконок PWA..."
echo "📁 Логотип: $LOGO_PATH"
echo "📂 Выходная папка: $OUTPUT_DIR"
echo ""

# Создаём папку если не существует
mkdir -p "$OUTPUT_DIR"

# Размеры иконок для генерирования
declare -a SIZES=(
    "72"
    "96"
    "128"
    "144"
    "152"
    "192"
    "384"
    "512"
)

# Генерируем обычные иконки
echo "📦 Генерирование стандартных иконок..."
for size in "${SIZES[@]}"; do
    output_file="$OUTPUT_DIR/icon-${size}.png"
    convert "$LOGO_PATH" -resize "${size}x${size}" -gravity center -extent "${size}x${size}" -background white "$output_file"
    echo "  ✓ icon-${size}.png"
done

# Генерируем maskable иконки (для адаптивных иконок)
echo ""
echo "🎭 Генерирование maskable иконок..."

# Для 192x192
convert "$LOGO_PATH" \
    -resize 160x160 \
    -gravity center \
    -extent 192x192 \
    -background "rgba(102, 126, 234, 0)" \
    "$OUTPUT_DIR/icon-192-maskable.png"
echo "  ✓ icon-192-maskable.png"

# Для 512x512
convert "$LOGO_PATH" \
    -resize 410x410 \
    -gravity center \
    -extent 512x512 \
    -background "rgba(102, 126, 234, 0)" \
    "$OUTPUT_DIR/icon-512-maskable.png"
echo "  ✓ icon-512-maskable.png"

echo ""
echo "✅ Готово! Иконки созданы в $OUTPUT_DIR"
echo ""
echo "Созданные файлы:"
ls -lh "$OUTPUT_DIR"/icon-*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "💡 Совет: Убедитесь, что иконки хорошо выглядят:"
echo "  1. Откройте $OUTPUT_DIR/icon-512.png для проверки"
echo "  2. Пересоздайте если цвета не подходят"
echo ""
echo "📱 Для тестирования:"
echo "  npm run dev"
echo "  Откройте http://localhost:5173 в Chrome"
echo "  DevTools → Application → Manifest"
