BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('STAFF', 'STUDENT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADM', 'SEC', 'ENS', 'DIR');

-- CreateEnum
CREATE TYPE "EvaluationState" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "UserKind" NOT NULL DEFAULT 'STAFF',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "login" TEXT,
    "passwordHash" TEXT,
    "loginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "userKind" "UserKind" NOT NULL DEFAULT 'STAFF',
    "role" "Role" NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "userKind" "UserKind" NOT NULL DEFAULT 'STAFF',
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolYearId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolYearId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "userKind" "UserKind" NOT NULL DEFAULT 'STUDENT',
    "matricule" TEXT NOT NULL,
    "birthDate" DATE,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "schoolYearId" UUID NOT NULL,
    "enrolledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "userKind" "UserKind" NOT NULL DEFAULT 'STAFF',
    "staffNumber" TEXT,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacherId" UUID NOT NULL,
    "classSubjectId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "classPeriodId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE NOT NULL,
    "maxScore" DECIMAL(10,4) NOT NULL,
    "state" "EvaluationState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "score" DECIMAL(10,4),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationId" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "evaluationVersion" INTEGER NOT NULL,
    "gradeSnapshot" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" UUID NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMPTZ(3),
    "reason" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassPeriod" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "schoolYearId" UUID NOT NULL,
    "closedAt" TIMESTAMPTZ(3),
    "closedById" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "publishedById" UUID,

    CONSTRAINT "ClassPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classPeriodId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "identitySnapshot" JSONB NOT NULL,
    "subjectResults" JSONB NOT NULL,
    "sourceVersions" JSONB NOT NULL,
    "overallMean" DECIMAL(12,8) NOT NULL,
    "calculationProfile" TEXT NOT NULL,

    CONSTRAINT "ResultSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resultSnapshotId" UUID NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notice" TEXT NOT NULL DEFAULT 'DÉMONSTRATION - NON OFFICIEL',

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE INDEX "User_lastName_firstName_idx" ON "User"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_kind_key" ON "User"("id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_code_key" ON "SchoolYear"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Period_schoolYearId_code_key" ON "Period"("schoolYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Period_schoolYearId_position_key" ON "Period"("schoolYearId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Period_id_schoolYearId_key" ON "Period"("id", "schoolYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolYearId_code_key" ON "SchoolClass"("schoolYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_id_schoolYearId_key" ON "SchoolClass"("id", "schoolYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "ClassSubject_subjectId_idx" ON "ClassSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_id_classId_key" ON "ClassSubject"("id", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_matricule_key" ON "Student"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_userKind_key" ON "Student"("userId", "userKind");

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_schoolYearId_key" ON "Enrollment"("studentId", "schoolYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_id_classId_key" ON "Enrollment"("id", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_staffNumber_key" ON "Teacher"("staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_userKind_key" ON "Teacher"("userId", "userKind");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherId_startsOn_idx" ON "TeacherAssignment"("teacherId", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_id_classId_key" ON "TeacherAssignment"("id", "classId");

-- CreateIndex
CREATE INDEX "Evaluation_assignmentId_classPeriodId_idx" ON "Evaluation"("assignmentId", "classPeriodId");

-- CreateIndex
CREATE INDEX "Evaluation_classPeriodId_state_idx" ON "Evaluation"("classPeriodId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_id_classId_key" ON "Evaluation"("id", "classId");

-- CreateIndex
CREATE INDEX "Grade_enrollmentId_idx" ON "Grade"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_evaluationId_enrollmentId_key" ON "Grade"("evaluationId", "enrollmentId");

-- CreateIndex
CREATE INDEX "Submission_status_submittedAt_idx" ON "Submission"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_evaluationId_attempt_key" ON "Submission"("evaluationId", "attempt");

-- CreateIndex
CREATE INDEX "ClassPeriod_periodId_closedAt_idx" ON "ClassPeriod"("periodId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassPeriod_classId_periodId_key" ON "ClassPeriod"("classId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassPeriod_id_classId_key" ON "ClassPeriod"("id", "classId");

-- CreateIndex
CREATE INDEX "ResultSnapshot_enrollmentId_idx" ON "ResultSnapshot"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultSnapshot_classPeriodId_enrollmentId_key" ON "ResultSnapshot"("classPeriodId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_resultSnapshotId_templateVersion_key" ON "ReportCard"("resultSnapshotId", "templateVersion");

-- CreateIndex
CREATE INDEX "AuditEntry_targetType_targetId_occurredAt_idx" ON "AuditEntry"("targetType", "targetId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEntry_actorId_occurredAt_idx" ON "AuditEntry"("actorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_userKind_fkey" FOREIGN KEY ("userId", "userKind") REFERENCES "User"("id", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_userKind_fkey" FOREIGN KEY ("userId", "userKind") REFERENCES "User"("id", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_userKind_fkey" FOREIGN KEY ("userId", "userKind") REFERENCES "User"("id", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_schoolYearId_fkey" FOREIGN KEY ("classId", "schoolYearId") REFERENCES "SchoolClass"("id", "schoolYearId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_userKind_fkey" FOREIGN KEY ("userId", "userKind") REFERENCES "User"("id", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classSubjectId_classId_fkey" FOREIGN KEY ("classSubjectId", "classId") REFERENCES "ClassSubject"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_assignmentId_classId_fkey" FOREIGN KEY ("assignmentId", "classId") REFERENCES "TeacherAssignment"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_classPeriodId_classId_fkey" FOREIGN KEY ("classPeriodId", "classId") REFERENCES "ClassPeriod"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_evaluationId_classId_fkey" FOREIGN KEY ("evaluationId", "classId") REFERENCES "Evaluation"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_enrollmentId_classId_fkey" FOREIGN KEY ("enrollmentId", "classId") REFERENCES "Enrollment"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassPeriod" ADD CONSTRAINT "ClassPeriod_classId_schoolYearId_fkey" FOREIGN KEY ("classId", "schoolYearId") REFERENCES "SchoolClass"("id", "schoolYearId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassPeriod" ADD CONSTRAINT "ClassPeriod_periodId_schoolYearId_fkey" FOREIGN KEY ("periodId", "schoolYearId") REFERENCES "Period"("id", "schoolYearId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassPeriod" ADD CONSTRAINT "ClassPeriod_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClassPeriod" ADD CONSTRAINT "ClassPeriod_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ResultSnapshot" ADD CONSTRAINT "ResultSnapshot_classPeriodId_classId_fkey" FOREIGN KEY ("classPeriodId", "classId") REFERENCES "ClassPeriod"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ResultSnapshot" ADD CONSTRAINT "ResultSnapshot_enrollmentId_classId_fkey" FOREIGN KEY ("enrollmentId", "classId") REFERENCES "Enrollment"("id", "classId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_resultSnapshotId_fkey" FOREIGN KEY ("resultSnapshotId") REFERENCES "ResultSnapshot"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Règles PostgreSQL qui ne sont pas exprimables dans le schéma Prisma.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "User"
  ADD CONSTRAINT user_student_no_credentials CHECK (
    kind <> 'STUDENT' OR (login IS NULL AND "passwordHash" IS NULL AND NOT "loginEnabled")
  ),
  ADD CONSTRAINT user_enabled_requires_credentials CHECK (
    NOT "loginEnabled" OR (NULLIF(btrim(login), '') IS NOT NULL AND NULLIF(btrim("passwordHash"), '') IS NOT NULL)
  );
ALTER TABLE "UserRole" ADD CONSTRAINT user_role_staff_only CHECK ("userKind" = 'STAFF');
ALTER TABLE "Student" ADD CONSTRAINT student_kind_only CHECK ("userKind" = 'STUDENT'),
  ADD CONSTRAINT student_matricule_not_blank CHECK (matricule = btrim(matricule) AND matricule <> '');
ALTER TABLE "Teacher" ADD CONSTRAINT teacher_staff_only CHECK ("userKind" = 'STAFF');
ALTER TABLE "Session" ADD CONSTRAINT session_staff_only CHECK ("userKind" = 'STAFF'),
  ADD CONSTRAINT session_hash_and_dates CHECK (
    "tokenHash" ~ '^[a-f0-9]{64}$' AND "expiresAt" > "createdAt"
    AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
  );

ALTER TABLE "SchoolYear" ADD CONSTRAINT school_year_dates CHECK ("startsOn" <= "endsOn");
ALTER TABLE "Period" ADD CONSTRAINT period_dates_and_position CHECK ("startsOn" <= "endsOn" AND position > 0),
  ADD CONSTRAINT period_no_overlap EXCLUDE USING gist (
    "schoolYearId" WITH =, daterange("startsOn", "endsOn", '[]') WITH &&
  );
ALTER TABLE "TeacherAssignment"
  ADD CONSTRAINT assignment_dates CHECK ("endsOn" IS NULL OR "startsOn" < "endsOn"),
  ADD CONSTRAINT assignment_no_overlap EXCLUDE USING gist (
    "classSubjectId" WITH =, daterange("startsOn", "endsOn", '[)') WITH &&
  );
ALTER TABLE "Evaluation" ADD CONSTRAINT evaluation_positive_scale CHECK (
  "maxScore" > 0 AND "maxScore" <> 'NaN'::numeric AND version > 0
);
ALTER TABLE "Grade" ADD CONSTRAINT grade_nonnegative CHECK (score >= 0 AND score <> 'NaN'::numeric);
ALTER TABLE "Submission"
  ADD CONSTRAINT submission_attempt_positive CHECK (attempt > 0 AND "evaluationVersion" > 0),
  ADD CONSTRAINT submission_snapshot_array CHECK (jsonb_typeof("gradeSnapshot") = 'array'),
  ADD CONSTRAINT submission_decision_consistent CHECK (
    (status = 'PENDING' AND "decidedById" IS NULL AND "decidedAt" IS NULL AND reason IS NULL)
    OR
    (status <> 'PENDING' AND "decidedById" IS NOT NULL AND "decidedById" <> "submittedById"
      AND "decidedAt" IS NOT NULL AND "decidedAt" >= "submittedAt"
      AND (status <> 'REJECTED' OR NULLIF(btrim(reason), '') IS NOT NULL))
  );
CREATE UNIQUE INDEX submission_one_pending ON "Submission" ("evaluationId") WHERE status = 'PENDING';
CREATE UNIQUE INDEX submission_one_approved ON "Submission" ("evaluationId") WHERE status = 'APPROVED';

ALTER TABLE "ClassPeriod" ADD CONSTRAINT class_period_lifecycle CHECK (
  ("closedAt" IS NULL) = ("closedById" IS NULL)
  AND ("publishedAt" IS NULL) = ("publishedById" IS NULL)
  AND ("publishedAt" IS NULL OR ("closedAt" IS NOT NULL AND "publishedAt" >= "closedAt"))
);
ALTER TABLE "ResultSnapshot" ADD CONSTRAINT result_snapshot_payload CHECK (
  jsonb_typeof("identitySnapshot") = 'object' AND jsonb_typeof("subjectResults") = 'array'
  AND jsonb_typeof("sourceVersions") = 'array' AND "overallMean" <> 'NaN'::numeric
  AND btrim("calculationProfile") <> ''
);
ALTER TABLE "ReportCard" ADD CONSTRAINT report_card_demo_notice CHECK (
  notice = 'DÉMONSTRATION - NON OFFICIEL'
);

CREATE FUNCTION leyisa_require_login_for_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "User" WHERE id = NEW."userId" AND kind = 'STAFF' AND "loginEnabled" FOR SHARE
  ) THEN
    RAISE EXCEPTION 'session requires an enabled staff login' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER session_requires_login BEFORE INSERT OR UPDATE OF "userId", "userKind", "tokenHash"
  ON "Session" FOR EACH ROW EXECUTE FUNCTION leyisa_require_login_for_session();

CREATE FUNCTION leyisa_check_period() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE year_row "SchoolYear"%ROWTYPE;
BEGIN
  SELECT * INTO year_row FROM "SchoolYear" WHERE id = NEW."schoolYearId" FOR SHARE;
  IF NEW."startsOn" < year_row."startsOn" OR NEW."endsOn" > year_row."endsOn" THEN
    RAISE EXCEPTION 'period must be inside the school year' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND
    ROW(NEW."schoolYearId", NEW."startsOn", NEW."endsOn") IS DISTINCT FROM
    ROW(OLD."schoolYearId", OLD."startsOn", OLD."endsOn")
    AND EXISTS (SELECT 1 FROM "ClassPeriod" WHERE "periodId" = OLD.id) THEN
    RAISE EXCEPTION 'period dates already in use' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER period_in_year BEFORE INSERT OR UPDATE OF "schoolYearId", "startsOn", "endsOn"
  ON "Period" FOR EACH ROW EXECUTE FUNCTION leyisa_check_period();

CREATE FUNCTION leyisa_check_year_dates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Period" WHERE "schoolYearId" = OLD.id
    AND ("startsOn" < NEW."startsOn" OR "endsOn" > NEW."endsOn")) THEN
    RAISE EXCEPTION 'year dates must include existing periods' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER school_year_contains_periods BEFORE UPDATE OF "startsOn", "endsOn"
  ON "SchoolYear" FOR EACH ROW EXECUTE FUNCTION leyisa_check_year_dates();

-- Un lien de programme est une identité stable, y compris pour les évaluations historiques.
CREATE FUNCTION leyisa_preserve_class_subject() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."classId", NEW."subjectId") IS DISTINCT FROM ROW(OLD."classId", OLD."subjectId") THEN
    RAISE EXCEPTION 'class subject cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER class_subject_preserve_identity BEFORE UPDATE OF "classId", "subjectId"
  ON "ClassSubject" FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_class_subject();

-- Une affectation utilisée garde son enseignant, son programme et son début.
-- La fin peut changer pour permettre une relève, sans sortir une évaluation de son intervalle.
CREATE FUNCTION leyisa_preserve_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Evaluation" e WHERE e."assignmentId" = OLD.id
    AND (ROW(NEW.id, NEW."teacherId", NEW."classSubjectId", NEW."classId", NEW."startsOn")
        IS DISTINCT FROM ROW(OLD.id, OLD."teacherId", OLD."classSubjectId", OLD."classId", OLD."startsOn")
      OR (NEW."endsOn" IS NOT NULL AND e."heldOn" >= NEW."endsOn"))
  ) THEN
    RAISE EXCEPTION 'cannot rewrite an assignment used by an evaluation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assignment_preserve_history BEFORE UPDATE ON "TeacherAssignment"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_assignment();

-- Verrouille l'état jusqu'à la fin de l'écriture. La clôture attend les écritures en cours.
CREATE FUNCTION leyisa_require_open(class_period_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE closed_at timestamptz;
BEGIN
  SELECT "closedAt" INTO closed_at FROM "ClassPeriod" WHERE id = class_period_id FOR SHARE;
  IF closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'class period is closed' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION leyisa_check_evaluation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  period_row "Period"%ROWTYPE;
  assignment_row "TeacherAssignment"%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM leyisa_require_open(OLD."classPeriodId");
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.id, NEW."assignmentId", NEW."classPeriodId", NEW."classId")
      IS DISTINCT FROM ROW(OLD.id, OLD."assignmentId", OLD."classPeriodId", OLD."classId") THEN
      RAISE EXCEPTION 'evaluation cannot change scope' USING ERRCODE = '23514';
    END IF;
    IF NEW."maxScore" IS DISTINCT FROM OLD."maxScore" AND
      (EXISTS (SELECT 1 FROM "Grade" WHERE "evaluationId" = OLD.id)
       OR EXISTS (SELECT 1 FROM "Submission" WHERE "evaluationId" = OLD.id)) THEN
      RAISE EXCEPTION 'evaluation scale is already in use' USING ERRCODE = '23514';
    END IF;
    IF (OLD.state = 'VALIDATED' AND NEW IS DISTINCT FROM OLD)
      OR (OLD.state = 'SUBMITTED' AND ROW(NEW.title, NEW."heldOn", NEW."maxScore")
        IS DISTINCT FROM ROW(OLD.title, OLD."heldOn", OLD."maxScore")) THEN
      RAISE EXCEPTION 'evaluation is locked' USING ERRCODE = '23514';
    END IF;
  ELSE
    PERFORM leyisa_require_open(NEW."classPeriodId");
  END IF;
  SELECT p.* INTO period_row FROM "Period" p JOIN "ClassPeriod" cp ON cp."periodId" = p.id
    WHERE cp.id = NEW."classPeriodId" FOR SHARE OF p;
  SELECT * INTO assignment_row FROM "TeacherAssignment" WHERE id = NEW."assignmentId" FOR SHARE;
  IF NEW."heldOn" < period_row."startsOn" OR NEW."heldOn" > period_row."endsOn"
    OR NEW."heldOn" < assignment_row."startsOn"
    OR (assignment_row."endsOn" IS NOT NULL AND NEW."heldOn" >= assignment_row."endsOn") THEN
    RAISE EXCEPTION 'evaluation date outside period or assignment' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER evaluation_consistency BEFORE INSERT OR UPDATE OR DELETE ON "Evaluation"
  FOR EACH ROW EXECUTE FUNCTION leyisa_check_evaluation();

CREATE FUNCTION leyisa_check_grade() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "Evaluation"%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW."evaluationId", NEW."enrollmentId", NEW."classId")
    IS DISTINCT FROM ROW(OLD.id, OLD."evaluationId", OLD."enrollmentId", OLD."classId") THEN
    RAISE EXCEPTION 'grade cannot change scope' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO e FROM "Evaluation" WHERE id =
    CASE WHEN TG_OP = 'DELETE' THEN OLD."evaluationId" ELSE NEW."evaluationId" END FOR SHARE;
  PERFORM leyisa_require_open(e."classPeriodId");
  IF e.state IN ('SUBMITTED', 'VALIDATED') THEN
    RAISE EXCEPTION 'grade is locked' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.score > e."maxScore" THEN
    RAISE EXCEPTION 'grade exceeds evaluation scale' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER grade_consistency BEFORE INSERT OR UPDATE OR DELETE ON "Grade"
  FOR EACH ROW EXECUTE FUNCTION leyisa_check_grade();

CREATE FUNCTION leyisa_preserve_submission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE class_period_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'submission history cannot be deleted' USING ERRCODE = '23514';
  END IF;
  SELECT "classPeriodId" INTO class_period_id FROM "Evaluation" WHERE id = NEW."evaluationId" FOR SHARE;
  PERFORM leyisa_require_open(class_period_id);
  IF TG_OP = 'INSERT' AND NEW.status = 'PENDING' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'PENDING' AND NEW.status <> 'PENDING'
    AND ROW(NEW.id, NEW."evaluationId", NEW.attempt, NEW."evaluationVersion",
      NEW."gradeSnapshot", NEW."submittedById", NEW."submittedAt")
      IS NOT DISTINCT FROM ROW(OLD.id, OLD."evaluationId", OLD.attempt, OLD."evaluationVersion",
        OLD."gradeSnapshot", OLD."submittedById", OLD."submittedAt") THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'only one decision on an immutable submission is allowed' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER submission_preserve_history BEFORE INSERT OR UPDATE OR DELETE ON "Submission"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_submission();

-- Les snapshots se préparent en transaction avant la clôture. Une fois fermés, ils sont figés.
CREATE FUNCTION leyisa_preserve_result() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN PERFORM leyisa_require_open(OLD."classPeriodId"); END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  PERFORM leyisa_require_open(NEW."classPeriodId");
  RETURN NEW;
END;
$$;
CREATE TRIGGER result_preserve_history BEFORE INSERT OR UPDATE OR DELETE ON "ResultSnapshot"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_result();

CREATE FUNCTION leyisa_preserve_class_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."closedAt" IS NULL THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'class period must start open' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD."closedAt" IS NULL THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'closed class period cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF ROW(NEW.id, NEW."classId", NEW."periodId", NEW."schoolYearId")
    IS DISTINCT FROM ROW(OLD.id, OLD."classId", OLD."periodId", OLD."schoolYearId")
    OR (OLD."closedAt" IS NOT NULL AND ROW(NEW."closedAt", NEW."closedById")
      IS DISTINCT FROM ROW(OLD."closedAt", OLD."closedById"))
    OR (OLD."publishedAt" IS NOT NULL AND ROW(NEW."publishedAt", NEW."publishedById")
      IS DISTINCT FROM ROW(OLD."publishedAt", OLD."publishedById"))
    OR (OLD."closedAt" IS NULL AND NEW."publishedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'class period scope, closure and publication history are immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD."closedAt" IS NULL AND NEW."closedAt" IS NOT NULL AND (
    NOT EXISTS (SELECT 1 FROM "ResultSnapshot" WHERE "classPeriodId" = OLD.id)
    OR EXISTS (SELECT 1 FROM "Enrollment" en WHERE en."classId" = OLD."classId"
      AND NOT EXISTS (SELECT 1 FROM "ResultSnapshot" rs
        WHERE rs."classPeriodId" = OLD.id AND rs."enrollmentId" = en.id))
    OR EXISTS (SELECT 1 FROM "Evaluation" WHERE "classPeriodId" = OLD.id AND state <> 'VALIDATED')
  ) THEN
    RAISE EXCEPTION 'closing requires frozen results for every enrollment and validated evaluations'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER class_period_preserve_history BEFORE INSERT OR UPDATE OR DELETE ON "ClassPeriod"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_class_period();

CREATE FUNCTION leyisa_report_requires_closure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ResultSnapshot" rs JOIN "ClassPeriod" cp ON cp.id = rs."classPeriodId"
    WHERE rs.id = NEW."resultSnapshotId" AND cp."closedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'report card requires a closed result' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER report_requires_closure BEFORE INSERT OR UPDATE OF "resultSnapshotId" ON "ReportCard"
  FOR EACH ROW EXECUTE FUNCTION leyisa_report_requires_closure();

CREATE FUNCTION leyisa_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit history is append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON "AuditEntry"
  FOR EACH ROW EXECUTE FUNCTION leyisa_audit_append_only();


-- Une nouvelle inscription représente une nouvelle année ; elle ne réécrit pas l'ancienne.
CREATE FUNCTION leyisa_preserve_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW."studentId", NEW."classId", NEW."schoolYearId")
    IS DISTINCT FROM ROW(OLD.id, OLD."studentId", OLD."classId", OLD."schoolYearId") THEN
    RAISE EXCEPTION 'enrollment identity cannot change in V1' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enrollment_preserve_identity BEFORE UPDATE ON "Enrollment"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_enrollment();

-- Garder le lien entre un travail historique et l'identité de son enseignant.
CREATE FUNCTION leyisa_preserve_profile_user() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    RAISE EXCEPTION 'profile identity cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER teacher_preserve_identity BEFORE UPDATE OF "userId" ON "Teacher"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_profile_user();
CREATE TRIGGER student_preserve_identity BEFORE UPDATE OF "userId" ON "Student"
  FOR EACH ROW EXECUTE FUNCTION leyisa_preserve_profile_user();

COMMIT;
