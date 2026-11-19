-- Préparation locale : revue MOC M04/M07/M09 requise avant application partagée.
BEGIN;
ALTER TABLE "Period" ADD COLUMN profile text NOT NULL DEFAULT 'SECONDAIRE_TECHNIQUE',
 ADD COLUMN kind text NOT NULL DEFAULT 'PERIODE', ADD COLUMN "parentCode" text,
 ADD COLUMN source text NOT NULL DEFAULT 'DEMO_PROPOSE';
DROP INDEX "Period_schoolYearId_code_key";
DROP INDEX "Period_schoolYearId_position_key";
CREATE UNIQUE INDEX "Period_schoolYearId_profile_code_key" ON "Period"("schoolYearId",profile,code);
CREATE UNIQUE INDEX "Period_schoolYearId_profile_position_key" ON "Period"("schoolYearId",profile,position);
ALTER TABLE "Period" DROP CONSTRAINT period_no_overlap;
ALTER TABLE "Period" ADD CONSTRAINT period_profile CHECK (profile IN ('MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE')),
 ADD CONSTRAINT period_kind CHECK (kind IN ('PERIODE','EXAMEN','EVEIL','TRIMESTRE','SEMESTRE','ANNUEL','REPECHAGE','EVENEMENT')),
 ADD CONSTRAINT period_no_overlap EXCLUDE USING gist (
 "schoolYearId" WITH =, profile WITH =, daterange("startsOn","endsOn",'[]') WITH &&) WHERE (kind='PERIODE');
ALTER TABLE "SchoolClass" ADD COLUMN cycle text NOT NULL DEFAULT 'SECONDAIRE_TECHNIQUE',
 ADD COLUMN level text NOT NULL DEFAULT '', ADD COLUMN "optionCode" text,
 ADD COLUMN "programVersion" text NOT NULL DEFAULT 'DEMO-V1.1',
 ADD COLUMN "programStatus" text NOT NULL DEFAULT 'DEMO_PROPOSE',
 ADD CONSTRAINT class_cycle CHECK (cycle IN ('MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE'));
ALTER TABLE "ClassSubject" ADD COLUMN position integer NOT NULL DEFAULT 1,
 ADD COLUMN "groupCode" text, ADD COLUMN "componentMaxima" jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN source text NOT NULL DEFAULT 'A_CONFIRMER';
ALTER TABLE "ClassSubject" ADD CONSTRAINT class_subject_maximum_finite CHECK ("resultMaxScore" <> 'NaN'::numeric);
ALTER TABLE "Student" ADD COLUMN "postName" text NOT NULL DEFAULT '', ADD COLUMN sex text,
 ADD COLUMN "birthPlace" text, ADD COLUMN "permanentNumber" text, ADD COLUMN guardian text, ADD COLUMN contact text,
 ADD CONSTRAINT student_sex CHECK (sex IS NULL OR sex IN ('F','M'));
ALTER TABLE "Evaluation" ADD COLUMN kind text NOT NULL DEFAULT 'TRAVAIL_JOURNALIER',
 ADD CONSTRAINT evaluation_kind CHECK (kind IN ('TRAVAIL_JOURNALIER','EXAMEN','REPECHAGE','APPRECIATION'));
ALTER TABLE "Grade" ADD COLUMN status text NOT NULL DEFAULT 'PRESENT', ADD COLUMN appreciation jsonb,
 ADD CONSTRAINT grade_status CHECK (status IN ('PRESENT','NON_SAISI','ABSENT_JUSTIFIE','ABSENT_NON_JUSTIFIE','DISPENSE'));
ALTER TABLE "AuditEntry" ALTER COLUMN "targetId" DROP NOT NULL;
ALTER TABLE "ReportCard" ALTER COLUMN notice SET DEFAULT 'DEMO-V1';
-- Anciennes lignes conservées ; toute nouvelle ligne doit employer la marque actuelle.
ALTER TABLE "ReportCard" DROP CONSTRAINT report_card_demo_notice;
ALTER TABLE "ReportCard" ADD CONSTRAINT report_card_demo_notice CHECK (notice IN ('DEMO-V1','DÉMONSTRATION - NON OFFICIEL'));
CREATE FUNCTION leyisa_new_report_notice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.notice <> 'DEMO-V1' THEN RAISE EXCEPTION 'new report requires DEMO-V1' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER new_report_notice BEFORE INSERT ON "ReportCard" FOR EACH ROW EXECUTE FUNCTION leyisa_new_report_notice();
CREATE OR REPLACE FUNCTION leyisa_report_requires_closure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "ResultSnapshot" r JOIN "ClassPeriod" c ON c.id=r."classPeriodId"
   WHERE r.id=NEW."resultSnapshotId" AND c."publishedAt" IS NOT NULL) THEN
   RAISE EXCEPTION 'report requires published result' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TABLE "SchoolSettings" (id text PRIMARY KEY DEFAULT 'school', identity jsonb NOT NULL DEFAULT '{}', options jsonb NOT NULL DEFAULT '[]', profiles jsonb NOT NULL DEFAULT '{}');
CREATE TABLE "LoginLimit" (key text PRIMARY KEY, failures integer NOT NULL DEFAULT 0, "windowStart" timestamptz(3) NOT NULL DEFAULT now());
CREATE FUNCTION leyisa_program_in_use() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "TeacherAssignment" a JOIN "Evaluation" e ON e."assignmentId"=a.id WHERE a."classSubjectId"=OLD.id)
  AND ROW(NEW."resultMaxScore",NEW."componentMaxima",NEW.source,NEW.position,NEW."groupCode") IS DISTINCT FROM
      ROW(OLD."resultMaxScore",OLD."componentMaxima",OLD.source,OLD.position,OLD."groupCode") THEN
  RAISE EXCEPTION 'program already in use: create a prospective version' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER program_in_use BEFORE UPDATE ON "ClassSubject" FOR EACH ROW EXECUTE FUNCTION leyisa_program_in_use();
COMMIT;
