#!/bin/bash
# Construye el informe en 3 pasadas (registro de figuras → índice con páginas → verificación)
set -e
cd "$(dirname "$0")"
export NODE_PATH=/home/claude/.npm-global/lib/node_modules
SK=$(ls -d /root/.claude/skills/synced/*/docx | head -1)
rm -f .toc.json
node main.js out/Informe_APF2.docx >/dev/null           # pasada 1: registro de referencias
node main.js out/Informe_APF2.docx >/dev/null           # pasada 2: referencias correctas
python3 $SK/scripts/office/soffice.py --headless --convert-to pdf --outdir out out/Informe_APF2.docx >/dev/null 2>&1
python3 toc_pages.py out/Informe_APF2.pdf
node main.js out/Informe_APF2.docx
python3 $SK/scripts/office/soffice.py --headless --convert-to pdf --outdir out out/Informe_APF2.docx >/dev/null 2>&1
python3 toc_pages.py out/Informe_APF2.pdf
