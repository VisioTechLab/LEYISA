BEGIN;

ALTER TYPE "Role" ADD VALUE 'ELEVE';

-- Le libellé texte permet de poser le CHECK avant le commit de la nouvelle
-- valeur enum. La clé (userId, userKind) contrôle toujours le type du User.
ALTER TABLE "UserRole"
  DROP CONSTRAINT user_role_staff_only,
  ADD CONSTRAINT user_role_matches_kind CHECK (
    ("userKind" = 'STUDENT') = (role::text = 'ELEVE')
  );

COMMIT;
