import { getCuadroHonorReporte } from './SRC/modules/analitica/services/cuadro-honor.service';

async function main() {
  const data = await getCuadroHonorReporte(2026, 6);
  console.log("=== CUADRO HONOR OUTPUT ===");
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
