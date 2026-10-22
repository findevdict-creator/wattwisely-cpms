#!/usr/bin/env bash
# OpenBao starts "sealed" after every restart: its data stays encrypted until it is unsealed.
# These helpers initialise it once and unseal it on every start. Sourced by up.sh and restore.sh.

OPENBAO_INIT_FILE="$SECRETS_DIR/openbao-init.txt"

bao() {
  compose exec -T openbao bao "$@"
}

# Prints OpenBao's status as JSON. "bao status" exits 2 while sealed, which is not an error here.
openbao_status_json() {
  bao status -format=json 2>/dev/null || true
}

openbao_initialise() {
  info "Initialising OpenBao (first start)"
  mkdir -p "$SECRETS_DIR" && chmod 700 "$SECRETS_DIR"
  bao operator init -key-shares=1 -key-threshold=1 >"$OPENBAO_INIT_FILE"
  chmod 600 "$OPENBAO_INIT_FILE"
  warn "OpenBao unseal key and root token saved to $OPENBAO_INIT_FILE"
  warn "Copy that file to a password manager. Anyone with it can read every platform secret."
}

openbao_unseal() {
  local attempts=0 status
  status="$(openbao_status_json)"
  until grep -q '"initialized"' <<<"$status"; do
    ((attempts++ < 30)) || die "OpenBao did not start. See: ./scripts/logs.sh openbao"
    sleep 2
    status="$(openbao_status_json)"
  done
  if grep -q '"initialized": *false' <<<"$status"; then
    openbao_initialise
  fi
  if grep -q '"sealed": *true' <<<"$(openbao_status_json)"; then
    [[ -f "$OPENBAO_INIT_FILE" ]] || die "OpenBao is sealed and $OPENBAO_INIT_FILE is missing. Restore it from your password manager."
    info "Unsealing OpenBao"
    bao operator unseal "$(awk '/Unseal Key 1:/ {print $4}' "$OPENBAO_INIT_FILE")" >/dev/null
  fi
}
