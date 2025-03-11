// Import Firebase functions from our local bundle
import { initializeApp } from "./firebase-bundle/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from "./firebase-bundle/firebase-firestore.js";
import { getFirebaseConfig } from "./config.js";

// Initialize Firebase with configuration from environment
let app;
let db;

// Asynchronously initialize Firebase
async function initializeFirebase() {
  try {
    const firebaseConfig = await getFirebaseConfig();
    console.log('Initializing Firebase with config from environment');
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return { app, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Initialize Firebase immediately
const firebaseInitPromise = initializeFirebase();

// Sample student data with 10 students and comprehensive information


/**
 * Initializes the Firebase database with sample student data
 */
async function initializeDatabase() {
  try {
    // Wait for Firebase to initialize first
    const { app, db } = await firebaseInitPromise;
    
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
    return { success: true, message: "Database initialized successfully!" };
  } catch (error) {
    console.error("Error initializing database:", error);
    return { success: false, message: `Error: ${error.message}` };
  }
}

// Run the initialization
initializeDatabase();
