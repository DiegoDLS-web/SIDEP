/**
 * Copia retratos desde la carpeta de assets de Cursor a frontend/src/assets/perfiles/
 * Uso: node scripts/sync-fotos-nomina.mjs [rutaCarpetaOrigen]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dstDir = path.join(repoRoot, 'frontend', 'src', 'assets', 'perfiles');
const defaultSrc =
  process.platform === 'win32'
    ? path.join(
        process.env.USERPROFILE || '',
        '.cursor',
        'projects',
        'c-Users-kiwip-OneDrive-Documentos-GitHub-SIDEP',
        'assets',
      )
    : path.join(repoRoot, '.cursor', 'assets');

/** Subcadena única del nombre del archivo → nombre fijo servido como /assets/perfiles/… */
const mappings = [
  ['Claudio_Marcelo_Venegas_Martinez', 'claudio-marcelo-venegas-martinez.png'],
  ['Omar_Dionisio_Ramos_Valenzuela', 'omar-dionisio-ramos-valenzuela.png'],
  ['Eduardo_Pezo_Espinoza', 'eduardo-pezo-espinoza.png'],
  ['Carlos_Andr_s_Urrutia_Fernandez', 'carlos-andres-urrutia-fernandez.png'],
  ['H_ctor_Mauricio_Gonzalez_Duran', 'hector-mauricio-gonzalez-duran.png'],
  ['Francisco_Eduardo_Bravo_Duran', 'francisco-eduardo-bravo-duran.png'],
  ['Nelson_Antonio_Gutierrez_Colipi', 'nelson-gutierrez-colipi.png'],
  ['Francisco_Enrique_Lopez_Flores_Bombero_Honorario', 'francisco-enrique-lopez-flores.png'],
  ['Lu_s_Alberto_Valenzuela_Jara', 'luis-alberto-valenzuela-jara.png'],
  ['Claudio_Aroca_O_ate', 'claudio-aroca-onate.png'],
  ['Belen_Heck_Pineda', 'belen-heck-pineda.png'],
  ['Renato_Medina_Araneda', 'renato-medina-araneda.png'],
  ['Carlos_Enrique_Neira_Valenzuela', 'carlos-neira-valenzuela.png'],
  ['Luciano_Rodriguez_Burdiles', 'luciano-rodriguez-burdiles.png'],
  ['Ignacio_Pinares_Escobar', 'ignacio-pinares-escobar.png'],
  ['Oscar_Rolan_Arevalo', 'oscar-rolan-arevalo.png'],
  ['Carlos_Gutierrez_Urbina_Bombero_Aspirante', 'carlos-gutierrez-urbina.png'],
  ['Javiera_Garay_Rios', 'javiera-garay-rios.png'],
  ['Nicol_Ponce_Ramirez_Bombero_Aspirante', 'nicolas-ponce-ramirez.png'],
  ['Martin_Salazar_Villalobos', 'martin-salazar-villalobos.png'],
  ['Mauricio_Alexander_Seguel_Montecinos', 'mauricio-seguel-montecinos.png'],
  ['Paula_Tamara_Morales_Guzman', 'paula-tamara-morales-guzman.png'],
  ['Juan_Carlos_Ya_ez_Vallejos', 'juan-carlos-yanez-vallejos.png'],
  ['Patricio_Alfredo_Madariaga_Faundez', 'patricio-madariaga-faundez.png'],
  ['Bernardo_Javier_Valenzuela_Palma', 'bernardo-valenzuela-palma.png'],
  ['Francisco_Ignacio_Catalan_Parra', 'francisco-catalan-parra.png'],
  ['Tomas_Alejandro_Leyton_Miranda', 'tomas-leyton-miranda.png'],
  ['Pamela_Thalia_O_ate_Vergara', 'pamela-onate-vergara.png'],
  ['Chiistine_Rafaela_Rios_Guzman', 'christine-rafaela-rios-guzman.png'],
  ['Rodrigo_Ivan_Fernandez_Burdiles', 'rodrigo-fernandez-burdiles.png'],
  ['Ricardo_Sebastian_Gonzalez_Mora', 'ricardo-gonzalez-mora.png'],
  ['Alondra_Lisoleth_Pino_Reyes', 'alondra-reyes-pino.png'],
  ['Juan_Jose_Salazar_Erices', 'juan-jose-salazar-erices.png'],
  ['Luis_Manuel_Molina_Castro', 'luis-molina-castro.png'],
  ['Javiera_Elizabeth_Quezada_Rios', 'javiera-quezada-rios.png'],
  ['Fernanda_Camila_Gallardo_Gallardo', 'fernanda-gallardo-gallardo.png'],
  ['Victor_Jesus_Venegas_Zambrano', 'victor-venegas-zambrano.png'],
  ['Ihan_Marcel_Cleveland_Figueroa', 'ihan-cleveland-figueroa.png'],
  ['Mariano_Alexis_Ruiz_Hernandez', 'mariano-ruiz-hernandez.png'],
  /* Retratos gala (misma carpeta de assets) */
  ['Leonardo_Patricio_Rios_Guzman', 'leonardo-patricio-rios-guzman.png'],
  ['Felipe_Andres_Villagras_Rojas', 'felipe-andres-villagra-rojas.png'],
  ['Sergio_Ariel_Contreras_Gutierrez', 'sergio-ariel-contreras-gutierrez.png'],
  ['Daniel_Alexander_Gonzalez_Unda', 'daniel-alexander-gonzalez-unda.png'],
  ['Jonathan_Patricio_Mora_Bustamante', 'jonathan-patricio-mora-bustamante.png'],
  ['Jasmin_Elena_Silva_Escalona', 'jasmin-elena-silva-escalona.png'],
  ['Diego_Salas_Parra', 'diego-salas-parra.png'],
  ['Debora_Yinett_Baeza_Neira', 'debora-yinett-baeza-neira.png'],
  ['Felipe_Andr_s_Lopez_Flores', 'felipe-andres-lopez-flores.png'],
];

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) collectFiles(p, out);
    else if (/\.(png|jpe?g|webp)$/i.test(name)) out.push(p);
  }
  return out;
}

const srcRoot = path.resolve(process.argv[2] || defaultSrc);
fs.mkdirSync(dstDir, { recursive: true });
const files = collectFiles(srcRoot);

let ok = 0;
let fail = 0;
for (const [needle, destName] of mappings) {
  const hit = files.find((f) => path.basename(f).includes(needle));
  if (!hit) {
    console.warn('[falta]', needle);
    fail += 1;
    continue;
  }
  try {
    if (!fs.existsSync(hit)) {
      console.warn('[sin disco]', hit);
      fail += 1;
      continue;
    }
    fs.copyFileSync(hit, path.join(dstDir, destName));
    console.log('[ok]', destName);
    ok += 1;
  } catch (e) {
    console.warn('[error]', destName, e.message);
    fail += 1;
  }
}
console.log(`Listo: ${ok} copiados, ${fail} pendientes o error. Destino: ${dstDir}`);
