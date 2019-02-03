#!/bin/bash

set -e

npm run clean

if [[ -n "$ENABLE_WASM" ]]; then
  lerna run build
  exit 0
fi

if [[ -n "$TRAVIS_TAG" ]]; then
  lerna version --yes \
    --exact \
    --no-push \
    --no-git-remote \
    --no-git-tag-version \
    --no-commit-hooks \
    "$TRAVIS_TAG"
fi

cd packages/exif
npm run build
cd ../../

cd packages/image
npm run build:ts
npm run build:rollup
npm run build:rollup:minify
cd ../../

cd packages/image-cli
npm run build
cd ../../
