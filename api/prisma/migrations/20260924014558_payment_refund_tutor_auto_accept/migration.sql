-- AlterTable
ALTER TABLE `payments` ADD COLUMN `refund_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `refund_note` VARCHAR(500) NULL,
    ADD COLUMN `refunded_at` DATETIME(0) NULL,
    MODIFY `status` ENUM('menunggu_pembayaran', 'menunggu_verifikasi', 'paid', 'ditolak', 'expired', 'refunded') NOT NULL DEFAULT 'menunggu_pembayaran';

-- AlterTable
ALTER TABLE `tutor_profiles` ADD COLUMN `auto_accept` BOOLEAN NOT NULL DEFAULT false;
