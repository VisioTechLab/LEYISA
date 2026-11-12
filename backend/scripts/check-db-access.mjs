import { createClient } from "../prisma/client.mjs";

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
    for (const required of ["SchoolYear", "AuditEntry", "_prisma_migrations"]) {
      if (!tables.some(({ name }) => name === required)) failures.push(`table absente : ${required}`);
    }
    for (const table of tables) {
      const { name, owner, can_read, can_insert, can_update, can_delete, extra_privileges, column_privileges } = table;
      const common = !owner && !extra_privileges;
      if (name === "_prisma_migrations") {
        if (!common || can_delete || column_privileges) failures.push("le registre des migrations est accessible");
      } else {
        const canChange = name === "AuditEntry" ? !can_update && !can_delete : can_update && can_delete;
        if (!common || !can_read || !can_insert || !canChange) failures.push(`droits inattendus sur ${name}`);
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
