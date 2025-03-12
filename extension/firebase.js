// Import the functions you need from our local Firebase bundle
import { initializeApp } from "./firebase-bundle/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "./firebase-bundle/firebase-firestore.js";
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

/**
 * Saves grading results to Firebase Firestore
 * @param {Object} result - The result object from the grading server
 * @param {Array<string>} assignmentUrls - The URLs of the assignments that were graded
 * @returns {Promise<string>} A promise that resolves to the ID of the created document
 */
export async function saveGradingResult(result, assignmentUrls) {
  try {
    // Validate inputs
    if (!result || typeof result !== 'object') {
      console.warn('Invalid result object provided to saveGradingResult');
      result = result || {}; // Ensure we have at least an empty object
    }
    
    if (!Array.isArray(assignmentUrls)) {
      console.warn('Invalid assignmentUrls provided to saveGradingResult');
      assignmentUrls = assignmentUrls ? [assignmentUrls] : []; // Convert to array or use empty array
    }
    
    // Wait for Firebase to initialize if it hasn't already
    await firebaseInitPromise;
    
    // Create a new document in the 'results' collection
    const resultsCollection = collection(db, "results");
    
    // Prepare the data to save
    const resultData = {
      ...result,
      assignmentUrls,
      createdAt: new Date().toISOString(),
      meta: {
        savedFrom: 'extension',
        version: '1.0'
      }
    };
    
    // Add the document to the collection
    const docRef = await addDoc(resultsCollection, resultData);
    console.log("Grading result saved to Firebase with ID:", docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("Error saving grading result to Firebase:", error);
    // Return a placeholder ID instead of throwing to prevent disruption
    return 'error-saving-' + Date.now();
  }
}

export { db };
