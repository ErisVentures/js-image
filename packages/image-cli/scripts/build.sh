#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
IMAGE_CLI_ROOT="$DIRNAME/.."
TARGET=${PKG_TARGET:-node10-mac}
rm -rf out/
mkdir -p out/@tensorflow/tfjs-node/build/Release
mkdir -p out/sharp/build/Release
mkdir -p out/sharp/vendor/lib

pkg -t $TARGET -o out/image-cli . || { echo "pkg failed!"; exit 1; }
cp -R ../../node_modules/sharp/build/Release/* out/sharp/build/Release/ || { echo "sharp not built!"; exit 1; }
cp -R ../../node_modules/sharp/vendor/lib/* out/sharp/vendor/lib/ || { echo "sharp missing key files! rm -fR node_modules and try again"; exit 1; }
cp -RL ../../node_modules/@tensorflow/tfjs-node/build/Release/* out/@tensorflow/tfjs-node/build/Release || { echo "tfjs not built!"; exit 1; }

rm -rf out/@tensorflow/tfjs-node/build/Release/.deps # Clear out the references to old symlinked deps

cd out
tar -czf $TARGET.tar.gz ./*
tar -tzf $TARGET.tar.gz

echo 'Creating tmp directory to test the executable...'
mkdir /tmp/js_image_cli_test
cp -R ./* /tmp/js_image_cli_test
cd /tmp/js_image_cli_test

echo "Testing the basic CLI help..."
OUTPUT=$(./image-cli 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep Usage >/dev/null || exit 1

if [[ -n "$SKIP_IMAGE_CLI_FILE_TEST" ]]; then
  # Skip this next check in Travis because it requires the git lfs files
  exit 0
fi

FREEFORM_TEST_START=$(date +%s)
echo "Testing the freeform usage pattern..."
OUTPUT=$(./image-cli --mode=freeform -c "$IMAGE_CLI_ROOT/test/fixtures/freeform.js" 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep 'Done!' >/dev/null || exit 1
FREEFORM_TEST_END=$(date +%s)
echo "Freeform test took $((FREEFORM_TEST_END - FREEFORM_TEST_START))s"

rm -fR /tmp/js_image_cli_test
