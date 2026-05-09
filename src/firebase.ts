import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBcX9tKT0cV0hdOeIQd3XDhoXwT22x32sU",
  authDomain: "icp-tracker.firebaseapp.com",
  projectId: "icp-tracker",
  storageBucket: "icp-tracker.firebasestorage.app",
  messagingSenderId: "375532285934",
  appId: "1:375532285934:web:1bbda4c20a1b844a55e8ff"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

