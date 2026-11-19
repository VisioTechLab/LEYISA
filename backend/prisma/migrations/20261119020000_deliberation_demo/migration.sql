-- Profils explicitement DEMO ; aucune règle réglementaire implicite.
BEGIN;
CREATE TABLE "CalculationProfile" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text NOT NULL,version integer NOT NULL CHECK(version>0),
 "schoolYearId" uuid NOT NULL REFERENCES "SchoolYear"(id),cycle text NOT NULL,level text NOT NULL,"optionCode" text,
 status text NOT NULL DEFAULT 'DEMO_PROPOSE' CHECK(status='DEMO_PROPOSE'),source text NOT NULL,
 config jsonb NOT NULL CHECK(jsonb_typeof(config)='object'),"createdById" uuid NOT NULL REFERENCES "User"(id),
 "createdAt" timestamptz(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "CalculationProfile_code_version_schoolYearId_cycle_level_key" ON "CalculationProfile"(code,version,"schoolYearId",cycle,level);
CREATE TABLE "DeliberationDecision" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"resultSnapshotId" uuid NOT NULL REFERENCES "ResultSnapshot"(id),
 "profileId" uuid NOT NULL REFERENCES "CalculationProfile"(id),version integer NOT NULL CHECK(version>0),
 outcome text NOT NULL CHECK(outcome IN ('ADMIS','REPECHAGE','REDOUBLEMENT','A_VERIFIER')),
 reason text NOT NULL CHECK(length(btrim(reason))>=5),courses jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(courses)='array'),
 proposed jsonb NOT NULL,"decidedById" uuid NOT NULL REFERENCES "User"(id),"createdAt" timestamptz(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "DeliberationDecision_resultSnapshotId_version_key" ON "DeliberationDecision"("resultSnapshotId",version);
ALTER TABLE "Evaluation" ADD COLUMN "decisionId" uuid REFERENCES "DeliberationDecision"(id);
ALTER TABLE "Evaluation" ADD CONSTRAINT retake_requires_decision CHECK ((kind='REPECHAGE')=("decisionId" IS NOT NULL));
CREATE FUNCTION leyisa_decision_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'profiles and decisions are immutable: append a version' USING ERRCODE='23514'; END $$;
CREATE TRIGGER decision_append_only BEFORE UPDATE OR DELETE ON "DeliberationDecision" FOR EACH ROW EXECUTE FUNCTION leyisa_decision_append_only();
CREATE TRIGGER profile_append_only BEFORE UPDATE OR DELETE ON "CalculationProfile" FOR EACH ROW EXECUTE FUNCTION leyisa_decision_append_only();
CREATE FUNCTION leyisa_decision_before_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "ResultSnapshot" r JOIN "ClassPeriod" cp ON cp.id=r."classPeriodId" WHERE r.id=NEW."resultSnapshotId" AND cp."closedAt" IS NOT NULL AND cp."publishedAt" IS NULL FOR SHARE OF cp) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'decision requires closed and unpublished results' USING ERRCODE='23514';
END $$;
CREATE TRIGGER decision_before_publication BEFORE INSERT ON "DeliberationDecision" FOR EACH ROW EXECUTE FUNCTION leyisa_decision_before_publication();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='leyisa_runtime') THEN
 GRANT SELECT,INSERT ON "CalculationProfile","DeliberationDecision" TO leyisa_runtime;
END IF; END $$;
COMMIT;
