#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
IMAGE_CLI_ROOT="$DIRNAME/.."
TARGET=${PKG_TARGET:-node10-mac}

if [[ -n "$CI" ]]; then
  echo "Rebuilding tensorflow from source..."
  cd ../../
  npm rebuild @tensorflow/tfjs-node --build-from-source
  ls -ali node_modules/@tensorflow/tfjs-node/lib/napi-v3/
  node -e "require('@tensorflow/tfjs-node')" || { echo "tfjs failed to build!"; exit 1; }
  cd packages/image-cli
fi

# Make sure the node version you're using locally is the same NAPI as the TARGET node version
#   - https://nodejs.org/api/n-api.html#n_api_n_api_version_matrix
#   - https://github.com/zeit/pkg-fetch/releases
#   - https://www.npmjs.com/package/node-pre-gyp#the-napi_versions-array-property

rm -rf out/
mkdir -p out/@tensorflow/tfjs-node/deps
mkdir -p out/@tensorflow/tfjs-node/lib
mkdir -p out/sharp/build/Release
mkdir -p out/sharp/vendor/lib

pkg -t $TARGET --options max_old_space_size=4096 -o out/image-cli . || { echo "pkg failed!"; exit 1; }
cp -R ../../node_modules/sharp/build/Release/* out/sharp/build/Release/ || { echo "sharp not built!"; exit 1; }
cp -R ../../node_modules/sharp/vendor/lib/* out/sharp/vendor/lib/ || { echo "sharp missing key files! rm -fR node_modules and try again"; exit 1; }
cp -RL ../../node_modules/@tensorflow/tfjs-node/deps/* out/@tensorflow/tfjs-node/deps || { echo "tfjs not built!"; exit 1; }
cp -RL ../../node_modules/@tensorflow/tfjs-node/lib/* out/@tensorflow/tfjs-node/lib || { echo "tfjs not built!"; exit 1; }

cd out
tar -czf $TARGET.tar.gz ./*
tar -tzf $TARGET.tar.gz

echo 'Creating tmp directory to test the executable...'
mkdir /tmp/js_image_cli_test
cp -R ./* /tmp/js_image_cli_test
cd /tmp/js_image_cli_test
curl https://media.githubusercontent.com/media/ErisVentures/js-image/v0.4.2-alpha.0/packages/image/test/fixtures/source-wedding-1.jpg > file.jpg

echo "Testing the basic CLI help..."
OUTPUT=$(./image-cli 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep Usage >/dev/null || exit 1

FREEFORM_TEST_START=$(date +%s)
echo "Testing the freeform usage pattern..."
OUTPUT=$(./image-cli --mode=freeform -c "$IMAGE_CLI_ROOT/test/fixtures/freeform.js" file.jpg 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep 'Done!' >/dev/null || exit 1
FREEFORM_TEST_END=$(date +%s)
echo "Freeform test took $((FREEFORM_TEST_END - FREEFORM_TEST_START))s"

rm -fR /tmp/js_image_cli_test
