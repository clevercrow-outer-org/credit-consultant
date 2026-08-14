-- Credit Consultant database design
-- Target: MySQL 8.0+
-- Purpose:
--   1. Cache first-time mobile prefill API responses in search_by_mobile.
--   2. Reuse cached profile for the same mobile instead of hitting the API again.
--   3. Store Razorpay payment lifecycle separately.
--   4. Store complete Equifax/CIBIL report details and PDF payload in equifax_credit_report.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS credit_consultant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE credit_consultant;

-- ---------------------------------------------------------------------
-- Table: search_by_mobile
-- ---------------------------------------------------------------------
-- One row per Indian mobile number. This is the prefill cache.
-- On first lookup:
--   - call external prefill API
--   - save either FOUND or NOT_FOUND result here
-- On next lookup:
--   - read this table first
--   - call external API only if row is missing/stale or force refresh is requested

CREATE TABLE IF NOT EXISTS search_by_mobile (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  mobile CHAR(10) NOT NULL,
  country_code VARCHAR(5) NOT NULL DEFAULT '+91',

  full_name VARCHAR(160) NULL,
  pan_number CHAR(10) NULL,
  date_of_birth DATE NULL,
  gender ENUM('M', 'F', 'O', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',

  lookup_status ENUM('FOUND', 'NOT_FOUND', 'API_ERROR') NOT NULL DEFAULT 'FOUND',
  api_provider VARCHAR(60) NOT NULL DEFAULT 'avmanagement_prefill',
  api_http_status SMALLINT UNSIGNED NULL,
  api_message VARCHAR(255) NULL,
  raw_api_response JSON NULL,

  first_searched_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_searched_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  api_fetched_at DATETIME(3) NULL,
  api_hit_count INT UNSIGNED NOT NULL DEFAULT 0,
  db_cache_hit_count INT UNSIGNED NOT NULL DEFAULT 0,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uq_search_by_mobile_mobile (mobile),
  KEY idx_search_by_mobile_pan (pan_number),
  KEY idx_search_by_mobile_name (full_name),
  KEY idx_search_by_mobile_lookup_status (lookup_status),
  KEY idx_search_by_mobile_last_searched_at (last_searched_at),

  CONSTRAINT chk_search_by_mobile_mobile
    CHECK (mobile REGEXP '^[6-9][0-9]{9}$'),
  CONSTRAINT chk_search_by_mobile_pan
    CHECK (pan_number IS NULL OR pan_number REGEXP '^[A-Z]{5}[0-9]{4}[A-Z]$')
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: razorpay_payments
-- ---------------------------------------------------------------------
-- Payment is independent from report generation.
-- A report can be generated only after payment_status = 'captured' or 'authorized'
-- depending on your settlement policy.

CREATE TABLE IF NOT EXISTS razorpay_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  local_payment_ref VARCHAR(64) NOT NULL,
  search_by_mobile_id BIGINT UNSIGNED NULL,

  customer_name VARCHAR(160) NOT NULL,
  mobile CHAR(10) NOT NULL,
  email VARCHAR(190) NULL,

  amount_paise INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  payment_purpose ENUM('CREDIT_REPORT', 'CREDIT_DASHBOARD', 'GST_INVOICE') NOT NULL DEFAULT 'CREDIT_REPORT',

  razorpay_order_id VARCHAR(80) NULL,
  razorpay_payment_id VARCHAR(80) NULL,
  razorpay_signature VARCHAR(255) NULL,

  payment_status ENUM(
    'created',
    'opened',
    'authorized',
    'captured',
    'failed',
    'cancelled',
    'refunded'
  ) NOT NULL DEFAULT 'created',

  payment_method VARCHAR(40) NULL,
  bank VARCHAR(80) NULL,
  wallet VARCHAR(80) NULL,
  vpa VARCHAR(120) NULL,
  card_last4 CHAR(4) NULL,

  gateway_error_code VARCHAR(80) NULL,
  gateway_error_description VARCHAR(500) NULL,
  raw_gateway_response JSON NULL,

  opened_at DATETIME(3) NULL,
  paid_at DATETIME(3) NULL,
  failed_at DATETIME(3) NULL,
  cancelled_at DATETIME(3) NULL,
  refunded_at DATETIME(3) NULL,

  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uq_razorpay_payments_local_ref (local_payment_ref),
  UNIQUE KEY uq_razorpay_payments_payment_id (razorpay_payment_id),
  KEY idx_razorpay_payments_mobile (mobile),
  KEY idx_razorpay_payments_status (payment_status),
  KEY idx_razorpay_payments_paid_at (paid_at),
  KEY idx_razorpay_payments_search_id (search_by_mobile_id),

  CONSTRAINT fk_razorpay_payments_search_by_mobile
    FOREIGN KEY (search_by_mobile_id)
    REFERENCES search_by_mobile (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT chk_razorpay_payments_mobile
    CHECK (mobile REGEXP '^[6-9][0-9]{9}$'),
  CONSTRAINT chk_razorpay_payments_amount
    CHECK (amount_paise > 0),
  CONSTRAINT chk_razorpay_payments_currency
    CHECK (currency = UPPER(currency))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: equifax_credit_report
-- ---------------------------------------------------------------------
-- Stores complete customer details, bureau response, parsed score fields,
-- and the generated/fetched PDF. LONGBLOB supports large bureau PDFs.
-- If you later move PDFs to S3/R2, keep pdf_storage_type='URL' and store URL.

CREATE TABLE IF NOT EXISTS equifax_credit_report (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  report_id VARCHAR(80) NOT NULL,
  search_by_mobile_id BIGINT UNSIGNED NULL,
  payment_id BIGINT UNSIGNED NULL,

  full_name VARCHAR(160) NOT NULL,
  mobile CHAR(10) NOT NULL,
  pan_number CHAR(10) NULL,
  aadhaar_last4 CHAR(4) NULL,
  date_of_birth DATE NULL,
  gender ENUM('M', 'F', 'O', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  email VARCHAR(190) NULL,

  report_status ENUM('pending', 'processing', 'completed', 'failed', 'no_record') NOT NULL DEFAULT 'pending',
  failure_reason VARCHAR(500) NULL,

  consent_given TINYINT(1) NOT NULL DEFAULT 1,
  consent_text VARCHAR(700) NULL,
  consent_ip VARBINARY(16) NULL,
  consent_user_agent VARCHAR(500) NULL,
  consent_at DATETIME(3) NULL,

  api_provider VARCHAR(60) NOT NULL DEFAULT 'equifax',
  api_request_payload JSON NULL,
  raw_api_response JSON NULL,

  score_factors JSON NULL,
  accounts_summary JSON NULL,
  enquiries_summary JSON NULL,

  pdf_storage_type ENUM('DB_BLOB', 'URL', 'NONE') NOT NULL DEFAULT 'DB_BLOB',
  pdf_file_name VARCHAR(255) NULL,
  pdf_mime_type VARCHAR(80) NULL DEFAULT 'application/pdf',
  pdf_size_bytes BIGINT UNSIGNED NULL,
  pdf_sha256 CHAR(64) NULL,
  pdf_blob LONGBLOB NULL,
  pdf_url VARCHAR(1000) NULL,

  generated_at DATETIME(3) NULL,
  downloaded_at DATETIME(3) NULL,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,

  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uq_equifax_credit_report_report_id (report_id),
  KEY idx_equifax_credit_report_mobile (mobile),
  KEY idx_equifax_credit_report_pan (pan_number),
  KEY idx_equifax_credit_report_status (report_status),
  KEY idx_equifax_credit_report_generated_at (generated_at),
  KEY idx_equifax_credit_report_search_id (search_by_mobile_id),
  KEY idx_equifax_credit_report_payment_id (payment_id),

  CONSTRAINT fk_equifax_credit_report_search_by_mobile
    FOREIGN KEY (search_by_mobile_id)
    REFERENCES search_by_mobile (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_equifax_credit_report_payment
    FOREIGN KEY (payment_id)
    REFERENCES razorpay_payments (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: payment_refunds
-- ---------------------------------------------------------------------
-- Keep refunds separate because a payment can have multiple partial refunds.

CREATE TABLE IF NOT EXISTS payment_refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,

  razorpay_refund_id VARCHAR(80) NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  refund_status ENUM('created', 'processed', 'failed') NOT NULL DEFAULT 'created',
  reason VARCHAR(255) NULL,
  raw_gateway_response JSON NULL,

  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_refunds_refund_id (razorpay_refund_id),
  KEY idx_payment_refunds_payment_id (payment_id),
  KEY idx_payment_refunds_status (refund_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: gst_invoices
-- ---------------------------------------------------------------------
-- Invoice/receipt generated after successful payment.

CREATE TABLE IF NOT EXISTS gst_invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_no VARCHAR(80) NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  report_id BIGINT UNSIGNED NULL,

  customer_name VARCHAR(160) NOT NULL,
  mobile CHAR(10) NOT NULL,
  customer_pan CHAR(10) NULL,

  taxable_amount_paise INT UNSIGNED NOT NULL,
  cgst_paise INT UNSIGNED NOT NULL DEFAULT 0,
  sgst_paise INT UNSIGNED NOT NULL DEFAULT 0,
  igst_paise INT UNSIGNED NOT NULL DEFAULT 0,
  total_amount_paise INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',

  invoice_pdf_storage_type ENUM('DB_BLOB', 'URL', 'NONE') NOT NULL DEFAULT 'NONE',
  invoice_pdf_blob LONGBLOB NULL,
  invoice_pdf_url VARCHAR(1000) NULL,

  issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uq_gst_invoices_invoice_no (invoice_no),
  UNIQUE KEY uq_gst_invoices_payment_id (payment_id),
  KEY idx_gst_invoices_report_id (report_id),
  KEY idx_gst_invoices_mobile (mobile),
  KEY idx_gst_invoices_issued_at (issued_at),

  CONSTRAINT fk_gst_invoices_payment
    FOREIGN KEY (payment_id)
    REFERENCES razorpay_payments (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_gst_invoices_report
    FOREIGN KEY (report_id)
    REFERENCES equifax_credit_report (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT chk_gst_invoices_mobile
    CHECK (mobile REGEXP '^[6-9][0-9]{9}$'),
  CONSTRAINT chk_gst_invoices_pan
    CHECK (customer_pan IS NULL OR customer_pan REGEXP '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  CONSTRAINT chk_gst_invoices_total
    CHECK (total_amount_paise = taxable_amount_paise + cgst_paise + sgst_paise + igst_paise)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Optional operational audit log
-- ---------------------------------------------------------------------
-- Useful for debugging whether a request used DB cache or external API.

CREATE TABLE IF NOT EXISTS credit_report_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mobile CHAR(10) NULL,
  search_by_mobile_id BIGINT UNSIGNED NULL,
  payment_id BIGINT UNSIGNED NULL,
  report_row_id BIGINT UNSIGNED NULL,

  event_type ENUM(
    'MOBILE_PREFILL_CACHE_HIT',
    'MOBILE_PREFILL_API_HIT',
    'MOBILE_PREFILL_API_ERROR',
    'PAYMENT_OPENED',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'PAYMENT_CANCELLED',
    'REPORT_API_HIT',
    'REPORT_COMPLETED',
    'REPORT_FAILED',
    'PDF_DOWNLOADED'
  ) NOT NULL,
  event_message VARCHAR(500) NULL,
  event_payload JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  KEY idx_audit_log_mobile (mobile),
  KEY idx_audit_log_event_type (event_type),
  KEY idx_audit_log_created_at (created_at),

  CONSTRAINT fk_audit_log_search_by_mobile
    FOREIGN KEY (search_by_mobile_id)
    REFERENCES search_by_mobile (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_audit_log_payment
    FOREIGN KEY (payment_id)
    REFERENCES razorpay_payments (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_audit_log_report
    FOREIGN KEY (report_row_id)
    REFERENCES equifax_credit_report (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Read helpers
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_latest_mobile_prefill AS
SELECT
  id,
  mobile,
  country_code,
  full_name,
  pan_number,
  date_of_birth,
  gender,
  lookup_status,
  last_searched_at,
  api_fetched_at,
  api_hit_count,
  db_cache_hit_count
FROM search_by_mobile
WHERE is_active = 1;

CREATE OR REPLACE VIEW vw_credit_report_admin_list AS
SELECT
  r.id,
  r.report_id,
  r.full_name,
  r.mobile,
  r.pan_number,
  r.bureau,
  r.score,
  r.rating,
  r.report_status,
  r.generated_at,
  r.download_count,
  p.local_payment_ref,
  p.razorpay_payment_id,
  p.amount_paise,
  p.payment_status,
  p.paid_at
FROM equifax_credit_report r
LEFT JOIN razorpay_payments p ON p.id = r.payment_id;

-- ---------------------------------------------------------------------
-- Recommended access pattern
-- ---------------------------------------------------------------------
-- 1. Mobile prefill:
--    SELECT * FROM search_by_mobile WHERE mobile = ? AND is_active = 1;
--    If row exists, increment db_cache_hit_count and do not call external API.
--    If row does not exist, call API and INSERT result into search_by_mobile.
--
-- 2. Payment:
--    INSERT into razorpay_payments with local_payment_ref before checkout/order.
--    Update row with Razorpay IDs and captured/failed/cancelled status.
--
-- 3. Report:
--    Only after successful payment, call bureau API.
--    INSERT complete response and PDF into equifax_credit_report.
