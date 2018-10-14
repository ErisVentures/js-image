#!/bin/bash

if [[ "$TRAVIS_BRANCH" != "master" ]]; then
  echo "Can only publish from master"
  exit 0
fi

# Fake the Travis Node Version so npm-publish will work
export TRAVIS_NODE_VERSION=v8

git checkout master
hulk npm-publish --lerna --prerelease --yes
