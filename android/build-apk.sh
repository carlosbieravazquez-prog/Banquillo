#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
sdk=${ANDROID_SDK_ROOT:?Define ANDROID_SDK_ROOT}
: "${BANQUILLO_APK_SIGNING_KEY:?Provide the path to the signing keystore}"
: "${BANQUILLO_APK_SIGNING_PASSWORD:?Provide the signing password by environment variable}"
alias=${BANQUILLO_APK_SIGNING_ALIAS:-banquillo}
package_args=()
if [[ ${BANQUILLO_APK_TEST_BUILD:-0} == 1 ]]; then
  package_args=(--rename-manifest-package org.elbanquillo.entrenador.pruebas)
fi
out=${1:?Provide an absolute APK output path}
[[ "$out" = /* ]]
platform="$sdk/platforms/android-36/android.jar"
tools="$sdk/build-tools/36.0.0"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

mkdir -p "$work/res/drawable-nodpi" "$work/classes" "$work/dex" "$(dirname "$out")"
cp "$root/assets/icons/banquillo-512.png" "$work/res/drawable-nodpi/banquillo.png"
"$tools/aapt2" compile --dir "$work/res" -o "$work/res.zip"
"$tools/aapt2" link -I "$platform" "${package_args[@]}" --manifest "$root/android/AndroidManifest.xml" \
  -o "$work/resources.apk" "$work/res.zip"
javac -source 8 -target 8 -bootclasspath "$platform:$tools/core-lambda-stubs.jar" -d "$work/classes" \
  "$root/android/src/org/elbanquillo/entrenador/MainActivity.java"
"$tools/d8" --lib "$platform" --min-api 26 --output "$work/dex" \
  "$work/classes/org/elbanquillo/entrenador/MainActivity.class"
(cd "$work/dex" && zip -q "$work/resources.apk" classes.dex)
"$tools/zipalign" -p -f 4 "$work/resources.apk" "$work/aligned.apk"
"$tools/apksigner" sign --ks "$BANQUILLO_APK_SIGNING_KEY" --ks-key-alias "$alias" \
  --ks-pass env:BANQUILLO_APK_SIGNING_PASSWORD --out "$out" "$work/aligned.apk"
"$tools/apksigner" verify --verbose --print-certs "$out"
