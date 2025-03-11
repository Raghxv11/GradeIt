// Import the functions you need from our local Firebase bundle
import { initializeApp } from "./firebase-bundle/firebase-app.js";
import { getFirestore, collection, getDocs } from "./firebase-bundle/firebase-firestore.js";
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

/**
 * Fetches student data from Firebase Firestore
 * @returns {Promise<Array<Student>>} A promise that resolves to an array of student objects
 */
export async function getStudents() {
  try {
    const studentsCollection = collection(db, "students");
    const studentSnapshot = await getDocs(studentsCollection);
    const studentList = studentSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        name: data.name || "Unknown Student",
        email: data.email,
        major: data.major,
        year: data.year,
        assignments: data.assignments || {
          assignment1: 0,
          assignment2: 0,
          assignment3: 0
        },
        finalProject: data.finalProject || 0,
        attendance: data.attendance,
        participation: data.participation,
        notes: data.notes
      };
    });
    console.log("Retrieved students:", studentList);
    return studentList;
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
}

export { db };
