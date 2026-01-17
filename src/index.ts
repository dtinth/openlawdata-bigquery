import { runSync } from "./sync";

async function main() {
  try {
    await runSync();
    process.exit(0);
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
}

main();
