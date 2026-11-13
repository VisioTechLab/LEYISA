# Module auth — Accès (Sidonie)

Connexion, déconnexion et utilisateur courant (US-001, US-002, wireframe W01), branchés sur le schéma Prisma du socle (`User`, `UserRole`, `Session`, `AuditEntry`). Aucune modification du schéma ni migration.

## Routes

| Méthode | Route | Protection | Réponse |
|---|---|---|---|
| POST | `/auth/login` | aucune | 200 `{ user }` + cookie `leyisa_session` ; 400 champs manquants ; 401 « Identifiant ou mot de passe incorrect. » ; 429 trop de tentatives |
| POST | `/auth/logout` | session | 204, session révoquée, cookie effacé |
| GET | `/auth/me` | session | 200 `{ user }` ; 401 sans session valide |

`user` = `{ id, login, firstName, lastName, roles }`. Jamais d'empreinte ni de jeton dans les réponses.

## Pour les autres modules

```ts
import { CurrentAuth, SessionGuard, hasAnyRole, AuditWriter, type AuthContext } from "../auth/index.js";

@UseGuards(SessionGuard)
@Get()
lister(@CurrentAuth() auth: AuthContext) {
  if (!hasAnyRole(auth, ["SEC", "ADM"])) throw new ForbiddenException();
}
```

Audit (R25) : `await auditWriter.write(tx, { actorId: auth.userId, action, targetType, targetId })` dans la même transaction que l'action. Importer `AuthModule` dans le module qui utilise la garde.

## Créer un compte de démonstration

Les comptes du seed n'ont ni identifiant ni mot de passe. Depuis `backend/` :

```
node --env-file-if-exists=../.env scripts/auth-set-login.mjs --list
node --env-file-if-exists=../.env scripts/auth-set-login.mjs --user-id <uuid> --login direction.demo --shared-ok
```

`--list` ne fait que lire. La deuxième commande écrit dans la base : sur la branche Neon partagée, seulement après l'accord de Kevin et Melvin. Le mot de passe est saisi sans écho.

## Sécurité

- Empreinte scrypt (module `crypto` de Node, aucune dépendance ajoutée) ; temps de réponse identique pour un identifiant inconnu.
- Message d'erreur unique ; compte avec `loginEnabled = false` refusé.
- Jeton de session de 32 octets, seule son empreinte SHA-256 est en base (`Session.tokenHash`).
- Cookie `HttpOnly`, `SameSite=Strict`, `Secure` en production ; nouvelle session à chaque connexion.
- Blocage temporaire après 5 échecs pendant 15 minutes, par adresse et identifiant (en mémoire).
- Audit : `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE` (compte connu uniquement, car `AuditEntry.targetId` est obligatoire), `AUTH_LOGOUT`, `AUTH_LOGIN_PROVISIONED`.

Variables facultatives : `AUTH_SESSION_TTL_MINUTES` (480), `AUTH_MAX_FAILED_ATTEMPTS` (5), `AUTH_LOCKOUT_MINUTES` (15).

## Décisions ouvertes

- Seuils de limitation et jeton CSRF complémentaire (avec Joel).
- Règle de casse de l'identifiant (comparé tel quel).
- Premier administrateur et écran Comptes et rôles (W02), puis Journal d'audit (W26) : prochaines tranches.
- Page d'arrivée selon le rôle (proposition dans `frontend/src/features/auth/authApi.ts`).

## Tests

`npm test` (depuis `backend/`) lance `test/auth.test.mjs` : mots de passe, limitation, cookie, et les trois routes avec une base fictive en mémoire. Le parcours réel se teste sur Neon : se connecter dans l'écran, recharger, appeler `/auth/me`.
