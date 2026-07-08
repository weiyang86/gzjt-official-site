#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_SOURCE="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"

if [[ -z "${PROJECT_DIR:-}" ]]; then
  PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
  export PROJECT_DIR
fi

# Keep the running script stable while git updates the working tree.
if [[ "${GZJT_DEPLOY_SELF_COPY:-0}" != "1" && -f "$SCRIPT_SOURCE" ]]; then
  TMP_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/gzjt-production-update.XXXXXX")"
  cp "$SCRIPT_SOURCE" "$TMP_SCRIPT"
  chmod +x "$TMP_SCRIPT"
  export GZJT_DEPLOY_SELF_COPY=1
  exec "$TMP_SCRIPT" "$@"
fi

ACTION="${1:-deploy}"

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-dev}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.directus}"
BACKUP_ROOT="${BACKUP_ROOT:-backups}"

DB_SERVICE="${DB_SERVICE:-directus-db}"
DIRECTUS_SERVICE="${DIRECTUS_SERVICE:-directus}"
REBUILD_SERVICES="${REBUILD_SERVICES:-web}"

UPLOADS_PATH="${UPLOADS_PATH:-.data/directus/uploads}"
EXTENSIONS_PATH="${EXTENSIONS_PATH:-.data/directus/extensions}"
HEALTH_URLS="${HEALTH_URLS:-http://127.0.0.1:3000/ http://127.0.0.1:8055/server/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-15}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_RETRY_SLEEP="${HEALTH_RETRY_SLEEP:-5}"

POSTGRES_DB_DEFAULT="gzjt_cms"
POSTGRES_USER_DEFAULT="gzjt_cms"

log() {
  printf '\n[%s] %s\n' "$(date '+%F %T')" "$*" >&2
}

die() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy/production-update.sh deploy
  CONFIRM_RESTORE=YES scripts/deploy/production-update.sh restore <backup_dir>

Common environment variables:
  PROJECT_DIR=/www/wwwroot/gzjt-official-site
  BRANCH=dev
  REMOTE=origin
  COMPOSE_FILE=docker-compose.prod.yml
  ENV_FILE=.env.directus
  REBUILD_SERVICES="web"
  DB_SERVICE=directus-db
  DIRECTUS_SERVICE=directus
  HEALTH_URLS="http://127.0.0.1:3000/ http://127.0.0.1:8055/server/health"
  FORCE_RECREATE=1

Deploy flow:
  1. Preflight check git, docker compose, compose services, and tracked local changes.
  2. Fetch the target branch.
  3. Back up PostgreSQL, uploads, and extensions.
  4. Pull code with --ff-only.
  5. Rebuild/recreate configured services.
  6. Run local health checks.

Restore is intentionally explicit because it replaces production data.
EOF
}

abs_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$PROJECT_DIR" "$1" ;;
  esac
}

COMPOSE_FILE_PATH="$(abs_path "$COMPOSE_FILE")"
ENV_FILE_PATH="$(abs_path "$ENV_FILE")"
BACKUP_ROOT_PATH="$(abs_path "$BACKUP_ROOT")"

compose() {
  local args=()

  if [[ -f "$ENV_FILE_PATH" ]]; then
    args+=(--env-file "$ENV_FILE_PATH")
  fi

  args+=(-f "$COMPOSE_FILE_PATH")
  docker compose "${args[@]}" "$@"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

env_file_value() {
  local key="$1"
  local raw

  [[ -f "$ENV_FILE_PATH" ]] || return 0

  raw="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE_PATH" || true)"
  [[ -n "$raw" ]] || return 0

  printf '%s\n' "$raw" \
    | tail -n 1 \
    | sed -E "s/^[^=]*=//; s/\r$//; s/^[[:space:]]+//; s/[[:space:]]+$//; s/^\"//; s/\"$//; s/^'//; s/'$//"
}

config_value() {
  local key="$1"
  local default_value="$2"
  local value="${!key:-}"

  if [[ -z "$value" ]]; then
    value="$(env_file_value "$key")"
  fi

  if [[ -z "$value" ]]; then
    value="$default_value"
  fi

  printf '%s\n' "$value"
}

service_exists() {
  local service="$1"
  compose config --services | grep -Fxq "$service"
}

require_service() {
  local service="$1"
  service_exists "$service" || die "Compose service not found: $service"
}

ensure_relative_data_path() {
  local path="$1"
  local name="$2"

  [[ "$path" != /* ]] || die "$name must be relative to PROJECT_DIR: $path"
}

preflight() {
  cd "$PROJECT_DIR"

  require_command git
  require_command docker
  require_command curl
  require_command tar

  [[ -d .git ]] || die "PROJECT_DIR is not a git repository: $PROJECT_DIR"
  [[ -f "$COMPOSE_FILE_PATH" ]] || die "Compose file not found: $COMPOSE_FILE_PATH"

  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    [[ "${ALLOW_MAIN_DEPLOY:-0}" == "1" ]] || die "Refusing to deploy $BRANCH. Set ALLOW_MAIN_DEPLOY=1 only if this is intentional."
  fi

  local dirty
  dirty="$(git status --porcelain --untracked-files=no)"
  [[ -z "$dirty" ]] || die "Tracked files have local changes on the server. Commit/stash them before deployment."

  ensure_relative_data_path "$UPLOADS_PATH" "UPLOADS_PATH"
  ensure_relative_data_path "$EXTENSIONS_PATH" "EXTENSIONS_PATH"

  require_service "$DB_SERVICE"

  local service
  for service in $REBUILD_SERVICES; do
    require_service "$service"
  done
}

prepare_branch() {
  log "Fetching $REMOTE/$BRANCH"
  git fetch --prune "$REMOTE" "+refs/heads/$BRANCH:refs/remotes/$REMOTE/$BRANCH"

  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git switch "$BRANCH"
  else
    git switch --track -c "$BRANCH" "$REMOTE/$BRANCH"
  fi

  local dirty
  dirty="$(git status --porcelain --untracked-files=no)"
  [[ -z "$dirty" ]] || die "Tracked files changed after switching to $BRANCH. Stop and inspect the server worktree."
}

archive_directory() {
  local relative_path="$1"
  local output_file="$2"
  local label="$3"

  if [[ -d "$PROJECT_DIR/$relative_path" ]]; then
    log "Backing up $label"
    tar -czf "$output_file" -C "$PROJECT_DIR" "$relative_path"
  else
    log "Skipping $label backup because $relative_path does not exist"
  fi
}

backup_data() {
  local old_commit="$1"
  local target_commit="$2"
  local postgres_db
  local postgres_user
  local backup_dir

  postgres_db="$(config_value POSTGRES_DB "$POSTGRES_DB_DEFAULT")"
  postgres_user="$(config_value POSTGRES_USER "$POSTGRES_USER_DEFAULT")"
  backup_dir="$BACKUP_ROOT_PATH/$(date '+%Y%m%d_%H%M%S')"

  mkdir -p "$backup_dir"

  log "Backing up PostgreSQL database $postgres_db from service $DB_SERVICE"
  compose exec -T "$DB_SERVICE" pg_dump \
    -U "$postgres_user" \
    -d "$postgres_db" \
    --format=custom \
    --no-owner \
    --no-acl \
    > "$backup_dir/directus.dump"

  [[ -s "$backup_dir/directus.dump" ]] || die "Database backup is empty: $backup_dir/directus.dump"

  archive_directory "$UPLOADS_PATH" "$backup_dir/directus-uploads.tar.gz" "Directus uploads"
  archive_directory "$EXTENSIONS_PATH" "$backup_dir/directus-extensions.tar.gz" "Directus extensions"

  cat > "$backup_dir/manifest.txt" <<EOF
created_at=$(date '+%F %T %z')
project_dir=$PROJECT_DIR
branch=$BRANCH
remote=$REMOTE
old_commit=$old_commit
target_commit=$target_commit
compose_file=$COMPOSE_FILE_PATH
env_file=$ENV_FILE_PATH
db_service=$DB_SERVICE
postgres_db=$postgres_db
postgres_user=$postgres_user
rebuild_services=$REBUILD_SERVICES
uploads_path=$UPLOADS_PATH
extensions_path=$EXTENSIONS_PATH
EOF

  log "Backup created: $backup_dir"
  printf '%s\n' "$backup_dir"
}

pull_code() {
  log "Pulling code with --ff-only"
  git pull --ff-only "$REMOTE" "$BRANCH"
}

rebuild_services() {
  local args=(up -d --build --no-deps)

  log "Rebuilding/recreating services: $REBUILD_SERVICES"

  if [[ "${FORCE_RECREATE:-0}" == "1" ]]; then
    args+=(--force-recreate)
  fi

  compose "${args[@]}" $REBUILD_SERVICES

  if [[ "${PRUNE_UNUSED_IMAGES:-0}" == "1" ]]; then
    log "Pruning unused Docker images"
    docker image prune -f
  fi
}

health_check_url() {
  local url="$1"
  local attempt
  local code

  for attempt in $(seq 1 "$HEALTH_RETRIES"); do
    code="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time "$HEALTH_TIMEOUT" "$url" || true)"
    if [[ "$code" =~ ^[23][0-9][0-9]$ ]]; then
      log "Health check OK: $url ($code)"
      return 0
    fi

    log "Health check waiting: $url ($code), attempt $attempt/$HEALTH_RETRIES"
    sleep "$HEALTH_RETRY_SLEEP"
  done

  return 1
}

health_checks() {
  if [[ -z "$HEALTH_URLS" ]]; then
    log "HEALTH_URLS is empty; skipping HTTP health checks"
    return 0
  fi

  log "Current compose status"
  compose ps

  local url
  for url in $HEALTH_URLS; do
    health_check_url "$url" || die "Health check failed: $url"
  done
}

deploy() {
  preflight
  prepare_branch

  local old_commit
  local target_commit
  local backup_dir

  old_commit="$(git rev-parse HEAD)"
  target_commit="$(git rev-parse "$REMOTE/$BRANCH")"

  log "Current commit: $old_commit"
  log "Target commit:  $target_commit"

  backup_dir="$(backup_data "$old_commit" "$target_commit" | tail -n 1)"

  pull_code
  rebuild_services
  health_checks

  log "Deployment complete"
  log "Backup for this deployment: $backup_dir"
}

stop_if_exists() {
  local service="$1"

  if service_exists "$service"; then
    compose stop "$service"
  fi
}

restore_archive_if_present() {
  local archive_file="$1"
  local relative_path="$2"
  local label="$3"

  if [[ -f "$archive_file" ]]; then
    log "Restoring $label"
    rm -rf "$PROJECT_DIR/$relative_path"
    mkdir -p "$(dirname "$PROJECT_DIR/$relative_path")"
    tar -xzf "$archive_file" -C "$PROJECT_DIR"
  else
    log "Skipping $label restore because archive does not exist: $archive_file"
  fi
}

restore_data() {
  local restore_dir="${1:-}"
  local postgres_db
  local postgres_user
  local service

  [[ -n "$restore_dir" ]] || die "restore requires a backup directory"
  restore_dir="$(abs_path "$restore_dir")"

  [[ -d "$restore_dir" ]] || die "Backup directory not found: $restore_dir"
  [[ -f "$restore_dir/directus.dump" ]] || die "Database dump not found: $restore_dir/directus.dump"
  [[ "${CONFIRM_RESTORE:-}" == "YES" ]] || die "Set CONFIRM_RESTORE=YES to restore production data"

  preflight

  postgres_db="$(config_value POSTGRES_DB "$POSTGRES_DB_DEFAULT")"
  postgres_user="$(config_value POSTGRES_USER "$POSTGRES_USER_DEFAULT")"

  log "Stopping write services before restore"
  stop_if_exists "$DIRECTUS_SERVICE"
  for service in $REBUILD_SERVICES; do
    stop_if_exists "$service"
  done

  log "Ensuring database service is running"
  compose up -d "$DB_SERVICE"

  log "Recreating PostgreSQL database $postgres_db"
  compose exec -T "$DB_SERVICE" dropdb -U "$postgres_user" --if-exists "$postgres_db"
  compose exec -T "$DB_SERVICE" createdb -U "$postgres_user" "$postgres_db"

  log "Restoring PostgreSQL dump"
  compose exec -T "$DB_SERVICE" pg_restore \
    -U "$postgres_user" \
    -d "$postgres_db" \
    --no-owner \
    --no-acl \
    < "$restore_dir/directus.dump"

  restore_archive_if_present "$restore_dir/directus-uploads.tar.gz" "$UPLOADS_PATH" "Directus uploads"
  restore_archive_if_present "$restore_dir/directus-extensions.tar.gz" "$EXTENSIONS_PATH" "Directus extensions"

  log "Restarting application services"
  if service_exists "$DIRECTUS_SERVICE"; then
    compose up -d "$DIRECTUS_SERVICE"
  fi

  for service in $REBUILD_SERVICES; do
    compose up -d "$service"
  done

  health_checks
  log "Restore complete: $restore_dir"
}

case "$ACTION" in
  deploy)
    deploy
    ;;
  restore)
    restore_data "${2:-}"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    usage
    die "Unknown action: $ACTION"
    ;;
esac
