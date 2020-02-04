#!/bin/bash

set -e

# Make sure we're in the image-cli directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
cd "$SCRIPT_DIR" && cd ../

PLATFORM=$(node -e 'console.log(require("os").platform())')
VERSION=$(node -e 'console.log(require("./package.json").version)')

PLATFORM_FILE=""
if [[ "$PLATFORM" == "darwin" ]]; then
  PLATFORM_FILE="node10-mac.tar.gz"
elif [[ "$PLATFORM" == "linux" ]]; then
  PLATFORM_FILE="node10-linux.tar.gz"
elif [[ "$PLATFORM" == "win32" ]]; then
  PLATFORM_FILE="node10-win.tar.gz"
else
  echo "Unsupported platform $PLATFORM"
  exit 1
fi

mkdir -p bin/prebuilt/
EXISTING_VERSION=$(cat bin/prebuilt/version.txt || echo 'None')

if [[ "$EXISTING_VERSION" == "$VERSION" ]]; then
  echo "Already has latest version!"
  exit 0
fi

FILE_TO_DOWNLOAD="image-cli-$PLATFORM_FILE"
echo "Downloading $FILE_TO_DOWNLOAD for version $VERSION..."
curl -L -o "bin/prebuilt/$FILE_TO_DOWNLOAD" "https://github.com/ErisVentures/js-image/releases/download/v${VERSION}/$FILE_TO_DOWNLOAD"

cd bin/prebuilt

echo "$VERSION" > version.txt

if [[ "$FILE_TO_DOWNLOAD" = *.tar.gz ]]; then
  tar -xzf "$FILE_TO_DOWNLOAD"
fi
