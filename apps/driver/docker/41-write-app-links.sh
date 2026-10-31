#!/bin/sh
# Writes the two files that let the Wattwisely mobile app open this domain's links (module 32):
# a plug's QR code, /c/<charger>/<plug>, and an invitation, /invitations/<token>. Android reads
# assetlinks.json, iOS apple-app-site-association. Without the app's settings neither file is
# written, and the links open in the browser as before. Runs when the nginx container starts.
set -eu

WELL_KNOWN=/usr/share/nginx/html/.well-known
APP_ID="${MOBILE_APP_ID:-com.wattwisely.driver}"
mkdir -p "$WELL_KNOWN"
rm -f "$WELL_KNOWN/assetlinks.json" "$WELL_KNOWN/apple-app-site-association"

if [ -n "${MOBILE_ANDROID_CERT_SHA256:-}" ]; then
  # One or more SHA-256 fingerprints, comma-separated: Google Play's app signing key, and the
  # upload key for builds installed by hand.
  fingerprints=$(printf '%s' "$MOBILE_ANDROID_CERT_SHA256" | tr -d ' ' | sed 's/,/","/g')
  cat > "$WELL_KNOWN/assetlinks.json" <<JSON
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "${APP_ID}",
      "sha256_cert_fingerprints": ["${fingerprints}"]
    }
  }
]
JSON
  echo "driver: wrote assetlinks.json for ${APP_ID}"
fi

if [ -n "${MOBILE_IOS_TEAM_ID:-}" ]; then
  cat > "$WELL_KNOWN/apple-app-site-association" <<JSON
{
  "applinks": {
    "details": [
      {
        "appIDs": ["${MOBILE_IOS_TEAM_ID}.${APP_ID}"],
        "components": [{ "/": "/c/*" }, { "/": "/invitations/*" }]
      }
    ]
  }
}
JSON
  echo "driver: wrote apple-app-site-association for ${MOBILE_IOS_TEAM_ID}.${APP_ID}"
fi
