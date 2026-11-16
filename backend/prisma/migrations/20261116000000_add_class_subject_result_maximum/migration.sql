ALTER TABLE "ClassSubject"
  ADD COLUMN "resultMaxScore" NUMERIC(10, 4) NOT NULL DEFAULT 20;

ALTER TABLE "ClassSubject"
  ADD CONSTRAINT "class_subject_result_max_score_positive"
  CHECK ("resultMaxScore" > 0);
