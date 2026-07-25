/**
 * View model tabel Kelolaan Customer.
 *
 * Dipindahkan dari `app/menu/data-kelolaan/page.tsx` agar ada satu definisi
 * yang dipakai bersama oleh halaman kelolaan, form, deskripsi customer,
 * dashboard, dan trash.
 *
 * Satu baris `NasabahItem` memampatkan DELAPAN entitas backend: owner, outlet,
 * lead, lead_assignment, customer_interaction, training, sales_closing, dan
 * subscription. Bentuk gepeng ini dipertahankan dengan sengaja supaya UI yang
 * sudah jadi tidak perlu ditulis ulang; `app/lib/mappers/nasabah.ts` yang
 * bertugas menyusunnya dari response backend.
 */
export interface NasabahItem {
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  expiredDate: string;
  totalTransaksi: number;
  scor: number;
  callStatus: string;
  chatStatus: string;
  validitas: string;
  remarks: string;
  sumberNasabah: string;
  finalisasiClosing: string;
  skemaId?: string;
  nominal: number;
  noted: string;
  callHistories?: {
    waktuCall: string;
    picSales: string;
    remark: string;
    conclusion?: string;
  }[];
  trainingSessions?: string[];
  trainingHistories?: {
    waktuTraining: string;
    lokasiTraining: string;
  }[];
  purchaseHistories?: {
    paket: string;
    waktuMulai: string;
    waktuBerakhir: string;
    hargaAktual: number;
    snapshot?: {
      paketId: string;
      namaPaket: string;
      hargaPaketBulanan: number;
      promoId: string;
      namaPromo: string;
      tenor: number;
      bonus: number;
      hargaNormal: number;
      diskonPromo: number;
      hargaPromo: number;
      jenisPromo: string;
      bundlingItems: string[];
      potonganTambahan: number;
      kodeUnik: number;
    };
  }[];

  /**
   * Field tambahan hasil integrasi API (tidak ada di versi dummy).
   * Dipakai halaman untuk memanggil endpoint lanjutan tanpa menebak ID.
   */
  leadId?: number;
  ownerId?: number;
  outletId?: number;

  /**
   * Daftar nama field yang backend belum sediakan pada sprint ini.
   * UI memakainya untuk menampilkan "—" alih-alih angka karangan.
   * Lihat `UNAVAILABLE_FIELDS` di `app/lib/mappers/nasabah.ts`.
   */
  unavailableFields?: string[];
}
