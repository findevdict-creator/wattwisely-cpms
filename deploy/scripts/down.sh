#!/usr/bin/env bash
# Stops every container. Data stays in the Docker volumes.
source "$(dirname "$0")/lib/common.sh"
require_env_file
compose down
info "Stopped. Start again with ./scripts/up.sh"
