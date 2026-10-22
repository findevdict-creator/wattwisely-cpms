#!/usr/bin/env bash
# Follows the logs of one service, or of all services.
#   ./scripts/logs.sh api
source "$(dirname "$0")/lib/common.sh"
require_env_file
compose logs --follow --tail 200 "$@"
