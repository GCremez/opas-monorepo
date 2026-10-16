#!/bin/bash
cd "$(dirname "$0")"
# Load .env.local — PEM keys use literal \n which JwtUtil.loadPrivateKey()
# already converts to real newlines server-side, so no shell mangling needed.
while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
  key="${line%%=*}"; val="${line#*=}"
  export "$key=$val"
done < .env.local
exec mvn -q spring-boot:run
