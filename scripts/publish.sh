#!/bin/bash

if [[ "$GITHUB_EXTRA__BRANCH" != "master" ]]; then
  echo "Can only publish from master"
  exit 0
fi

# Fake the Travis Node Version so npm-publish will work
export TRAVIS_NODE_VERSION=v8
export TRAVIS_BRANCH="$GITHUB_EXTRA__BRANCH"

PRERELEASE_FLAGS="--prerelease"
if git log -n 1 "$GITHUB_SHA" | grep 'OFFICIAL RELEASE'; then
  PRERELEASE_FLAGS=""
fi

npm install -g @patrickhulce/scripts lerna@3.x
git checkout -f master
git status
hulk npm-publish --lerna --yes $PRERELEASE_FLAGS
