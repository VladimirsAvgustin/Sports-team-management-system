// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4ffVbDSTmJ_aHkDRa2iPzlSyLC_V5_4s",
  authDomain: "sportteammanagment.firebaseapp.com",
  projectId: "sportteammanagment",
  storageBucket: "sportteammanagment.firebasestorage.app",
  messagingSenderId: "541915118959",
  appId: "1:541915118959:web:223b6bd9924f9bed9ffc9a",
  measurementId: "G-02GPY9TMVW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);