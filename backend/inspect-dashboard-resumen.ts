import { getDashboardResumen } from './SRC/modules/analitica/services/dashboard.service';

async function main() {
  const data = await getDashboardResumen(2026);
  console.log("=== DASHBOARD RESUMEN OUTPUT ===");
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
