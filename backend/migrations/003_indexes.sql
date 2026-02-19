-- speed up verification lookup by email
CREATE INDEX IF NOT EXISTS idx_email_verifications_email
ON email_verifications(email);

-- speed up cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires
ON email_verifications(expires_at);
