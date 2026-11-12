-- À exécuter avec le propriétaire APRÈS migrate deploy, sur la base dédiée.
-- Aucun compte LOGIN ni secret n'est créé ici.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'leyisa_runtime') THEN
    CREATE ROLE leyisa_runtime NOLOGIN;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO leyisa_runtime', current_database());
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM PUBLIC, leyisa_runtime', current_database());
END;
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC, leyisa_runtime;
GRANT USAGE ON SCHEMA public TO leyisa_runtime;

-- Liste explicite pour ne pas exposer _prisma_migrations ni de futures tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."User", public."UserRole", public."Session",
  public."SchoolYear", public."Period", public."SchoolClass", public."Subject", public."ClassSubject",
  public."Student", public."Enrollment", public."Teacher", public."TeacherAssignment",
  public."Evaluation", public."Grade", public."Submission",
  public."ClassPeriod", public."ResultSnapshot", public."ReportCard"
  TO leyisa_runtime;
GRANT SELECT, INSERT ON TABLE public."AuditEntry" TO leyisa_runtime;
REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM PUBLIC, leyisa_runtime;

COMMIT;
