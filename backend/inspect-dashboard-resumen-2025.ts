import { getDashboardResumen } from './SRC/modules/analitica/services/dashboard.service';

async function main() {
  const data = await getDashboardResumen(2025);
  console.log("=== DASHBOARD RESUMEN 2025 OUTPUT ===");
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
