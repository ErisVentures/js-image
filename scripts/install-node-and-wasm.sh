#!/bin/bash

set -e

if [[ -z "$ENABLE_WASM" ]]; then
  echo "WASM is not enabled, re-rune with ENABLE_WASM=1 to run these steps."
  exit 0
fi

rustup target add wasm32-unknown-unknown
cargo install wasm-pack
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
source ~/.nvm/nvm.sh
nvm install v8.11
