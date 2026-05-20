import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "SRC/prisma/schema.prisma",
  migrations: {
    path: "SRC/prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] as string, // <-- La magia de TypeScript está aquí
  },
});