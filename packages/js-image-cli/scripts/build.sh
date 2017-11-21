#!/bin/bash

TARGET=${PKG_TARGET:-node8-mac}
rm -fR out/
mkdir -p out/sharp/build/Release
mkdir -p out/sharp/vendor/lib

pkg -t $TARGET -o out/image-cli bin/index.js
cp -R node_modules/sharp/build/Release/* out/sharp/build/Release/
cp -R node_modules/sharp/vendor/lib/* out/sharp/vendor/lib/

cd out
tar -czf $TARGET.tar.gz ./*

echo 'Creating tmp directory to test the executable...'
mkdir /tmp/js_image_cli_test
cp -R ./* /tmp/js_image_cli_test
cd /tmp/js_image_cli_test

OUTPUT=$(./image-cli 2>&1)
echo -e "$OUTPUT"
echo $OUTPUT | grep Usage >/dev/null || exit 1
