import { createClient } from "../prisma/client.mjs";

const db = createClient();
try {
  await db.schoolYear.count();
  console.log("Connexion établie et lecture de SchoolYear autorisée.");
} finally {
  await db.$disconnect();
}
