#!/usr/bin/env bash
# Private-use Android debug-signed APK. No user-provided keystore required.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -z "${ANDROID_HOME:-}" ]]; then export ANDROID_HOME="${ANDROID_SDK_ROOT:-}"; fi
if [[ -z "$ANDROID_HOME" || ! -d "$ANDROID_HOME" ]]; then
  echo 'Android SDK missing: build via GitHub Actions or install Android SDK 36' >&2
  exit 2
fi
UPSTREAM_URL='https://github.com/SysAdminDoc/iOSIconPack.git'
UPSTREAM_TAG='v1.2.6'
UPSTREAM_SHA='a72ddebca3397674255aef72d13eb1c9351f123d'
if [[ ! -d upstream/.git ]]; then
  git clone --depth 1 --branch "$UPSTREAM_TAG" "$UPSTREAM_URL" upstream
fi
ACTUAL_SHA="$(git -C upstream rev-parse HEAD)"
if [[ "$ACTUAL_SHA" != "$UPSTREAM_SHA" ]]; then
  echo "Source mismatch: $ACTUAL_SHA != $UPSTREAM_SHA" >&2
  exit 3
fi
python -m pip install --disable-pip-version-check --quiet 'Pillow>=10,<13'
# Upstream provenance hashes and screenshot baselines are valid BEFORE the visual transforms.
# Validate pristine upstream once; then our separate test covers the deliberate PNG edits.
(cd upstream && python scripts/icontool.py check)
python scripts/test_icons.py
python scripts/prepare_icons.py --repo upstream --out "$ROOT/dist/oneui-icon-qa.json"
cd upstream
chmod +x gradlew
./gradlew --no-daemon :app:assembleDebug
mkdir -p "$ROOT/dist"
APK="$(find app/build/outputs/apk/debug -maxdepth 1 -name '*.apk' -type f | head -n 1)"
if [[ -z "$APK" || ! -s "$APK" ]]; then
  echo 'Debug APK not found' >&2
  exit 4
fi
cp "$APK" "$ROOT/dist/Classic-iOS-OneUI-debug.apk"
SIGNER="$ANDROID_HOME/build-tools/36.0.0/apksigner"
"$SIGNER" verify --verbose --print-certs "$ROOT/dist/Classic-iOS-OneUI-debug.apk" | tee "$ROOT/dist/signature-verification.txt"
cd "$ROOT"
sha256sum dist/Classic-iOS-OneUI-debug.apk | tee dist/Classic-iOS-OneUI-debug.apk.sha256
printf '%s\n' "$UPSTREAM_URL" "tag=$UPSTREAM_TAG" "commit=$ACTUAL_SHA" > dist/upstream-version.txt
echo "Built: $ROOT/dist/Classic-iOS-OneUI-debug.apk"
