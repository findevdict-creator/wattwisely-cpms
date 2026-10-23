#!/bin/sh
# Starts Alertmanager with its settings from the environment (module 12). Alertmanager cannot
# read environment variables itself, so this writes the config into the container's /tmp,
# never onto the server's disk, quoting each value for YAML. Runs in the image's busybox sh.
# With --check it only validates the result (CI does this).
set -eu

TEMPLATE=/etc/alertmanager-template/alertmanager.yml.template
CONFIG=/tmp/alertmanager.yml

if [ "${SMTP_STARTTLS:-false}" = "true" ]; then SMTP_REQUIRE_TLS=true; else SMTP_REQUIRE_TLS=false; fi
export SMTP_REQUIRE_TLS

# Replaces every __NAME__ with the environment variable NAME, doubling ' for single-quoted YAML.
awk '
  {
    line = $0
    out = ""
    while (match(line, /__[A-Z_]+__/)) {
      name = substr(line, RSTART + 2, RLENGTH - 4)
      value = ENVIRON[name]
      gsub(/\047/, "\047\047", value)
      out = out substr(line, 1, RSTART - 1) value
      line = substr(line, RSTART + RLENGTH)
    }
    print out line
  }
' "$TEMPLATE" >"$CONFIG"

# CI runs the image with --check: render, validate with amtool and stop.
if [ "${1:-}" = "--check" ]; then
  exec /bin/amtool check-config "$CONFIG"
fi
exec /bin/alertmanager --config.file="$CONFIG" --storage.path=/alertmanager "$@"
