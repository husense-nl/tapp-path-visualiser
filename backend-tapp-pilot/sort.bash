#!/bin/bash

source .env

# Create tmp dir
rm -rf $TMP_DIR && mkdir -p $TMP_DIR

mkdir -p $TMP_UNZIPPED_DIR

# Proccess all files inside /in dir
for zip in ./in/*.zip; do
    [ -e "$zip" ] || continue
    unzip -o "$zip" -d $TMP_UNZIPPED_DIR
done

# copying all json files and move them to ./tmp/raw-jsons dir
find $TMP_UNZIPPED_DIR -type f -name "*.json" -exec mv {} "$TMP_DIR" ";"

rm -rf $TMP_UNZIPPED_DIR