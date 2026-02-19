// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcakwZLMxweGu91lFw2JoBLJBDjJO_WaU",
  authDomain: "spin-to-earn-d5add.firebaseapp.com",
  projectId: "spin-to-earn-d5add",
  storageBucket: "spin-to-earn-d5add.firebasestorage.app",
  messagingSenderId: "69904045735",
  appId: "1:69904045735:web:eb5737ef725e4fc249ad82",
  measurementId: "G-5HPNB1RHX2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);