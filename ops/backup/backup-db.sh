#!/bin/sh
# Learnly - Database Backup Script
# Dipanggil oleh cron di service `db-backup` (docker-compose.yml).
# Tulis dump terkompresi ke /backups dan buang yang lebih tua dari BACKUP_RETENTION_DAYS.

set -eu

MYSQL_HOST="${MYSQL_HOST:-learnly_db}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-learnly}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/backup.log}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/learnly_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "🔄 Mulai backup database '$MYSQL_DATABASE' dari $MYSQL_HOST"

if mysqldump \
    -h "$MYSQL_HOST" \
    -u "$MYSQL_USER" \
    -p"$MYSQL_PASSWORD" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --default-character-set=utf8mb4 \
    "$MYSQL_DATABASE" 2>>"$LOG_FILE" \
  | gzip -9 > "$BACKUP_FILE"; then
  :
else
  log "❌ GAGAL: mysqldump error (lihat baris di atas)"
  rm -f "$BACKUP_FILE"
  exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
  log "❌ GAGAL: file backup kosong"
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
log "✅ Sukses: $BACKUP_FILE ($SIZE)"

# Rotasi — hapus backup lebih tua dari RETENTION_DAYS
DELETED="$(find "$BACKUP_DIR" -name 'learnly_backup_*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete 2>/dev/null | wc -l | tr -d ' ')"
if [ "${DELETED:-0}" -gt 0 ]; then
  log "🧹 Rotasi: $DELETED backup lama dihapus (>${RETENTION_DAYS} hari)"
fi

TOTAL="$(find "$BACKUP_DIR" -name 'learnly_backup_*.sql.gz' | wc -l | tr -d ' ')"
TOTAL_SIZE="$(du -sh "$BACKUP_DIR" | cut -f1)"
log "📊 Ringkasan: $TOTAL file, total $TOTAL_SIZE"
