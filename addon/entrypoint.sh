#!/bin/sh

# Read from HA addon options
if [ -f /data/options.json ]; then
  REGISTRATION_ENABLED=$(node -e "const o=require('/data/options.json'); console.log(o.registration_enabled!==undefined?o.registration_enabled:true)")
  DEFAULT_CURRENCY=$(node -e "const o=require('/data/options.json'); console.log(o.default_currency||'EUR')")
fi

: "${REGISTRATION_ENABLED:=true}"
: "${DEFAULT_CURRENCY:=EUR}"
export REGISTRATION_ENABLED
export DEFAULT_CURRENCY

# Set data directory
: "${DATA_DIR:=/data}"
export DATA_DIR

exec node build
