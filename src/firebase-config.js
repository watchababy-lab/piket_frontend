// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Konfigurasi Firebase (punyamu tadi)
const firebaseConfig = {
  apiKey: "AIzaSyC8OTO3tINi-V1N5leuMbJfcIbisT9oXOA",
  authDomain: "piket-app-7b768.firebaseapp.com",
  projectId: "piket-app-7b768",
  storageBucket: "piket-app-7b768.firebasestorage.app",
  messagingSenderId: "237632710891",
  appId: "1:237632710891:web:de35d84de08ee71ee4b6ae",
  measurementId: "G-WCSR5SBBWM"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 🔑 Export database supaya bisa dipakai di App.js
export const db = getFirestore(app);
