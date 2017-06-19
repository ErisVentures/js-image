#!/bin/bash

cd $(dirname "$0")

VERSION=v3
S3PATH="https://s3.amazonaws.com/npm-fixtures/@ouranos/image/$VERSION"
FILES=$(curl "$S3PATH/files.txt")
for file in $FILES ;
do
  if [ ! -f $file ]; then
   curl --compressed -o $file "${S3PATH}/${file}"
  fi
done

ls -ali

