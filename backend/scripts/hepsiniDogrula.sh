#!/usr/bin/env bash
# Tüm güvenlik ağı: tip kontrolü, birim, API (kaynak), API (paketlenmiş sunucu). Yerel MariaDB açık olmalı.
# Kullanım (backend klasöründe): bash scripts/hepsiniDogrula.sh
# Çıkış kodu: herhangi bir adımda kırmızı test varsa 1 (eskiden özet borusu yüzünden hata kayboluyor, hep 0 dönüyordu).
set -u
set -o pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.mariadb.test; set +a
ozet() { grep -E "^ℹ (tests|pass|fail)|✖" | tr '\n' ' '; echo; }
kirmizi=0
adim() { local ad="$1"; shift; echo "== $ad"; "$@" 2>&1 | ozet || { kirmizi=1; echo "!! $ad BAŞARISIZ"; }; }
echo "== tsc";        npx tsc -p tsconfig.json && echo OK || { echo "TIP HATASI"; exit 1; }
adim "birim" npm test
adim "API (kaynak)" npm run -s test:api
adim "API (paket)" npm run -s test:api:paket
exit $kirmizi
