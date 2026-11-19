BEGIN;
ALTER TABLE "AuditEntry" ADD COLUMN details jsonb;
ALTER TABLE "AuditEntry" ADD CONSTRAINT audit_details_object CHECK (details IS NULL OR jsonb_typeof(details)='object');
COMMIT;
