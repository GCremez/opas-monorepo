#!/bin/bash
cd "$(dirname "$0")"
# Load .env.local, converting literal \n in values to real newlines so multi-line
# PEM keys (JWT_PRIVATE_KEY/PUBLIC_KEY) parse correctly.
while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
  key="${line%%=*}"; val="${line#*=}"; val="${val//\\n/$'\n'}"
  export "$key=$val"
done < .env.local
exec ./mvnw -q spring-boot:run
