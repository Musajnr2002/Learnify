// 1. Import the Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ADDED: Import Auth functions
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ADDED: Import Storage function for PDF/Video uploads
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdIIqknpaIVb-2JjQYNAOCK6MyxCKdQa4",
  authDomain: "virtual-classroom-mvp.firebaseapp.com",
  projectId: "virtual-classroom-mvp",
  storageBucket: "virtual-classroom-mvp.firebasestorage.app", // This is where files go!
  messagingSenderId: "95222220936",
  appId: "1:95222220936:web:46532f0829228b595e373d"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ADDED: Initialize Storage
const storage = getStorage(app);

// 3. Export everything
export { 
    db, 
    auth, 
    storage, // Now dashboard.js can "see" the storage bucket
    collection, 
    addDoc, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
};