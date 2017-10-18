#!/bin/bash

TARGET=${PKG_TARGET:-node8-mac}
rm -fR out/
mkdir -p out/sharp/build/Release
mkdir -p out/sharp/vendor/lib

pkg -t $TARGET -o out/image-cli bin/index.js
cp -R node_modules/sharp/build/Release out/sharp/build/Release
cp -R node_modules/sharp/vendor/lib out/sharp/vendor/lib

cd out
tar -czf $TARGET.tar.gz ./*
