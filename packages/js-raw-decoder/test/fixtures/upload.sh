#!/bin/bash

cd $(dirname "$0")

VERSION=v2
S3PATH="npm-fixtures/raw-decoder/$VERSION"

rm actual-*.jpg 2>/dev/null|| echo 'No actual files to delete'

echo "" > files.txt

for file in *.jpg *.nef;
do
  FULL_URL="https://s3.amazonaws.com/$S3PATH/$file"

  echo "$file" >> files.txt

  if [[ "$FORCE" == true ]] || curl -I "$FULL_URL" 2>/dev/null | grep 'Not Found' >/dev/null ; then
    echo "Uploading $file..."
    aws s3 cp "$file" "s3://$S3PATH/$file"
  else
    echo "Skipping file upload for $file"
  fi
done

aws s3 cp files.txt "s3://$S3PATH/files.txt"
