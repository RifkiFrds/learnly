# Database Backup

Service `db-backup` di `docker-compose.yml` menjalankan `backup-db.sh` setiap hari pukul **02:00 WIB** dengan retensi **30 hari** (sesuai NFR-AVAIL-03).

## File di folder ini

| File | Fungsi |
| --- | --- |
| `backup-db.sh` | Skrip utama — `mysqldump` + `gzip`, lalu rotasi file lama. |
| `crontab` | Jadwal cron (`0 2 * * *`). |

## Lokasi hasil backup

Volume Docker bernama **`learnly_backups_data`** (dimount ke `/backups` di container).

```powershell
# Lihat daftar backup
docker exec learnly_db_backup ls -lh /backups

# Lihat log
docker exec learnly_db_backup tail -n 50 /var/log/backup.log
# atau
docker logs -f learnly_db_backup
```

## Trigger backup manual

```powershell
docker exec learnly_db_backup /usr/local/bin/backup-db.sh
```

## Restore

```powershell
# Ganti NAMA_FILE dengan file di /backups
docker exec learnly_db_backup sh -c "gunzip < /backups/NAMA_FILE.sql.gz" `
  | docker exec -i learnly_db mysql -uroot -p"$env:MYSQL_ROOT_PASSWORD" learnly
```

## Konfigurasi

Env yang dibaca `backup-db.sh` (sudah di-set di `docker-compose.yml`):

| Env | Default | Keterangan |
| --- | --- | --- |
| `MYSQL_HOST` | `learnly_db` | Host container MySQL. |
| `MYSQL_USER` | `root` | User dengan izin dump. |
| `MYSQL_PASSWORD` | — | Diisi dari `MYSQL_ROOT_PASSWORD`. |
| `MYSQL_DATABASE` | `learnly` | DB yang di-dump. |
| `BACKUP_RETENTION_DAYS` | `30` | Umur maksimum file di `/backups`. |
| `BACKUP_DIR` | `/backups` | Lokasi output. |

## Mengubah jadwal

Edit `crontab` (format standar cron 5 kolom), lalu `docker compose up -d db-backup`.
