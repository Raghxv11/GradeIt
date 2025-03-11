// Import the functions you need from our local Firebase bundle
import { initializeApp } from "./firebase-bundle/firebase-app.js";
import { getFirestore, collection, getDocs } from "./firebase-bundle/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
