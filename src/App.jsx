import { useState, useRef, useCallback, useEffect } from "react";

const ROLE_META = {
  admin:   { label: "Admin",      color: "#a78bfa", border: "#7c3aed", bg: "rgba(124,58,237,0.15)" },
  teacher: { label: "Guru",       color: "#60a5fa", border: "#2563eb", bg: "rgba(37,99,235,0.15)"  },
  student: { label: "Siswa",      color: "#34d399", border: "#059669", bg: "rgba(5,150,105,0.15)"  },
  parent:  { label: "Orang Tua",  color: "#fbbf24", border: "#d97706", bg: "rgba(217,119,6,0.15)"  },
  mixed:   { label: "Semua Role", color: "#f472b6", border: "#db2777", bg: "rgba(219,39,119,0.15)" },
};

const TYPE_META = {
  W: { label: "Workspace", color: "#fb923c" },
  V: { label: "View",      color: "#94a3b8" },
  M: { label: "Mixed",     color: "#a78bfa" },
};

const TREE = {
  id: "root", label: "pikira.id", type: "root",
  desc: "Subdomain sekolah menentukan tenant aktif.",
  children: [
    {
      id: "auth", label: "Masuk", type: "section",
      children: [
        { id: "login", label: "Login", role: "mixed", type: "W", desc: "Pintu masuk utama. Subdomain sekolah menentukan tenant aktif." },
        { id: "forgot", label: "Lupa Kata Sandi", role: "mixed", type: "W", desc: "Reset kata sandi via email terdaftar." },
        { id: "pw", label: "Ganti Kata Sandi", role: "mixed", type: "W", desc: "Ganti kata sandi setelah login pertama kali." },
      ],
    },
    {
      id: "pengaturan", label: "Pengaturan", type: "section",
      children: [
        {
          id: "pg-struktur", label: "Struktur Akademik", role: "admin", type: "V", desc: "Kelola tahun ajaran, tingkat kelas, mata pelajaran, dan rombel.",
          children: [
            {
              id: "pg-tahun", label: "Tahun Ajaran", role: "admin", type: "V", desc: "Daftar semua tahun ajaran.",
              children: [
                { id: "pg-tahun-detail", label: "Detail Tahun Ajaran", role: "admin", type: "M", desc: "Kelola semester, tingkat kelas, mapel, dan kursus per tahun." },
                { id: "pg-homeroom", label: "Detail Homeroom", role: "admin", type: "M", desc: "Atur siswa dan wali kelas untuk setiap rombel." },
                { id: "pg-naik", label: "Wizard Kenaikan Kelas", role: "admin", type: "W", desc: "Alur langkah-demi-langkah untuk menaikkan siswa ke tahun berikutnya." },
                { id: "pg-salin", label: "Salin Tahun Ajaran", role: "admin", type: "W", desc: "Duplikat struktur akademik dari tahun sebelumnya." },
              ],
            },
          ],
        },
        {
          id: "pg-users", label: "Pengguna", role: "admin", type: "V", desc: "Manajemen identitas semua pengguna sekolah.",
          children: [
            {
              id: "pg-dir", label: "Direktori Pengguna", role: "admin", type: "V", desc: "Daftar semua pengguna. Filter berdasarkan peran.",
              children: [
                { id: "pg-profil", label: "Profil Pengguna", role: "admin", type: "M", desc: "Detail pengguna, peran, dan pengaturan akses." },
              ],
            },
            { id: "pg-csv", label: "Import CSV", role: "admin", type: "W", desc: "Tambah pengguna secara massal lewat file CSV." },
          ],
        },
        {
          id: "pg-jadwal", label: "Jadwal & Kalender", role: "admin", type: "V", desc: "Timetable builder berbasis algoritma dengan deteksi konflik.",
          children: [
            {
              id: "pg-jminggu", label: "Jadwal Mingguan", role: "admin", type: "W", desc: "Grid jadwal per homeroom. Drag-to-place, deteksi konflik, saran algoritma.",
              children: [
                { id: "pg-jgrid", label: "Grid Editor Homeroom", role: "admin", type: "W", desc: "Editor slot per homeroom. Highlight konflik merah, saran hijau." },
              ],
            },
            { id: "pg-jguru", label: "Jadwal Guru", role: "admin", type: "V", desc: "Tampilan jadwal mingguan per guru. Read-only." },
            { id: "pg-ruang", label: "Utilisasi Ruangan", role: "admin", type: "V", desc: "Grid penggunaan ruang kelas per slot waktu." },
            { id: "pg-kalender", label: "Kalender Akademik", role: "admin", type: "M", desc: "Hari libur, ujian, kegiatan penting." },
            {
              id: "pg-ujian-jadwal", label: "Jadwal Ujian", role: "admin", type: "W", desc: "Override jadwal reguler untuk periode ujian.",
              children: [
                { id: "pg-ujian-grid", label: "Grid Editor Jadwal Ujian", role: "admin", type: "W", desc: "Editor periode ujian per homeroom." },
              ],
            },
            { id: "pg-versi", label: "Riwayat Versi", role: "admin", type: "V", desc: "Log perubahan jadwal. Rollback ke versi sebelumnya." },
          ],
        },
        { id: "pg-formula", label: "Formula Nilai Default", role: "admin", type: "W", desc: "Atur bobot default gradebook untuk seluruh sekolah." },
        { id: "pg-rapor-set", label: "Pengaturan Rapor", role: "admin", type: "W", desc: "Konfigurasi template dan periode penerbitan rapor." },
      ],
    },
    {
      id: "kelas", label: "Kelas Saya", type: "section",
      children: [
        {
          id: "kl-daftar", label: "Daftar Kelas", role: "teacher", type: "V", desc: "Semua kelas yang diampu. Badge ungraded selalu terlihat.",
          children: [
            {
              id: "kl-beranda", label: "Beranda Kelas", role: "teacher", type: "M",
              desc: "Pusat kerja harian: status cards, activity feed, shortcut ke semua fitur kelas.",
              note: "Tab di bawah ini diakses dari halaman ini — tidak perlu klik terpisah.",
              children: [
                {
                  id: "kl-materi", label: "Materi", role: "teacher", type: "M", desc: "Kelola materi pelajaran. Upload PDF, video, link.",
                  children: [
                    { id: "kl-materi-editor", label: "Editor Materi", role: "teacher", type: "W", desc: "Buat atau edit materi. Import dari tahun sebelumnya." },
                    { id: "kl-materi-viewer", label: "Viewer Materi", role: "mixed", type: "V", desc: "Tampilan materi untuk siswa dan guru." },
                  ],
                },
                {
                  id: "kl-atp", label: "ATP", role: "teacher", type: "V", desc: "Daftar Alur Tujuan Pembelajaran per mata pelajaran.",
                  children: [
                    { id: "kl-atp-create", label: "Buat ATP", role: "teacher", type: "W", desc: "Pilih jalur: AI generate, upload dokumen, atau manual." },
                    { id: "kl-atp-editor", label: "Editor ATP", role: "teacher", type: "W", desc: "Edit ATP dengan copilot toolbar. Streaming, diff view, accept/reject." },
                  ],
                },
                {
                  id: "kl-rpp", label: "RPP / Modul Ajar", role: "teacher", type: "V", desc: "Daftar RPP per mata pelajaran.",
                  children: [
                    { id: "kl-rpp-create", label: "Buat RPP", role: "teacher", type: "W", desc: "Pilih jalur: AI generate, upload dokumen, atau manual." },
                    {
                      id: "kl-rpp-editor", label: "Editor RPP ★", role: "teacher", type: "W", desc: "Pengalaman copilot utama. AI generate draft, guru edit inline.",
                      children: [
                        { id: "kl-rpp-diff", label: "Diff View", role: "teacher", type: "W", desc: "Bandingkan versi lama vs baru hasil regenerasi AI. Accept/reject per bagian." },
                        { id: "kl-rpp-history", label: "Riwayat Versi", role: "teacher", type: "V", desc: "Semua versi RPP. Rollback ke versi manapun." },
                      ],
                    },
                  ],
                },
                {
                  id: "kl-tugas", label: "Tugas", role: "teacher", type: "V", desc: "Daftar tugas yang sudah diposting ke kelas ini.",
                  children: [
                    {
                      id: "kl-tugas-antrian", label: "Antrian Pengumpulan", role: "teacher", type: "M", desc: "Semua submission masuk. Filter: belum dinilai, sudah, terlambat.",
                      children: [
                        { id: "kl-tugas-grading", label: "Penilaian Tugas", role: "teacher", type: "W", desc: "Grading per siswa. AI sarankan skor esai, guru konfirmasi." },
                      ],
                    },
                  ],
                },
                {
                  id: "kl-kuis", label: "Kuis", role: "teacher", type: "V", desc: "Daftar kuis yang diposting ke kelas ini.",
                  children: [
                    { id: "kl-kuis-detail", label: "Detail Kuis", role: "teacher", type: "M", desc: "Konfigurasi kuis, analytics hasil, dan status posting." },
                    { id: "kl-kuis-hasil", label: "Hasil Kuis", role: "teacher", type: "V", desc: "Dashboard hasil: per-siswa dan per-soal. Distribusi skor." },
                  ],
                },
                {
                  id: "kl-nilai", label: "Nilai", role: "teacher", type: "M", desc: "Spreadsheet-like grade sheet. Inline edit, auto-total, highlight at-risk.",
                  children: [
                    { id: "kl-nilai-formula", label: "Pengaturan Formula", role: "teacher", type: "W", desc: "Slider bobot nilai dengan preview formula live." },
                    { id: "kl-nilai-kktp", label: "Matriks KKTP", role: "teacher", type: "V", desc: "Tracking kompetensi per siswa sesuai KKTP." },
                    { id: "kl-nilai-final", label: "Finalisasi Nilai", role: "teacher", type: "W", desc: "Review dan kunci nilai sebelum rapor dibuat." },
                  ],
                },
                {
                  id: "kl-absensi", label: "Absensi", role: "teacher", type: "W", desc: "Tap-to-mark. Hadir/Izin/Sakit/Terlambat. Selesai dalam 60 detik.",
                  children: [
                    { id: "kl-absensi-rekap", label: "Rekap Absensi", role: "teacher", type: "V", desc: "Ringkasan bulanan + drill-down per siswa. Auto-flag di bawah 75%." },
                    { id: "kl-absensi-matrix", label: "Matriks Absensi", role: "mixed", type: "V", desc: "Grid kehadiran seluruh kelas lintas tanggal." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "akademik", label: "Akademik", type: "section",
      children: [
        {
          id: "ak-siswa", label: "Siswa", role: "admin", type: "V", desc: "Manajemen data siswa sekolah.",
          children: [
            {
              id: "ak-dir", label: "Direktori Siswa", role: "admin", type: "V", desc: "Search-first. Temukan siswa, lihat profil lengkap.",
              children: [
                { id: "ak-profil", label: "Profil Siswa", role: "admin", type: "V", desc: "Tab: biodata, riwayat akademik, orang tua, catatan disiplin." },
              ],
            },
            { id: "ak-daftar", label: "Pendaftaran Baru", role: "admin", type: "W", desc: "Registrasi siswa baru dengan form lengkap." },
            { id: "ak-mutasi", label: "Wizard Mutasi", role: "admin", type: "W", desc: "Proses mutasi masuk dan keluar siswa." },
            { id: "ak-lulus", label: "Kelulusan", role: "admin", type: "W", desc: "Proses kelulusan siswa akhir tahun." },
          ],
        },
        {
          id: "ak-kurikulum", label: "Kurikulum", role: "teacher", type: "V", desc: "Referensi Capaian Pembelajaran.",
          children: [
            {
              id: "ak-cp", label: "Browser CP", role: "teacher", type: "V", desc: "Referensi Capaian Pembelajaran per mapel dan fase. Read-only.",
              children: [
                { id: "ak-cp-detail", label: "Detail CP", role: "teacher", type: "V", desc: "CP per mapel dan fase. Dasar pembuatan ATP dan RPP." },
              ],
            },
          ],
        },
        {
          id: "ak-penilaian", label: "Penilaian", role: "teacher", type: "V", desc: "Bank soal dan manajemen kuis lintas kelas.",
          children: [
            {
              id: "ak-bank", label: "Bank Soal", role: "teacher", type: "V", desc: "Perpustakaan soal reusable. Filter mapel, tipe, kesulitan.",
              children: [
                {
                  id: "ak-soal-group", label: "Grup Soal", role: "teacher", type: "W", desc: "Kelompokkan soal per topik atau ujian.",
                  children: [
                    { id: "ak-soal-editor", label: "Editor Soal", role: "teacher", type: "W", desc: "Buat soal via AI, upload, atau manual. PG, esai, isian." },
                  ],
                },
              ],
            },
            {
              id: "ak-kuis-master", label: "Daftar Kuis", role: "teacher", type: "V", desc: "Semua kuis lintas kelas. Status, analytics, cross-posting.",
              children: [
                {
                  id: "ak-kuis-detail", label: "Detail Kuis", role: "teacher", type: "M", desc: "Konfigurasi kuis, analytics hasil, dan manajemen posting.",
                  children: [
                    { id: "ak-kuis-post", label: "Post Kuis", role: "teacher", type: "W", desc: "Pilih kelas tujuan, atur waktu dan durasi per kelas." },
                    { id: "ak-kuis-hasil", label: "Hasil Kuis", role: "teacher", type: "V", desc: "Dashboard hasil: per-siswa dan per-soal. Distribusi skor." },
                  ],
                },
                { id: "ak-kuis-builder", label: "Builder Kuis", role: "teacher", type: "W", desc: "Pilih soal dari bank, konfigurasi durasi, acak soal." },
              ],
            },
            {
              id: "ak-tugas-bank", label: "Bank Tugas", role: "teacher", type: "V", desc: "Perpustakaan tugas reusable. Buat sekali, posting ke banyak kelas.",
              children: [
                { id: "ak-tugas-editor", label: "Editor Tugas", role: "teacher", type: "W", desc: "Buat tugas dengan deskripsi dan rubrik. AI bantu generate." },
                { id: "ak-tugas-post", label: "Post Tugas", role: "teacher", type: "W", desc: "Pilih kelas tujuan dan atur deadline per kelas." },
              ],
            },
          ],
        },
        {
          id: "ak-rapor", label: "Rapor", role: "mixed", type: "V", desc: "Alur pembuatan dan penerbitan rapor.",
          children: [
            { id: "ak-rapor-kesiapan", label: "Kesiapan Nilai", role: "mixed", type: "V", desc: "Dashboard wali kelas: berapa mapel sudah finalisasi. CTA Buat Rapor." },
            {
              id: "ak-rapor-dashboard", label: "Dashboard Rapor", role: "mixed", type: "V", desc: "Semua rapor homeroom. Status per siswa: draft/review/published.",
              children: [
                {
                  id: "ak-rapor-editor", label: "Editor Rapor", role: "mixed", type: "W", desc: "AI compile data siswa ke kartu ringkasan. Guru tulis narasi sendiri.",
                  children: [
                    { id: "ak-rapor-submit", label: "Submit ke Kepala Sekolah", role: "mixed", type: "W", desc: "Kirim rapor untuk direview kepala sekolah." },
                  ],
                },
              ],
            },
            {
              id: "ak-rapor-review", label: "Antrian Review KS", role: "admin", type: "M", desc: "Kepala sekolah review dan setujui atau kembalikan rapor.",
              children: [
                { id: "ak-rapor-approve", label: "Approve / Kembalikan", role: "admin", type: "W", desc: "Setujui untuk diterbitkan atau kembalikan dengan catatan." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "monitoring", label: "Monitoring", type: "section",
      children: [
        {
          id: "mon-ujian", label: "Ujian Aktif", role: "mixed", type: "V", desc: "Real-time: kuis yang sedang berlangsung, terjadwal, dan selesai.",
          children: [
            { id: "mon-detail", label: "Detail Ujian Aktif", role: "mixed", type: "V", desc: "Live stats: siapa sudah submit, progress pengerjaan, distribusi waktu." },
          ],
        },
      ],
    },
    {
      id: "komunikasi", label: "Komunikasi", type: "section",
      children: [
        {
          id: "kom-pengumuman", label: "Pengumuman", role: "mixed", type: "V", desc: "Daftar pengumuman sekolah yang dipublikasikan.",
          children: [
            { id: "kom-buat", label: "Buat Pengumuman", role: "admin", type: "W", desc: "Composer pengumuman dengan targeting audiens dan jadwal kirim." },
          ],
        },
        { id: "kom-diskusi", label: "Diskusi Kelas", role: "mixed", type: "M", desc: "Thread diskusi per kelas. Feature-flagged, opsional per sekolah." },
      ],
    },
    {
      id: "siswa", label: "Portal Siswa", type: "section",
      children: [
        {
          id: "s-kursus", label: "Kursus Saya", role: "student", type: "V", desc: "Semua mata pelajaran yang diikuti siswa semester ini.",
          children: [
            {
              id: "s-course-detail", label: "Detail Kursus", role: "student", type: "M", desc: "Materi, tugas, dan kuis per mata pelajaran.",
              note: "Konten diakses dari halaman ini.",
              children: [
                { id: "s-materi", label: "Viewer Materi", role: "student", type: "V", desc: "Baca atau tonton materi yang dipublikasikan guru." },
                { id: "s-tugas-submit", label: "Kumpul Tugas", role: "student", type: "W", desc: "Upload file atau isi teks jawaban tugas." },
                { id: "s-kuis-take", label: "Kerjakan Kuis", role: "student", type: "W", desc: "UI ujian: timer, navigasi soal, submit jawaban." },
              ],
            },
          ],
        },
        {
          id: "s-nilai", label: "Nilai Saya", role: "student", type: "V", desc: "Rangkuman nilai per mata pelajaran.",
          children: [
            { id: "s-nilai-detail", label: "Detail Nilai", role: "student", type: "V", desc: "Breakdown nilai per komponen dengan trend chart." },
          ],
        },
        {
          id: "s-rapor", label: "Rapor Saya", role: "student", type: "V", desc: "Rapor yang sudah dipublikasikan.",
          children: [
            { id: "s-rapor-detail", label: "Detail Rapor + PDF", role: "student", type: "V", desc: "Lihat rapor lengkap dan download PDF." },
          ],
        },
        { id: "s-absensi", label: "Kehadiran Saya", role: "student", type: "V", desc: "Rekap kehadiran bulanan. Persentase per mata pelajaran." },
        { id: "s-aktivitas", label: "Aktivitas Saya", role: "student", type: "V", desc: "Log aktivitas: submission, nilai keluar, kuis selesai." },
      ],
    },
    {
      id: "ortu", label: "Portal Orang Tua", type: "section",
      children: [
        { id: "p-beranda", label: "Beranda", role: "parent", type: "V", desc: "Ringkasan anak: kehadiran, nilai terkini, ujian mendatang, pengumuman." },
        { id: "p-nilai", label: "Nilai Anak", role: "parent", type: "V", desc: "Nilai per mapel yang sudah dipublikasikan." },
        {
          id: "p-rapor", label: "Rapor Anak", role: "parent", type: "V", desc: "Rapor yang sudah dipublikasikan.",
          children: [
            { id: "p-rapor-detail", label: "Detail Rapor + PDF", role: "parent", type: "V", desc: "Lihat rapor lengkap dan download PDF." },
          ],
        },
        { id: "p-absensi", label: "Kehadiran Anak", role: "parent", type: "V", desc: "Kalender kehadiran bulanan per mata pelajaran." },
        { id: "p-ujian", label: "Hasil Ujian Anak", role: "parent", type: "V", desc: "Skor kuis dan tugas yang sudah dipublikasikan." },
        { id: "p-profil", label: "Profil Anak", role: "parent", type: "V", desc: "Data biodata siswa. Read-only." },
        { id: "p-notif", label: "Preferensi Notifikasi", role: "parent", type: "W", desc: "Satu-satunya halaman writable untuk orang tua." },
      ],
    },
  ],
};

const NODE_W = 148;
const NODE_H = 34;
const H_GAP = 52;
const V_GAP = 10;

function measureSubtree(node) {
  if (!node.children || node.children.length === 0) { node._leafH = NODE_H; return NODE_H; }
  let total = 0;
  node.children.forEach((c, i) => { total += measureSubtree(c); if (i < node.children.length - 1) total += V_GAP; });
  node._leafH = total;
  return total;
}

function assignPositions(node, x, y) {
  node._x = x;
  node._y = y + (node._leafH - NODE_H) / 2;
  if (!node.children || node.children.length === 0) return;
  const childX = x + NODE_W + H_GAP;
  let childY = y;
  node.children.forEach((c) => { assignPositions(c, childX, childY); childY += c._leafH + V_GAP; });
}

function flattenTree(node, depth = 0, arr = []) {
  arr.push({ ...node, _depth: depth });
  if (node.children) node.children.forEach(c => flattenTree(c, depth + 1, arr));
  return arr;
}

function collectEdges(node, arr = []) {
  if (node.children) { node.children.forEach(c => { arr.push({ from: node.id, to: c.id }); collectEdges(c, arr); }); }
  return arr;
}

function buildLayout(tree) {
  measureSubtree(tree);
  assignPositions(tree, 0, 0);
  const nodes = flattenTree(tree);
  const edges = collectEdges(tree);
  return { nodes, edges };
}

function Edge({ fromNode, toNode, dimmed }) {
  const fx = fromNode._x + NODE_W;
  const fy = fromNode._y + NODE_H / 2;
  const tx = toNode._x;
  const ty = toNode._y + NODE_H / 2;
  const midX = fx + H_GAP / 2;
  const d = `M ${fx} ${fy} L ${midX} ${fy} L ${midX} ${ty} L ${tx} ${ty}`;
  return <path d={d} fill="none" stroke={dimmed ? "rgba(255,255,255,0.03)" : "rgba(148,163,184,0.18)"} strokeWidth={1} strokeLinecap="square" />;
}

function MapNode({ node, onClick, selected, dimmed }) {
  const isRoot = node.type === "root";
  const isSection = node.type === "section";
  const role = node.role ? ROLE_META[node.role] : null;
  const stype = (!isRoot && !isSection) ? TYPE_META[node.type] : null;
  let fill, stroke, labelColor;
  if (isRoot) { fill = selected ? "#fef3c7" : "#1c1917"; stroke = selected ? "#f59e0b" : "rgba(251,191,36,0.5)"; labelColor = selected ? "#78350f" : "#fef3c7"; }
  else if (isSection) { fill = selected ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)"; stroke = selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"; labelColor = selected ? "#e2e8f0" : "#64748b"; }
  else { fill = selected ? (role?.bg || "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.02)"; stroke = selected ? (role?.border || "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.06)"; labelColor = selected ? "#f1f5f9" : dimmed ? "#1e293b" : "#64748b"; }
  const label = node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label;
  return (
    <g onClick={() => onClick(node)} style={{ cursor: "pointer" }} opacity={dimmed ? 0.25 : 1}>
      <rect x={node._x} y={node._y} width={NODE_W} height={NODE_H} rx={isRoot ? 7 : isSection ? 5 : 4} fill={fill} stroke={stroke} strokeWidth={selected ? 1.5 : 1} />
      {role && !isSection && <circle cx={node._x + 9} cy={node._y + NODE_H / 2} r={2.5} fill={role.color} opacity={selected ? 1 : 0.5} />}
      <text x={node._x + (role && !isSection ? 18 : 10)} y={node._y + NODE_H / 2 + 0.5} dominantBaseline="middle" fill={labelColor} fontSize={isRoot ? 11.5 : isSection ? 11 : 10.5} fontFamily="ui-monospace, monospace" fontWeight={isRoot ? 600 : isSection ? 500 : 400}>{label}</text>
      {stype && <text x={node._x + NODE_W - 7} y={node._y + NODE_H / 2 + 0.5} textAnchor="end" dominantBaseline="middle" fill={stype.color} fontSize={9} fontFamily="ui-monospace, monospace" opacity={0.7}>{node.type}</text>}
      {node.note && <circle cx={node._x + NODE_W - 18} cy={node._y + NODE_H / 2} r={3} fill="rgba(251,191,36,0.35)" stroke="rgba(251,191,36,0.6)" strokeWidth={0.5} />}
    </g>
  );
}

function DetailPanel({ node, onClose }) {
  if (!node) return null;
  const role = node.role ? ROLE_META[node.role] : null;
  const stype = (node.type !== "root" && node.type !== "section") ? TYPE_META[node.type] : null;
  return (
    <div style={{ position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)", width: 272, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "22px 20px", zIndex: 200, boxShadow: "0 32px 80px rgba(0,0,0,0.9)", fontFamily: "system-ui, sans-serif" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 15, padding: 4, lineHeight: 1 }}>✕</button>
      {stype && <div style={{ fontSize: 9, color: stype.color, fontFamily: "ui-monospace, monospace", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{stype.label}</div>}
      {node.type === "section" && <div style={{ fontSize: 9, color: "#475569", fontFamily: "ui-monospace, monospace", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Sidebar Section</div>}
      {node.type === "root" && <div style={{ fontSize: 9, color: "#f59e0b", fontFamily: "ui-monospace, monospace", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Root</div>}
      <div style={{ fontSize: 16, fontWeight: 650, color: "#f8fafc", marginBottom: 10, lineHeight: 1.3 }}>{node.label}</div>
      {role && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: role.bg, border: `1px solid ${role.border}`, borderRadius: 20, padding: "3px 10px", marginBottom: 14 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: role.color, display: "inline-block" }} /><span style={{ fontSize: 10.5, color: role.color, fontFamily: "ui-monospace, monospace" }}>{role.label}</span></div>}
      {node.desc && <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.65, margin: 0 }}>{node.desc}</p>}
      {node.note && <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8 }}><div style={{ fontSize: 9, color: "#f59e0b", fontFamily: "ui-monospace, monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Catatan</div><p style={{ fontSize: 12, color: "#a3945a", lineHeight: 1.6, margin: 0 }}>{node.note}</p></div>}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ position: "fixed", left: 24, bottom: 24, zIndex: 200, background: "rgba(10,10,10,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", fontFamily: "system-ui, sans-serif", backdropFilter: "blur(12px)" }}>
      <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "ui-monospace, monospace", marginBottom: 10 }}>Legend</div>
      <div style={{ display: "flex", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {Object.entries(ROLE_META).map(([k, r]) => (<div key={k} style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, display: "inline-block", flexShrink: 0 }} /><span style={{ fontSize: 10.5, color: "#64748b" }}>{r.label}</span></div>))}
        </div>
        <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {Object.entries(TYPE_META).map(([k, t]) => (<div key={k} style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 16, fontSize: 9, fontFamily: "ui-monospace, monospace", color: t.color, fontWeight: 700 }}>{k}</span><span style={{ fontSize: 10.5, color: "#64748b" }}>{t.label}</span></div>))}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}><span style={{ width: 16, display: "flex", justifyContent: "center" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(251,191,36,0.4)", border: "0.5px solid rgba(251,191,36,0.7)", display: "inline-block" }} /></span><span style={{ fontSize: 10.5, color: "#64748b" }}>Ada catatan</span></div>
        </div>
      </div>
    </div>
  );
}

function Controls({ onZoomIn, onZoomOut, onReset }) {
  const btn = (fn, lbl) => <button onClick={fn} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{lbl}</button>;
  return <div style={{ position: "fixed", left: 24, top: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 5 }}>{btn(onZoomIn, "+")}{btn(onZoomOut, "−")}{btn(onReset, "⌂")}</div>;
}

export default function PikiraMap() {
  const { nodes, edges } = buildLayout(TREE);
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const [selected, setSelected] = useState(null);
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.85 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleClick = useCallback((node) => { setSelected(prev => prev?.id === node.id ? null : node); }, []);
  const onMouseDown = useCallback((e) => { if (e.target.closest("button")) return; isPanning.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; }, []);
  const onMouseMove = useCallback((e) => { if (!isPanning.current) return; const dx = e.clientX - lastPos.current.x; const dy = e.clientY - lastPos.current.y; lastPos.current = { x: e.clientX, y: e.clientY }; setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy })); }, []);
  const onMouseUp = useCallback(() => { isPanning.current = false; }, []);
  const onWheel = useCallback((e) => { e.preventDefault(); const f = e.deltaY > 0 ? 0.97 : 1.03; setTransform(t => ({ ...t, scale: Math.min(3, Math.max(0.1, t.scale * f)) })); }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const selectedAncestors = new Set();
  if (selected) {
    const parentMap = {};
    const buildParents = (node, parent) => { if (parent) parentMap[node.id] = parent.id; if (node.children) node.children.forEach(c => buildParents(c, node)); };
    buildParents(TREE, null);
    let cur = selected.id;
    while (cur) { selectedAncestors.add(cur); cur = parentMap[cur]; }
    const addDesc = (node) => { selectedAncestors.add(node.id); if (node.children) node.children.forEach(addDesc); };
    const selNode = nodes.find(n => n.id === selected.id);
    if (selNode) addDesc(selNode);
  }

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh", background: "#080808", overflow: "hidden", position: "relative", cursor: "grab", userSelect: "none" }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs><pattern id="g" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {edges.map((e, i) => { const fn = nodeMap[e.from]; const tn = nodeMap[e.to]; if (!fn || !tn) return null; const dimmed = selected && !selectedAncestors.has(e.from) && !selectedAncestors.has(e.to); return <Edge key={i} fromNode={fn} toNode={tn} dimmed={dimmed} />; })}
          {nodes.map(node => <MapNode key={node.id} node={node} onClick={handleClick} selected={selected?.id === node.id} dimmed={selected ? !selectedAncestors.has(node.id) : false} />)}
        </g>
      </svg>
      <Controls onZoomIn={() => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.15) }))} onZoomOut={() => setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale * 0.85) }))} onReset={() => setTransform({ x: 40, y: 40, scale: 0.85 })} />
      <Legend />
      <DetailPanel node={selected} onClose={() => setSelected(null)} />
      <div style={{ position: "fixed", left: "50%", top: 20, transform: "translateX(-50%)", fontFamily: "ui-monospace, monospace", fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: 2, textTransform: "uppercase", pointerEvents: "none", zIndex: 200 }}>Pikira · Sitemap · March 2026</div>
      {!selected && <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 200, fontFamily: "system-ui, sans-serif", fontSize: 11, color: "#1e293b", textAlign: "right", lineHeight: 1.8, pointerEvents: "none" }}>Scroll to zoom · Drag to pan<br />Click any node for details</div>}
    </div>
  );
}
