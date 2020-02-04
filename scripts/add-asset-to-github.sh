#!/bin/bash

set -e

TRAVIS_TAG="v0.4.2-alpha.8"
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

GITHUB_URL="https://api.github.com/repos/ErisVentures/js-image/releases/tags/$TRAVIS_TAG"
echo "Determining release ID for $TRAVIS_TAG..."
curl -u "patrickhulce:$GH_TOKEN" "$GITHUB_URL" > gh-result.json
RELEASE_ID=$(node -e "console.log(JSON.parse(fs.readFileSync(\"gh-result.json\", \"utf8\")).id)")
echo "$TRAVIS_TAG is release $RELEASE_ID"

BASENAME_TO_PUBLISH="image-cli-$(basename "$ASSET_PATH")"
echo "Publishing $ASSET_PATH as $BASENAME_TO_PUBLISH..."
GITHUB_URL="https://uploads.github.com/repos/ErisVentures/js-image/releases/$RELEASE_ID/assets?name=$BASENAME_TO_PUBLISH"
curl -u "patrickhulce:$GH_TOKEN" --data-binary @"$ASSET_PATH" -H 'Content-Type: application/octet-stream' "$GITHUB_URL"
