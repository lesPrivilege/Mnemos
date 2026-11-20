#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
UPSTREAM_SHA='a72ddebca3397674255aef72d13eb1c9351f123d'
if [[ ! -d .upstream/.git ]]; then
  git clone --depth 1 --branch v1.2.6 https://github.com/SysAdminDoc/iOSIconPack.git .upstream
fi
[[ "$(git -C .upstream rev-parse HEAD)" == "$UPSTREAM_SHA" ]] || { echo 'Upstream mismatch' >&2; exit 2; }
python3 -m pip install --quiet 'Pillow>=10,<13' 'CairoSVG>=2.7,<3'
python3 scripts/test_shapes.py
python3 scripts/generate.py --upstream .upstream --project .
cp .upstream/gradlew ./gradlew
cp -R .upstream/gradle ./gradle
chmod +x gradlew
./gradlew --no-daemon :app:assembleDebug
mkdir -p dist
cp app/build/outputs/apk/debug/app-debug.apk dist/Fresh-iOS-OneUI-debug.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs dist/Fresh-iOS-OneUI-debug.apk | tee dist/apk-signature.txt
sha256sum dist/Fresh-iOS-OneUI-debug.apk | tee dist/apk-sha256.txt
