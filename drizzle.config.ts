import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit은 CLI라 Next가 하는 .env.local 로딩을 직접 해줘야 한다.
// next가 이미 의존하는 @next/env를 쓰므로 dotenv를 따로 넣지 않는다.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
