import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Firebase
import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

function App() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    jabatan: "",
    keteranganJabatan: "",
    kehadiran: "",
    khusus: "",
  });

  // 🔥 Ambil dari localStorage biar tidak hilang saat refresh
  const [day, setDay] = useState(localStorage.getItem("day") || "");
  const [date, setDate] = useState(localStorage.getItem("date") || "");

  const [petugasPiket, setPetugasPiket] = useState([
    { nama: "", waktu: "" },
    { nama: "", waktu: "" },
    { nama: "", waktu: "" },
  ]);

  const [searchName, setSearchName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [exportDate, setExportDate] = useState("");

  const ADMIN_PASSWORD = "admin123"; // ganti sesuai kebutuhan

  // Firestore
  const piketRef = collection(db, "piketData");
  const settingsRef = (date) => doc(db, "settings", date || "default");

  const jabatanOptions = [
    "Kepala Dinas DISDIKBUD",
    "Sekretaris DISDIKBUD",
    "Kepala Sub Bagian",
    "Kepala Bidang",
    "Kepala Seksi",
    "Pegawai Staf",
  ];

  const keteranganOptions = {
    "Kepala Sub Bagian": [
      "Perencanaan, Keuangan, dan BMD",
      "Umum dan Kepegawaian",
      "Kerja Sama dan HuMas",
    ],
    "Kepala Bidang": ["Diksus", "Data", "Kebudayaan"],
    "Kepala Seksi": [
      "Diksus",
      "Pendidikan Akademi Komunitas",
      "Pendidik & Tendik",
      "Data & Informasi",
      "Fasilitas Pembiayaan Pendidikan",
      "Layanan Pendidikan Tambahan",
      "Objek Pemajuan Kebudayaan",
      "Cagar Budaya",
      "Tenaga & Lembaga Kebudayaan",
    ],
  };

  const kehadiranOptions = [
    "Hadir",
    "Dinas Luar",
    "Sakit (di Rumah Sakit)",
    "Sakit (di Rumah)",
    "Turun Lapangan",
    "Cuti",
  ];

  // 🔥 Simpan day & date ke localStorage setiap kali berubah
  useEffect(() => {
    if (day) localStorage.setItem("day", day);
  }, [day]);

  useEffect(() => {
    if (date) localStorage.setItem("date", date);
  }, [date]);

  // 🔥 Ambil data realtime dari Firestore
  useEffect(() => {
    const unsubData = onSnapshot(piketRef, (snapshot) => {
      setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubData();
  }, []);

  // 🔥 Ambil data settings sesuai tanggal
  useEffect(() => {
    if (!date) return;

    const unsubSettings = onSnapshot(settingsRef(date), (docSnap) => {
      if (docSnap.exists()) {
        const s = docSnap.data();
        setDay(s.day || "");
        setPetugasPiket(
          s.petugasPiket && s.petugasPiket.length === 3
            ? s.petugasPiket
            : [
                { nama: "", waktu: "" },
                { nama: "", waktu: "" },
                { nama: "", waktu: "" },
              ]
        );
      } else {
        // kalau belum ada data untuk tanggal tsb → kosong
        setPetugasPiket([
          { nama: "", waktu: "" },
          { nama: "", waktu: "" },
          { nama: "", waktu: "" },
        ]);
      }
    });

    return () => unsubSettings();
  }, [date]);

  // 🔥 Simpan form kehadiran
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      alert("Tanggal harus diisi oleh admin!");
      return;
    }
    await addDoc(piketRef, {
      ...form,
      waktu: new Date().toLocaleString(),
      tanggal: date,
    });
    setForm({
      nama: "",
      jabatan: "",
      keteranganJabatan: "",
      kehadiran: "",
      khusus: "",
    });
  };

  // 🔥 Update petugas piket
  const handleNamaPiketChange = async (index, value) => {
    const newPetugas = [...petugasPiket];
    newPetugas[index].nama = value;
    newPetugas[index].waktu = value ? new Date().toLocaleTimeString() : "";
    setPetugasPiket(newPetugas);

    if (date) {
      await setDoc(settingsRef(date), { day, date, petugasPiket: newPetugas });
    }
  };

  // 🔥 Admin login
  const handleAdminLogin = () => {
    if (adminPass === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminPass("");
      alert("Login Admin Berhasil!");
    } else {
      alert("Password Salah!");
    }
  };

  // 🔥 Export Excel
  const handleExportFlexible = (type) => {
    let exportData = [];

    if (type === "active") {
      exportData = data.filter((d) => d.tanggal === date);
    } else if (type === "byDate") {
      if (!exportDate) {
        alert("Pilih tanggal untuk export!");
        return;
      }
      exportData = data.filter((d) => d.tanggal === exportDate);
    } else if (type === "all") {
      exportData = data;
    }

    if (exportData.length === 0) {
      alert("Tidak ada data untuk export!");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Piket");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(blob, `Data_Piket_Export.xlsx`);
  };

  const filteredData = data
    .filter((d) => d.tanggal === date)
    .filter((d) => d.nama.toLowerCase().includes(searchName.toLowerCase()));

  const uniqueDates = Array.from(new Set(data.map((d) => d.tanggal))).sort();

  return (
    <div className="p-5">
      <h1>Aplikasi Monitoring Piket Harian DISDIKBUD</h1>

      {/* Bagian atas: Hari/Tanggal (kiri), Cari Nama + Login (kanan) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
        }}
      >
        <div>
          <label>
            Hari:{" "}
            <input
              type="text"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="Masukkan hari"
              disabled={!isAdmin}
            />
          </label>
          <br />
          <label>
            Tanggal:{" "}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!isAdmin}
            />
          </label>
          {isAdmin && (
            <button
              onClick={async () =>
                await setDoc(settingsRef(date), { day, date, petugasPiket })
              }
            >
              Simpan Hari & Tanggal
            </button>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <input
            type="text"
            placeholder="Cari Nama..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ padding: "5px", marginRight: "10px" }}
          />
          {!isAdmin ? (
            <>
              <input
                type="password"
                placeholder="Password Admin"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
              />
              <button onClick={handleAdminLogin}>Login Admin</button>
            </>
          ) : null}
        </div>
      </div>

      {/* Tabel Petugas Piket */}
      <table border="1" style={{ marginBottom: "20px", width: "100%" }}>
        <thead style={{ backgroundColor: "#add8e6" }}>
          <tr>
            <th>Nama Petugas Piket</th>
            <th>Waktu Input</th>
          </tr>
        </thead>
        <tbody>
          {petugasPiket.map((p, i) => (
            <tr key={i}>
              <td>
                <input
                  type="text"
                  value={p.nama}
                  onChange={(e) => handleNamaPiketChange(i, e.target.value)}
                  placeholder={`Petugas ${i + 1}`}
                />
              </td>
              <td>{p.waktu}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Form Input Kehadiran */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <input
          name="nama"
          value={form.nama}
          onChange={(e) => setForm({ ...form, nama: e.target.value })}
          placeholder="Nama"
          required
        />
        <select
          name="jabatan"
          value={form.jabatan}
          onChange={(e) =>
            setForm({
              ...form,
              jabatan: e.target.value,
              keteranganJabatan: keteranganOptions[e.target.value] ? "" : "-",
            })
          }
          required
        >
          <option value="">Pilih Jabatan</option>
          {jabatanOptions.map((j, i) => (
            <option key={i} value={j}>
              {j}
            </option>
          ))}
        </select>
        {form.jabatan && keteranganOptions[form.jabatan] && (
          <select
            name="keteranganJabatan"
            value={form.keteranganJabatan}
            onChange={(e) =>
              setForm({ ...form, keteranganJabatan: e.target.value })
            }
            required
          >
            <option value="">Pilih Keterangan Jabatan</option>
            {keteranganOptions[form.jabatan].map((k, i) => (
              <option key={i} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <select
          name="kehadiran"
          value={form.kehadiran}
          onChange={(e) => setForm({ ...form, kehadiran: e.target.value })}
          required
        >
          <option value="">Pilih Kehadiran</option>
          {kehadiranOptions.map((k, i) => (
            <option key={i} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          name="khusus"
          value={form.khusus}
          onChange={(e) => setForm({ ...form, khusus: e.target.value })}
          placeholder="Ket Khusus (Kegiatan & Kota)"
        />
        <button type="submit">Simpan</button>
      </form>

      {/* Tabel Data Kehadiran */}
      <table border="1" cellPadding="5" width="100%">
        <thead style={{ backgroundColor: "lightyellow" }}>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Jabatan</th>
            <th>Keterangan Jabatan</th>
            <th>Keterangan Kehadiran</th>
            <th>Keterangan Khusus</th>
            <th>Waktu Input</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {filteredData.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <td>{i + 1}</td>
                <td>{row.nama}</td>
                <td>{row.jabatan}</td>
                <td>{row.keteranganJabatan}</td>
                <td
                  style={{
                    color:
                      row.kehadiran === "Dinas Luar" ||
                      row.kehadiran === "Turun Lapangan"
                        ? "red"
                        : "black",
                  }}
                >
                  {row.kehadiran}
                </td>
                <td>{row.khusus}</td>
                <td>{row.waktu}</td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>

      {/* Export Excel - di bawah tabel */}
      {isAdmin && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={() => handleExportFlexible("active")}>
            Export Tanggal Aktif
          </button>
          <select
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
          >
            <option value="">-- Pilih Tanggal --</option>
            {uniqueDates.map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button onClick={() => handleExportFlexible("byDate")}>
            Export Tanggal Tertentu
          </button>
          <button onClick={() => handleExportFlexible("all")}>
            Export Semua Data
          </button>
        </div>
      )}

      {/* Pesan setelah login admin */}
      {isAdmin && (
        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontStyle: "italic",
            fontWeight: "bold",
            fontSize: "18px",
            color: "#444",
          }}
        >
          SELAMAT MENIKMATI HARI KERJAMU ^_^
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "30px",
          textAlign: "right",
          fontStyle: "italic",
          color: "gray",
        }}
      >
        Made By: <b>G.N.Patrouw</b>
      </div>
    </div>
  );
}

export default App;
