#!/bin/bash

set -e

ASSET_PATH=$1

if [[ ! -f "$ASSET_PATH" ]]; then
  echo "No such file $ASSET_PATH"
  exit 1
fi

if [[ -z "$ASSET_PATH" ]]; then
  echo "Must specify an asset name"
  exit 1
fi

if [[ -z "$GH_TOKEN" ]]; then
  echo "Must provide a GitHub token"
  exit 1
fi

if [[ -z "$TRAVIS_TAG" ]]; then
  echo "Only uploading an asset on travis tags"
  exit 0
fi

BASENAME_TO_PUBLISH="$TRAVIS_TAG-$(basename "$ASSET_PATH")"
echo "Publish $ASSET_PATH as $BASENAME_TO_PUBLISH"
GITHUB_URL="https://uploads.github.com/repos/ErisVentures/js-image/releases/$TRAVIS_TAG/assets?name=$BASENAME_TO_PUBLISH&access_token=$GH_TOKEN"
curl --data-binary @"$ASSET_PATH" -H 'Content-Type: application/octet-stream' "$GITHUB_URL"
