#!/bin/bash

if [[ "$TRAVIS_BRANCH" != "master" ]]; then
  echo "Can only publish from master"
  exit 0
fi

# Fake the Travis Node Version so npm-publish will work
export TRAVIS_NODE_VERSION=v8

PRERELEASE_FLAGS="--prerelease"
if git log "$TRAVIS_COMMIT_RANGE" | grep 'OFFICIAL RELEASE'; then
  PRERELEASE_FLAGS=""
fi

git checkout master
git status
hulk npm-publish --lerna --yes $PRERELEASE_FLAGS
