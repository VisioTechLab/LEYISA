-- Profil réservé à la conservation des calendriers déjà utilisés.
-- Les dates, le code, l'identifiant et les résultats existants restent inchangés.
ALTER TABLE "Period" DROP CONSTRAINT period_profile;
ALTER TABLE "Period" ADD CONSTRAINT period_profile CHECK (profile IN ('MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE','HISTORIQUE'));

CREATE FUNCTION leyisa_guard_historical_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    IF OLD.profile = 'HISTORIQUE' THEN
      RAISE EXCEPTION 'historical period is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.profile = 'HISTORIQUE' THEN
    IF TG_OP <> 'UPDATE' THEN
      RAISE EXCEPTION 'historical periods must originate from an existing period' USING ERRCODE = '23514';
    END IF;
    IF current_user <> pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public."Period"'::regclass))
      OR ROW(NEW.id,NEW."schoolYearId",NEW.code,NEW.label,NEW.kind,NEW.position,NEW."parentCode",NEW."startsOn",NEW."endsOn")
         IS DISTINCT FROM ROW(OLD.id,OLD."schoolYearId",OLD.code,OLD.label,OLD.kind,OLD.position,OLD."parentCode",OLD."startsOn",OLD."endsOn")
      OR NOT EXISTS (SELECT 1 FROM "ClassPeriod" WHERE "periodId"=OLD.id AND "closedAt" IS NOT NULL)
      OR EXISTS (SELECT 1 FROM "ClassPeriod" WHERE "periodId"=OLD.id AND "closedAt" IS NULL)
    THEN RAISE EXCEPTION 'historical period requires owner, frozen scope and closed contexts' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER period_guard_historical BEFORE INSERT OR UPDATE OR DELETE ON "Period" FOR EACH ROW EXECUTE FUNCTION leyisa_guard_historical_period();

CREATE FUNCTION leyisa_guard_historical_context() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN p_id := NEW."periodId"; ELSE p_id := OLD."periodId"; END IF;
  IF EXISTS (SELECT 1 FROM "Period" WHERE id=p_id AND profile='HISTORIQUE') THEN
    RAISE EXCEPTION 'historical class period is read-only' USING ERRCODE = '23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM "Period" WHERE id=NEW."periodId" AND profile='HISTORIQUE') THEN
    RAISE EXCEPTION 'historical class period is read-only' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER class_period_guard_historical BEFORE INSERT OR UPDATE OR DELETE ON "ClassPeriod" FOR EACH ROW EXECUTE FUNCTION leyisa_guard_historical_context();
