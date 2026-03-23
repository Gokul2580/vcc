import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration - embedded directly
const firebaseConfig = {
  apiKey: "AIzaSyDVKJL9JYVbhiHpBut7AgmTQUUT1jVXGew",
  authDomain: "pixiebloomsin.firebaseapp.com",
  databaseURL: "https://pixiebloomsin-default-rtdb.firebaseio.com",
  projectId: "pixiebloomsin",
  storageBucket: "pixiebloomsin.firebasestorage.app",
  messagingSenderId: "928829690664",
  appId: "1:928829690664:web:491e0b74f319bfa0fb361d",
  measurementId: "G-N7VH1H8J47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const firestore = getFirestore(app);

// Optional: Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  } catch (e) {
    // Emulator already connected or not running
  }
  
  try {
    connectDatabaseEmulator(database, 'localhost', 9000);
  } catch (e) {
    // Emulator already connected or not running
  }
  
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (e) {
    // Emulator already connected or not running
  }
  
  try {
    connectFirestoreEmulator(firestore, 'localhost', 8080);
  } catch (e) {
    // Emulator already connected or not running
  }
}

export default app;
