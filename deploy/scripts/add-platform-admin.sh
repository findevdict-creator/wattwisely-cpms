#!/usr/bin/env bash
# Makes someone a Wattwisely administrator in the admin console: the first one on a new
# server, or a replacement when every administrator has gone. Everyone after that is added
# from the console's Staff page.
#
#   ./scripts/add-platform-admin.sh ada@wattwisely.com ["Ada Admin"]
#
# The person logs in to the console through Keycloak like everyone else: create their user
# in the Keycloak admin console (https://AUTH_HOST/admin) or let your SSO create it. Their
# account is matched by e-mail at first login.
source "$(dirname "$0")/lib/common.sh"
require_env_file

email="$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')"
name="${2:-}"
[[ -n "$email" ]] || die "Usage: $0 <email> [name]"

compose exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U wattwisely -d wattwisely \
  -v email="$email" -v name="$name" >/dev/null <<'SQL'
INSERT INTO user_accounts (id, email, name) VALUES (gen_random_uuid(), :'email', :'name')
ON CONFLICT (lower(email)) DO NOTHING;
INSERT INTO platform_staff (id, user_account_id, role)
SELECT gen_random_uuid(), id, 'admin' FROM user_accounts WHERE lower(email) = :'email'
ON CONFLICT (user_account_id) DO UPDATE
  SET role = 'admin', removed_at = NULL, removed_by = NULL,
      version = platform_staff.version + 1, updated_at = now();
SQL

info "$email is a Wattwisely administrator. The console is at $(env_value PUBLIC_SCHEME)://$(env_value ADMIN_HOST)"
