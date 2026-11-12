export function databaseMode() {
  const mode = process.env.LEYISA_DB_MODE ?? "local";
  if (mode !== "local" && mode !== "shared") {
    throw new Error("LEYISA_DB_MODE doit valoir local ou shared.");
  }
  return mode;
}

export function migrationUrl() {
  // Ne jamais substituer le compte d'exécution au compte de migration partagé.
  return (databaseMode() === "shared" ? process.env.DIRECT_DATABASE_URL : process.env.DATABASE_URL) || undefined;
}

export function requireLocalFixtures() {
  const connectionString = process.env.DATABASE_URL;
  let hostname;
  try {
    hostname = connectionString ? new URL(connectionString).hostname : null;
  } catch {
    throw new Error("DATABASE_URL n’est pas une URL PostgreSQL valide.");
  }
  if (databaseMode() !== "local" || process.env.NODE_ENV === "production" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    throw new Error("Les données fictives et les contrôles avec écritures exigent un PostgreSQL local sur loopback.");
  }
}
