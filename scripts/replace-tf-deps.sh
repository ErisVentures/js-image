#!/bin/bash

set -euxo pipefail

PLATFORM=$(node -p 'os.platform()')
DOWNLOAD_URL=https://github.com/ErisVentures/tensorflow-binaries/releases/download/v0.1.0/libtensorflow-2.3.2-mac-x86_64-core2.tar.gz

if [[ "$PLATFORM" != "darwin" ]]; then
  echo "Only replacing deps on Mac, exiting."
  exit 0
fi

cd node_modules/@tensorflow/tfjs-node

if [[ ! -f libtensorflow.tar.gz ]]; then
  echo "libtensorflow not downloaded, downloading..."
  curl "$DOWNLOAD_URL" -Lo libtensorflow.tar.gz
else
  echo "libtensorflow already downloaded, skipping download."
fi

echo "Extracting..."
rm -rf deps/
mkdir deps/
cd deps/
tar -xzf ../libtensorflow.tar.gz

cd lib/
rm libtensorflow.dylib libtensorflow.2.dylib
rm libtensorflow_framework.dylib libtensorflow_framework.2.dylib
mv libtensorflow.2.3.2.dylib libtensorflow.dylib
mv libtensorflow_framework.2.3.2.dylib libtensorflow_framework.dylib
