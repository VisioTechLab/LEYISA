import { createClient } from "../prisma/client.mjs";

const readableWritableTables = new Set([
  "User", "UserRole", "Session", "SchoolYear", "Period", "SchoolClass", "Subject",
  "ClassSubject", "Student", "Enrollment", "Teacher", "TeacherAssignment", "Evaluation",
  "Grade", "Submission", "ClassPeriod", "ResultSnapshot", "ReportCard",
]);
const appendOnlyTables = new Set(["AuditEntry", "CalculationProfile", "DeliberationDecision"]);
const mutableTables = new Set(["SchoolSettings", "LoginLimit"]);

let db;
try {
  db = createClient({ connectionTimeoutMillis: 5_000, query_timeout: 5_000 });
  const problems = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [role] = await tx.$queryRaw`
      SELECT
        COALESCE(pg_has_role(current_user, to_regrole('leyisa_runtime'), 'USAGE'), false) AS runtime,
        COALESCE(pg_has_role(current_user, to_regrole('neon_superuser'), 'MEMBER'), false)
          OR rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls AS elevated,
        has_database_privilege(current_user, current_database(), 'CREATE') AS create_schema,
        has_schema_privilege(current_user, 'public', 'CREATE') AS create_table
      FROM pg_roles WHERE rolname = current_user
    `;
    const tables = await tx.$queryRaw`
      SELECT
        c.relname AS name,
        pg_has_role(current_user, c.relowner, 'MEMBER') AS owner,
        has_table_privilege(current_user, c.oid, 'SELECT') AS can_read,
        has_table_privilege(current_user, c.oid, 'INSERT') AS can_insert,
        has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update,
        has_table_privilege(current_user, c.oid, 'DELETE') AS can_delete,
        has_table_privilege(current_user, c.oid, 'TRUNCATE,REFERENCES,TRIGGER') AS extra_privileges,
        has_any_column_privilege(current_user, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES') AS column_privileges
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    `;

    const failures = [];
    if (!role.runtime) failures.push("le groupe leyisa_runtime n’est pas utilisable");
    if (role.elevated || role.create_schema || role.create_table) {
      failures.push("le rôle peut effectuer des opérations d’administration");
    }
    const expectedTables = [
      ...readableWritableTables, ...appendOnlyTables, ...mutableTables, "_prisma_migrations",
    ];
    for (const name of expectedTables) {
      if (!tables.some((table) => table.name === name)) failures.push(`table absente : ${name}`);
    }
    for (const table of tables) {
      const { name, owner, can_read, can_insert, can_update, can_delete, extra_privileges, column_privileges } = table;
      const allowDelete = readableWritableTables.has(name);
      const allowUpdate = allowDelete || mutableTables.has(name);
      const allowInsert = allowUpdate || appendOnlyTables.has(name);

      if (owner || extra_privileges || can_read !== allowInsert || can_insert !== allowInsert ||
          can_update !== allowUpdate || can_delete !== allowDelete || (!allowInsert && column_privileges)) {
        failures.push(name === "_prisma_migrations"
          ? "le registre des migrations est accessible"
          : `droits inattendus sur ${name}`);
      }
    }
    return failures;
  }, { timeout: 15_000 });

  if (problems.length) {
    console.error("Droits PostgreSQL non conformes.");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
  } else {
    console.log("Accès applicatif vérifié. Le compte ne peut pas administrer le schéma ni lire les migrations.");
  }
} catch {
  console.error("Le contrôle d’accès a échoué. Vérifiez DATABASE_URL et la connexion à PostgreSQL.");
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
}
