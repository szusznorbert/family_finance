#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Hiba: Node.js nincs telepítve vagy nincs benne a PATH-ban." >&2
  exit 1
fi
if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 24 ? 0 : 1)' >/dev/null 2>&1; then
  echo "Hiba: A Node.js $(node --version) nem támogatott. Használd a .nvmrc szerinti Node.js verziót (24.22.1)." >&2
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "Hiba: pnpm nem található. Engedélyezd a Corepacket (corepack enable), majd próbáld újra." >&2
  exit 1
fi
EXPECTED_PNPM_VERSION="$(node -p 'require("./package.json").packageManager.split("@")[1]')"
ACTUAL_PNPM_VERSION="$(pnpm --version 2>/dev/null || true)"
if [[ "$ACTUAL_PNPM_VERSION" != "$EXPECTED_PNPM_VERSION" ]]; then
  echo "Hiba: pnpm $EXPECTED_PNPM_VERSION szükséges, jelenlegi: ${ACTUAL_PNPM_VERSION:-nem futtatható}." >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "Hiba: Python 3 szükséges a helyi .env előkészítéséhez." >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Hiba: Docker és a Docker Compose plugin szükséges az adatbázishoz." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Hiba: A Docker daemon nem érhető el. Indítsd el a Docker Desktopot, és ellenőrizd a Docker-hozzáférést." >&2
  exit 1
fi
if ! command -v lsof >/dev/null 2>&1; then
  echo "Hiba: lsof szükséges a 3000-es webport ellenőrzéséhez." >&2
  exit 1
fi
if lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Hiba: A 3000-es port már foglalt. Állítsd le a meglévő webszervert, majd próbáld újra; a WEB_ORIGIN-nek a web pontos portjával kell egyeznie." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Létrehoztam a .env fájlt az .env.example alapján."
fi

# Fill only the starter placeholders; keep any values the user has already set.
python3 - <<'PY'
from pathlib import Path
import re
import secrets

env_path = Path(".env")
content = env_path.read_text()
values = {
    "POSTGRES_PASSWORD": secrets.token_hex(24),
    "BETTER_AUTH_SECRET": secrets.token_urlsafe(48),
}

for key, value in values.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    match = pattern.search(content)
    if match and ("change-this-local-password" in match.group(0) or "replace-this-with-a-generated-secret" in match.group(0)):
        content = pattern.sub(f"{key}={value}", content, count=1)

password_match = re.search(r"^POSTGRES_PASSWORD=(.*)$", content, re.MULTILINE)
database_url_match = re.search(r"^DATABASE_URL=(.*)$", content, re.MULTILINE)
if password_match and database_url_match and "change-this-local-password" in database_url_match.group(1):
    password = password_match.group(1)
    def env_value(key, default):
        match = re.search(rf"^{re.escape(key)}=(.*)$", content, re.MULTILINE)
        return match.group(1) if match else default

    user = env_value("POSTGRES_USER", "family_finance")
    database = env_value("POSTGRES_DB", "family_finance")
    content = re.sub(
        r"^DATABASE_URL=.*$",
        f"DATABASE_URL=postgresql://{user}:{password}@localhost:5432/{database}?schema=public",
        content,
        count=1,
        flags=re.MULTILINE,
    )

env_path.write_text(content)
PY

echo "PostgreSQL és API indítása a privát dokumentumkötettel..."
docker compose up --build -d --wait api

echo "Indítom a webalkalmazást. Leállításhoz nyomj Ctrl+C-t; az API konténer futva marad."
pnpm --filter web dev
