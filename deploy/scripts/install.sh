#!/usr/bin/env bash
# First-time setup on a server (or a laptop for a local trial).
#
#   ./scripts/install.sh --domain example.com --email ops@example.com
#       Real server: portal.example.com, api.example.com, auth.example.com, charge.example.com,
#       ocpp.example.com and ocpp-plain.example.com must already point at this server's IP address.
#
#   ./scripts/install.sh --local
#       Local trial on http://portal.localhost, with Mailpit catching e-mail.
#
# It checks Docker, creates .env with strong random passwords and prepares the
# storage settings. It never overwrites an existing .env unless you pass --force.
source "$(dirname "$0")/lib/common.sh"

DOMAIN="" EMAIL="" IS_LOCAL=false IS_FORCED=false
while (($#)); do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --local) IS_LOCAL=true; shift ;;
    --force) IS_FORCED=true; shift ;;
    -h | --help) sed -n '2,13p' "$0"; exit 0 ;;
    *) die "Unknown option $1 (see --help)" ;;
  esac
done

check_requirements() {
  command -v docker >/dev/null || die "Docker is not installed. See https://docs.docker.com/engine/install/"
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is missing (the 'docker compose' command)."
  docker info >/dev/null 2>&1 || die "Docker is installed but not running, or this user may not use it."
  command -v openssl >/dev/null || die "openssl is needed to generate passwords."
}

write_addresses() {
  if $IS_LOCAL; then
    set_env_value PUBLIC_SCHEME http
    set_env_value PORTAL_HOST portal.localhost
    set_env_value API_HOST api.localhost
    set_env_value AUTH_HOST auth.localhost
    set_env_value DRIVER_HOST charge.localhost
    set_env_value ADMIN_HOST admin.localhost
    set_env_value OCPP_HOST ocpp.localhost
    set_env_value OCPP_PLAIN_HOST ocpp-plain.localhost
    set_env_value OCPP_URL ws://ocpp.localhost/ocpp
    set_env_value OCPP_PLAIN_URL ws://ocpp-plain.localhost/ocpp
    set_env_value OCPP_REQUIRE_TLS false
    set_env_value ACME_EMAIL admin@localhost
    set_env_value PORTAL_DEV_URL http://localhost:4200
    set_env_value ADMIN_DEV_URL http://localhost:4400
    set_env_value SMTP_HOST mailpit
    set_env_value SMTP_FROM no-reply@wattwisely.localhost
    set_env_value SMTP_PORT 1025
    set_env_value SMTP_AUTH false
    set_env_value SMTP_STARTTLS false
    set_env_value COMPOSE_PROFILES dev
    set_env_value API_DOCS_ENABLED true
  else
    [[ -n "$DOMAIN" && -n "$EMAIL" ]] || die "Pass --domain and --email, or --local for a trial (see --help)."
    set_env_value PORTAL_HOST "portal.$DOMAIN"
    set_env_value API_HOST "api.$DOMAIN"
    set_env_value AUTH_HOST "auth.$DOMAIN"
    set_env_value DRIVER_HOST "charge.$DOMAIN"
    set_env_value ADMIN_HOST "admin.$DOMAIN"
    set_env_value OCPP_HOST "ocpp.$DOMAIN"
    set_env_value OCPP_PLAIN_HOST "ocpp-plain.$DOMAIN"
    set_env_value OCPP_URL "wss://ocpp.$DOMAIN/ocpp"
    set_env_value OCPP_PLAIN_URL "ws://ocpp-plain.$DOMAIN/ocpp"
    set_env_value ACME_EMAIL "$EMAIL"
    set_env_value SMTP_FROM "no-reply@$DOMAIN"
    set_env_value ALERT_EMAIL_TO "$EMAIL"
    set_env_value COMPOSE_PROFILES monitoring
  fi
}

write_secrets() {
  local key
  for key in POSTGRES_PASSWORD DB_MIGRATOR_PASSWORD DB_APP_PASSWORD KEYCLOAK_DB_PASSWORD \
    KEYCLOAK_ADMIN_PASSWORD VALKEY_PASSWORD S3_SECRET_KEY GRAFANA_ADMIN_PASSWORD; do
    set_env_value "$key" "$(random_secret 32)"
  done
  set_env_value S3_ACCESS_KEY "$(random_secret 20)"
}

write_storage_config() {
  sed -e "s|__S3_ACCESS_KEY__|$(env_value S3_ACCESS_KEY)|" -e "s|__S3_SECRET_KEY__|$(env_value S3_SECRET_KEY)|" \
    "$DEPLOY_DIR/seaweedfs/s3.json.template" >"$DEPLOY_DIR/seaweedfs/s3.json"
  chmod 640 "$DEPLOY_DIR/seaweedfs/s3.json"
}

main() {
  check_requirements
  if [[ -f "$ENV_FILE" ]] && ! $IS_FORCED; then
    die ".env already exists. Keep it, or pass --force to start over (old passwords are lost)."
  fi
  info "Creating .env"
  cp "$DEPLOY_DIR/.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  write_addresses
  write_secrets
  write_storage_config
  mkdir -p "$SECRETS_DIR" "$BACKUP_ROOT" && chmod 700 "$SECRETS_DIR" "$BACKUP_ROOT"

  info "Done. Next steps:"
  $IS_LOCAL || echo "  1. Check the SMTP_* settings in $ENV_FILE (e-mail for password resets)."
  echo "  - Start everything:        ./scripts/up.sh"
  $IS_LOCAL && echo "  - Add demo tenants/users:  ./scripts/seed-demo.sh"
  echo "  - Keycloak admin password: grep KEYCLOAK_ADMIN_PASSWORD $ENV_FILE"
  $IS_LOCAL || echo "  - Alerts are e-mailed to $EMAIL; Grafana password: grep GRAFANA_ADMIN_PASSWORD $ENV_FILE"
}

main
