#!/usr/bin/env bash
# Tüm güvenlik ağı: tip kontrolü, birim, API (kaynak), API (paketlenmiş sunucu). Yerel MariaDB açık olmalı.
# Kullanım (backend klasöründe): bash scripts/hepsiniDogrula.sh
set -u
cd "$(dirname "$0")/.."
set -a; . ./.env.mariadb.test; set +a
ozet() { grep -E "^ℹ (tests|pass|fail)|✖" | tr '\n' ' '; echo; }
echo "== tsc";        npx tsc -p tsconfig.json && echo OK || { echo "TIP HATASI"; exit 1; }
echo "== birim";      npm test 2>&1 | ozet
echo "== API (kaynak)"; npm run -s test:api 2>&1 | ozet
echo "== API (paket)";  npm run -s test:api:paket 2>&1 | ozet
