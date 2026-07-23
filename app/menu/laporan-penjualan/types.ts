export type Snapshot = {
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

export type SalesTransaction = {
  id: string;
  kodeOwner: string;
  customerName: string;
  pic: string;
  tanggalClosing: string;
  paket: string;
  waktuMulai: string;
  waktuBerakhir: string;
  hargaAktual: number;
  statusBerlangganan: "New" | "Berlangganan" | "Jatuh Tempo" | "Expired";
  snapshot: Snapshot;
};
