#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
IMAGE_CLI_ROOT="$DIRNAME/.."
TARGET=${PKG_TARGET:-node10-mac}
rm -fR out/
mkdir -p out/sharp/build/Release
mkdir -p out/sharp/vendor/lib

# TODO: add in the presets here
pkg -t $TARGET -o out/image-cli . || { echo "pkg failed!"; exit 1; }
cp -R ../../node_modules/sharp/build/Release/* out/sharp/build/Release/ || { echo "sharp not built!"; exit 1; }
cp -R ../../node_modules/sharp/vendor/lib/* out/sharp/vendor/lib/ || { echo "sharp missing key files! rm -fR node_modules and try again"; exit 1; }

cd out
tar -czf $TARGET.tar.gz ./*

echo 'Creating tmp directory to test the executable...'
mkdir /tmp/js_image_cli_test
cp -R ./* /tmp/js_image_cli_test
cd /tmp/js_image_cli_test

echo "Testing the default usage pattern..."
OUTPUT=$(./image-cli 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep Usage >/dev/null || exit 1

echo "Testing the default usage pattern..."
OUTPUT=$(./image-cli --mode=freeform -c "$IMAGE_CLI_ROOT/test/fixtures/freeform.js" 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep 'Done!' >/dev/null || exit 1

rm -fR /tmp/js_image_cli_test
