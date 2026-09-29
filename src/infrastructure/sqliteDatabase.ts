import Database from "@tauri-apps/plugin-sql";

const DATABASE_URL = "sqlite:jardindigital.db";

let databasePromise: Promise<Database> | undefined;

export function jardindigitalDatabase() {
  databasePromise ??= Database.load(DATABASE_URL);
  return databasePromise;
}
