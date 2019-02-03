#!/bin/bash

set -e

npm run clean

if [[ -n "$ENABLE_WASM" ]]; then
  lerna run build
  exit 0
fi

if [[ -n "$TRAVIS_TAG" ]]; then
  # We have to prevent lerna from complaining about a detached HEAD
  # So we'll create a fake temporary branch
  git branch -D _tmp_branch || echo 'No _tmp_branch'
  git checkout -b _tmp_branch
  # Update the versions in package.json so we deploy the right thing
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
