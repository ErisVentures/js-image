#!/bin/bash

set -e

ASSET_PATH=$1

if [[ -z "$ASSET_PATH" ]]; then
  echo "Must specify an asset name"
  exit 1
fi

if [[ ! -f "$ASSET_PATH" ]]; then
  echo "No such file $ASSET_PATH"
  exit 1
fi

if [[ -z "$GH_TOKEN" ]]; then
  echo "Must provide a GitHub token"
  exit 1
fi

if [[ -z "$GITHUB_EXTRA__TAG" ]]; then
  echo "Only uploading an asset on releases"
  exit 0
fi

GITHUB_URL="https://api.github.com/repos/ErisVentures/js-image/releases/tags/$GITHUB_EXTRA__TAG"
echo "Determining release ID for $GITHUB_EXTRA__TAG..."
curl -u "patrickhulce:$GH_TOKEN" "$GITHUB_URL" > gh-result.json
RELEASE_ID=$(node -e "console.log(JSON.parse(fs.readFileSync(\"gh-result.json\", \"utf8\")).id)")
echo "$GITHUB_EXTRA__TAG is release $RELEASE_ID"

BASENAME_TO_PUBLISH="image-cli-$(basename "$ASSET_PATH")"
echo "Publishing $ASSET_PATH as $BASENAME_TO_PUBLISH..."
GITHUB_URL="https://uploads.github.com/repos/ErisVentures/js-image/releases/$RELEASE_ID/assets?name=$BASENAME_TO_PUBLISH"
curl -u "patrickhulce:$GH_TOKEN" --data-binary @"$ASSET_PATH" -H 'Content-Type: application/octet-stream' "$GITHUB_URL"
