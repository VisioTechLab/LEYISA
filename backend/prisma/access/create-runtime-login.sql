-- psql : injecter les variables du coffre dans l'environnement du processus.
\getenv login_role LEYISA_LOGIN_ROLE
\getenv login_password LEYISA_LOGIN_PASSWORD

BEGIN;
CREATE ROLE :"login_role" LOGIN INHERIT NOCREATEDB NOCREATEROLE PASSWORD :'login_password';
GRANT leyisa_runtime TO :"login_role";
COMMIT;

\unset login_password
