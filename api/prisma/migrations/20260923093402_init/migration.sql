-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `role` ENUM('student', 'parent', 'tutor', 'admin') NOT NULL,
    `status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
    `email_verified_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_users_role`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `revoked_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_refresh_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `education_levels` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `education_levels_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjects` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `subjects_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learners` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `owner_user_id` BIGINT UNSIGNED NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `date_of_birth` DATE NULL,
    `education_level_id` BIGINT UNSIGNED NULL,
    `is_self` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_learners_owner`(`owner_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `full_address` VARCHAR(500) NOT NULL,
    `detail_note` VARCHAR(500) NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_addresses_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_profiles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `bio` TEXT NULL,
    `education_background` VARCHAR(255) NULL,
    `teaching_experience_years` SMALLINT UNSIGNED NULL,
    `curriculum` VARCHAR(255) NULL,
    `hourly_rate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `teaching_mode` ENUM('online', 'tatap_muka', 'both') NOT NULL DEFAULT 'online',
    `verification_status` ENUM('pending_verification', 'verified', 'rejected') NOT NULL DEFAULT 'pending_verification',
    `verification_notes` VARCHAR(500) NULL,
    `avg_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    `review_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tutor_profiles_user_id_key`(`user_id`),
    INDEX `idx_tutor_verification`(`verification_status`),
    INDEX `idx_tutor_rate`(`hourly_rate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_certifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `issuer` VARCHAR(191) NULL,
    `file_url` VARCHAR(500) NULL,
    `issued_at` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_subjects` (
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `subject_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`tutor_profile_id`, `subject_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_education_levels` (
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `education_level_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`tutor_profile_id`, `education_level_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_service_areas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `area_type` ENUM('area_name', 'radius') NOT NULL,
    `area_name` VARCHAR(191) NULL,
    `center_latitude` DECIMAL(10, 7) NULL,
    `center_longitude` DECIMAL(10, 7) NULL,
    `radius_km` DECIMAL(6, 2) NULL,

    INDEX `idx_service_area_tutor`(`tutor_profile_id`),
    INDEX `idx_service_area_center`(`center_latitude`, `center_longitude`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_availabilities` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `day_of_week` TINYINT UNSIGNED NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,

    INDEX `idx_availability_tutor`(`tutor_profile_id`, `day_of_week`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_blocked_dates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `blocked_date` DATE NOT NULL,
    `reason` VARCHAR(255) NULL,

    UNIQUE INDEX `uq_tutor_blocked_date`(`tutor_profile_id`, `blocked_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `learner_id` BIGINT UNSIGNED NOT NULL,
    `tutor_profile_id` BIGINT UNSIGNED NOT NULL,
    `subject_id` BIGINT UNSIGNED NOT NULL,
    `mode` ENUM('online', 'tatap_muka') NOT NULL,
    `scheduled_start_at` DATETIME(0) NOT NULL,
    `scheduled_end_at` DATETIME(0) NOT NULL,
    `duration_minutes` SMALLINT UNSIGNED NOT NULL,
    `address_id` BIGINT UNSIGNED NULL,
    `meeting_link` VARCHAR(500) NULL,
    `status` ENUM('pending_confirmation', 'rejected', 'menunggu_pembayaran', 'dikonfirmasi', 'tutor_bersiap', 'tutor_dalam_perjalanan', 'tutor_tiba', 'sesi_berlangsung', 'sesi_selesai', 'dibatalkan') NOT NULL DEFAULT 'pending_confirmation',
    `hourly_rate_snapshot` DECIMAL(12, 2) NOT NULL,
    `service_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `qr_token` VARCHAR(191) NULL,
    `checked_in_at` DATETIME(0) NULL,
    `checked_out_at` DATETIME(0) NULL,
    `cancel_reason` VARCHAR(500) NULL,
    `cancelled_by` ENUM('student', 'tutor', 'system') NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_bookings_tutor_time`(`tutor_profile_id`, `scheduled_start_at`),
    INDEX `idx_bookings_learner`(`learner_id`),
    INDEX `idx_bookings_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_status_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `booking_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `changed_by_user_id` BIGINT UNSIGNED NULL,
    `changed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_status_history_booking`(`booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutor_locations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `booking_id` BIGINT UNSIGNED NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `recorded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_tutor_location_booking`(`booking_id`, `recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `progress_reports` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `booking_id` BIGINT UNSIGNED NOT NULL,
    `materials_covered` TEXT NOT NULL,
    `understanding_level` TINYINT UNSIGNED NOT NULL,
    `mastered_skills` TEXT NULL,
    `areas_to_improve` TEXT NULL,
    `homework_given` TEXT NULL,
    `recommendation_notes` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `progress_reports_booking_id_key`(`booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `education_level_id` BIGINT UNSIGNED NULL,
    `level` ENUM('pemula', 'menengah', 'lanjut') NOT NULL DEFAULT 'pemula',
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `is_free` BOOLEAN NOT NULL DEFAULT false,
    `thumbnail_url` VARCHAR(500) NULL,
    `status` ENUM('draft', 'in_review', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `passing_grade` DECIMAL(5, 2) NULL,
    `issues_certificate` BOOLEAN NOT NULL DEFAULT false,
    `created_by_user_id` BIGINT UNSIGNED NOT NULL,
    `avg_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    `review_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `courses_slug_key`(`slug`),
    INDEX `idx_courses_status`(`status`),
    INDEX `idx_courses_category`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_modules` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `order_index` SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    INDEX `idx_modules_course`(`course_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_lessons` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `module_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('video', 'article', 'quiz', 'assignment') NOT NULL,
    `content_url` VARCHAR(500) NULL,
    `content_body` LONGTEXT NULL,
    `duration_seconds` INTEGER UNSIGNED NULL,
    `order_index` SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    INDEX `idx_lessons_module`(`module_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_questions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `lesson_id` BIGINT UNSIGNED NOT NULL,
    `question_text` TEXT NOT NULL,
    `order_index` SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_options` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `question_id` BIGINT UNSIGNED NOT NULL,
    `option_text` VARCHAR(500) NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_enrollments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `learner_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('active', 'completed') NOT NULL DEFAULT 'active',
    `progress_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `enrolled_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `completed_at` DATETIME(0) NULL,

    INDEX `idx_enrollment_learner`(`learner_id`),
    UNIQUE INDEX `uq_enrollment`(`course_id`, `learner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lesson_progress` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `enrollment_id` BIGINT UNSIGNED NOT NULL,
    `lesson_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
    `completed_at` DATETIME(0) NULL,

    UNIQUE INDEX `uq_lesson_progress`(`enrollment_id`, `lesson_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_attempts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `enrollment_id` BIGINT UNSIGNED NOT NULL,
    `lesson_id` BIGINT UNSIGNED NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,
    `passed` BOOLEAN NOT NULL,
    `attempted_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignment_submissions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `enrollment_id` BIGINT UNSIGNED NOT NULL,
    `lesson_id` BIGINT UNSIGNED NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `feedback` TEXT NULL,
    `score` DECIMAL(5, 2) NULL,
    `graded_by_user_id` BIGINT UNSIGNED NULL,
    `submitted_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `graded_at` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `enrollment_id` BIGINT UNSIGNED NOT NULL,
    `certificate_number` VARCHAR(50) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `issued_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `certificates_enrollment_id_key`(`enrollment_id`),
    UNIQUE INDEX `certificates_certificate_number_key`(`certificate_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `payable_type` ENUM('booking', 'course_enrollment') NOT NULL,
    `payable_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('qris', 'transfer_manual') NOT NULL DEFAULT 'qris',
    `proof_image_url` VARCHAR(500) NULL,
    `status` ENUM('menunggu_pembayaran', 'menunggu_verifikasi', 'paid', 'ditolak', 'expired') NOT NULL DEFAULT 'menunggu_pembayaran',
    `submitted_at` DATETIME(0) NULL,
    `verified_by_user_id` BIGINT UNSIGNED NULL,
    `verified_at` DATETIME(0) NULL,
    `rejection_reason` VARCHAR(500) NULL,
    `paid_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_payments_payable`(`payable_type`, `payable_id`),
    INDEX `idx_payments_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `reviewable_type` ENUM('tutor_booking', 'course') NOT NULL,
    `reviewable_id` BIGINT UNSIGNED NOT NULL,
    `reviewer_user_id` BIGINT UNSIGNED NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `comment` TEXT NULL,
    `reply_text` TEXT NULL,
    `replied_at` DATETIME(0) NULL,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_reviews_reviewable`(`reviewable_type`, `reviewable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(500) NULL,
    `data` JSON NULL,
    `read_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_notifications_user`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_settings` (
    `key` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learners` ADD CONSTRAINT `learners_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learners` ADD CONSTRAINT `learners_education_level_id_fkey` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_profiles` ADD CONSTRAINT `tutor_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_certifications` ADD CONSTRAINT `tutor_certifications_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_subjects` ADD CONSTRAINT `tutor_subjects_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_subjects` ADD CONSTRAINT `tutor_subjects_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_education_levels` ADD CONSTRAINT `tutor_education_levels_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_education_levels` ADD CONSTRAINT `tutor_education_levels_education_level_id_fkey` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_service_areas` ADD CONSTRAINT `tutor_service_areas_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_availabilities` ADD CONSTRAINT `tutor_availabilities_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_blocked_dates` ADD CONSTRAINT `tutor_blocked_dates_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_learner_id_fkey` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_tutor_profile_id_fkey` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tutor_locations` ADD CONSTRAINT `tutor_locations_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_education_level_id_fkey` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_modules` ADD CONSTRAINT `course_modules_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_lessons` ADD CONSTRAINT `course_lessons_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `course_modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `course_lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_options` ADD CONSTRAINT `quiz_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_learner_id_fkey` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `course_enrollments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `course_lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `course_enrollments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `course_lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `course_enrollments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `course_lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `course_enrollments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_verified_by_user_id_fkey` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_reviewer_user_id_fkey` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
