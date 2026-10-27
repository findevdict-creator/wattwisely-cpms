#!/usr/bin/env bash
# Database roles and migrations for the Wattwisely database. Sourced by up.sh and restore.sh.
#
# Two login roles keep row-level security meaningful:
#   wattwisely_migrator  owns the tables; only migrations log in with it
#   wattwisely_app       what the API runs as; it owns nothing, so row-level security applies

# Servers installed before module 2 have no database passwords in .env yet: add them.
ensure_database_secrets() {
  local key
  for key in DB_MIGRATOR_PASSWORD DB_APP_PASSWORD; do
    [[ -n "$(env_value "$key")" ]] || set_env_value "$key" "$(random_secret 32)"
  done
}

# Creates the two roles if needed and sets their passwords from .env. Safe to run every time.
ensure_database_roles() {
  info "Database roles"
  compose exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U wattwisely -d wattwisely \
    -v migrator_password="$(env_value DB_MIGRATOR_PASSWORD)" \
    -v app_password="$(env_value DB_APP_PASSWORD)" >/dev/null <<'SQL'
SELECT format('CREATE ROLE %I', name) FROM unnest(ARRAY['wattwisely_migrator', 'wattwisely_app']) AS name
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = name) \gexec
ALTER ROLE wattwisely_migrator WITH LOGIN PASSWORD :'migrator_password';
ALTER ROLE wattwisely_app WITH LOGIN PASSWORD :'app_password';
GRANT CONNECT, CREATE ON DATABASE wattwisely TO wattwisely_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO wattwisely_migrator;
GRANT CONNECT ON DATABASE wattwisely TO wattwisely_app;
SQL
}

# Keycloak's own role and database. The Postgres init script creates them only when the volume
# is first made; if that first start failed (for example a checkout with Windows line endings,
# where the init script could not run), this creates them now. It also keeps the password in
# step with KEYCLOAK_DB_PASSWORD in .env. Safe to run every time.
ensure_keycloak_database() {
  info "Keycloak database"
  compose exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U wattwisely -d wattwisely \
    -v keycloak_password="$(env_value KEYCLOAK_DB_PASSWORD)" >/dev/null <<'SQL'
SELECT 'CREATE ROLE keycloak' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'keycloak') \gexec
ALTER ROLE keycloak WITH LOGIN PASSWORD :'keycloak_password';
SELECT 'CREATE DATABASE keycloak OWNER keycloak' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'keycloak') \gexec
SQL
}

# Applies new migrations with the image that is about to start, before the API serves requests.
run_migrations() {
  info "Database migrations"
  MIGRATION_DATABASE_URL="postgres://wattwisely_migrator:$(env_value DB_MIGRATOR_PASSWORD)@postgres:5432/wattwisely"
  export MIGRATION_DATABASE_URL
  compose run --rm --no-deps -T -e MIGRATION_DATABASE_URL api node migrate.js
}
