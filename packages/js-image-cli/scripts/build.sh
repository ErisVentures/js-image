#!/bin/bash

TARGET=${PKG_TARGET:-node8-mac}
pkg -t $TARGET -o out/image-cli bin/index.js
