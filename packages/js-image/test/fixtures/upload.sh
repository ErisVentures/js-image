#!/bin/bash

cd $(dirname "$0")

VERSION=v1
S3PATH="npm-fixtures/@ouranos/image/$VERSION"

echo "" > files.txt

for file in *.jpg *.png;
do
  echo "$file" >> files.txt

  if [[ "$FORCE" == true || $(curl "https://s3.amazonaws.com/$S3PATH/$file" 2>/dev/null | grep 'Not Found') ]]; then
    echo "Uploading $file..."
    aws s3 cp "$file" "s3://$S3PATH/$file"
  else
    echo "Skipping file upload for $file"
  fi
done

aws s3 cp files.txt "s3://$S3PATH/files.txt"
