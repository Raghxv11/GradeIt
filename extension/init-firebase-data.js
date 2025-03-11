// Import Firebase functions from our local bundle
import { initializeApp } from "./firebase-bundle/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from "./firebase-bundle/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACLvunRNHz5Ja7iJagI3ri4DJ4F-lu3d8",
  authDomain: "gradify-extension.firebaseapp.com",
  projectId: "gradify-extension",
  storageBucket: "gradify-extension.firebasestorage.app",
  messagingSenderId: "915234556406",
  appId: "1:915234556406:web:b991375217736ef0c4dfd7",
  measurementId: "G-5Q502T1HF5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample student data with 10 students and comprehensive information


/**
 * Initializes the Firebase database with sample student data
 */
async function initializeDatabase() {
  try {
    // First, clear any existing data
    const studentsCollection = collection(db, "students");
    const existingStudents = await getDocs(studentsCollection);
    
    console.log("Clearing existing data...");
    const deletePromises = existingStudents.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log("Adding sample student data...");
    const addPromises = sampleStudents.map(student => addDoc(collection(db, "students"), student));
    await Promise.all(addPromises);
    
    console.log("Database initialized successfully with sample data!");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Run the initialization
initializeDatabase();
