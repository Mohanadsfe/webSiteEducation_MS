import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';  

const firebaseConfig = {
  apiKey: "AIzaSyBeZziCiUpZSjJ3tsSFSLEyQrE6OdCUETI",
  authDomain: "msacademic-c9f4c.firebaseapp.com",
  projectId: "msacademic-c9f4c",
  storageBucket: "msacademic-c9f4c.appspot.com",
  messagingSenderId: "1091960877761",
  appId: "1:1091960877761:web:8fbb5f404588bf457e1a40",
  measurementId: "G-3LNTT6QGMM"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
