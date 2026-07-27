import provinceGeoJson from "geojson-indonesia/geojson/gadm41_IDN_1.json";

/**
 * Data GeoJSON level-provinsi Indonesia (paket `geojson-indonesia`, sumber
 * GADM). Diimpor LANGSUNG dari file spesifiknya (bukan lewat `index.js`
 * paket ini, yang me-`require()` keempat level sekaligus — kota/kecamatan/
 * kelurahan totalnya >70MB dan tidak pernah dipakai di sini) supaya bundler
 * cuma menyertakan file level-provinsi ini (~3MB), bukan seluruh paket.
 */
export type IndonesiaProvinceFeature = {
  type: "Feature";
  properties: { NAME_1: string; [key: string]: unknown };
  geometry: { type: string; coordinates: unknown };
};

export const INDONESIA_PROVINCE_GEOJSON = provinceGeoJson as {
  type: "FeatureCollection";
  features: IndonesiaProvinceFeature[];
};

/**
 * Data provinsi di backend diisi manual (form/import Excel) — hasilnya
 * bervariasi ejaan & kapitalisasi ("DKI Jakarta" vs "Dki Jakarta"), dan
 * kadang salah isi nama kabupaten alih-alih provinsi ("Kab. Agam"). GADM
 * (dataset peta ini) menulis nama provinsi tanpa spasi/tanda baca
 * ("JakartaRaya", bukan "DKI Jakarta"). Normalisasi di bawah ini best-effort:
 * cocok untuk ejaan yang wajar, entri yang tidak bisa dicocokkan (misal nama
 * kabupaten) SENGAJA dilewati saat menghitung sebaran per provinsi — bukan
 * bug, keterbatasan kualitas data sumber yang dicatat di dokumentasi sprint.
 */
const PROVINCE_ALIASES: Record<string, string> = {
  "dki jakarta": "JakartaRaya",
  "jakarta": "JakartaRaya",
  "di yogyakarta": "Yogyakarta",
  "diy": "Yogyakarta",
  "kepulauan bangka belitung": "BangkaBelitung",
  "bangka belitung": "BangkaBelitung",
  "kepulauan riau": "KepulauanRiau",
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

const GADM_NAMES = INDONESIA_PROVINCE_GEOJSON.features.map((f) => f.properties.NAME_1);
const GADM_LOOKUP = new Map(GADM_NAMES.map((name) => [name.toLowerCase(), name]));

/**
 * Mencocokkan string provinsi dari data outlet ke nama GADM (`NAME_1`) yang
 * dipakai peta. Mengembalikan `null` kalau tidak bisa dicocokkan (dilewati
 * oleh pemanggil, bukan dipaksakan).
 */
export function matchProvinceToGadmName(rawProvince?: string | null): string | null {
  if (!rawProvince) return null;
  const slug = slugify(rawProvince);

  if (PROVINCE_ALIASES[slug]) return PROVINCE_ALIASES[slug];

  const compact = slug.replace(/\s+/g, "");
  return GADM_LOOKUP.get(compact) ?? null;
}
