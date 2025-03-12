// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);

// Function to get a result by ID
export async function getResultById(id: string) {
  try {
    const docRef = doc(db, "results", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data().response);
      
      // Get the response data
      const responseData = docSnap.data().response;
      
      // Check if we have a response string that needs to be parsed
      if (typeof responseData === 'string') {
        // Split the response by "Response for" to get individual student responses
        const studentResponses = responseData.split(/Response for (?=student\d+\.pdf:)/);
        
        // Filter out any empty strings and process each response
        const results = studentResponses
          .filter(response => response.trim().length > 0)
          .map(response => {
            // Extract the filename from the response
            const filenameMatch = response.match(/^(student\d+\.pdf):/);
            const fileName = filenameMatch ? filenameMatch[1] : "Unknown";
            
            // Return the formatted result
            return {
              fileName,
              content: `Response for ${response.trim()}`
            };
          });
        
        // Create visualization data from the first result if available
        let visualizationData = null;
        if (results.length > 0) {
          const firstResponse = results[0].content;
          
          // Extract criteria, grades, and percentages
          const criteria = [];
          
          // Try multiple regex patterns to match criteria
          const criteriaPatterns = [
            /\*\s+\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/g,  // Format: * **Content:** 52/60
            /•\s+([^:]+):\s+(\d+)\/(\d+)/g,           // Format: • Content: 52/60
            /\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/g        // Format: **Content:** 52/60
          ];
          
          // Create a copy of the string for regex operations
          const responseCopy = firstResponse.toString();
          
          // Try each pattern until we find matches
          for (const pattern of criteriaPatterns) {
            let match;
            while ((match = pattern.exec(responseCopy)) !== null) {
              criteria.push({
                criteria: match[1].trim(),
                scored: parseInt(match[2]),
                total: parseInt(match[3])
              });
            }
            
            // If we found criteria with this pattern, stop trying other patterns
            if (criteria.length > 0) {
              break;
            }
          }
          
          // Extract percentage grade using multiple patterns
          const percentagePatterns = [
            /\*\*Total Percentage Grade:\*\*\s+([\d\.]+)%/,
            /Total Percentage Grade:\s+([\d\.]+)%/
          ];
          
          let percentageGrade = 0;
          for (const pattern of percentagePatterns) {
            const match = responseCopy.match(pattern);
            if (match) {
              percentageGrade = parseFloat(match[1]);
              break;
            }
          }
          
          // Extract letter grade using multiple patterns
          const letterPatterns = [
            /\*\*Letter Grade:\*\*\s+([A-F][+-]?)/,
            /Letter Grade:\s+([A-F][+-]?)/
          ];
          
          let letterGrade = "";
          for (const pattern of letterPatterns) {
            const match = responseCopy.match(pattern);
            if (match) {
              letterGrade = match[1];
              break;
            }
          }
          
          // Create visualization data if we have criteria
          if (criteria.length > 0) {
            visualizationData = {
              criteria,
              percentage_grade: percentageGrade,
              letter_grade: letterGrade
            };
          }
        }
        
        // Return the formatted data
        return {
          results,
          visualizationData,
          ...docSnap.data()
        };
      }
      
      return docSnap.data();
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error getting document:", error);
    throw error;
  }
}

// Function to get all results
export async function getAllResults() {
  try {
    const querySnapshot = await getDocs(collection(db, "results"));
    const results: any[] = [];
    
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return results;
  } catch (error) {
    console.error("Error getting documents:", error);
    throw error;
  }
}

// Function to update a result by ID
export async function updateResultById(id: string, data: any) {
  try {
    console.log(`Updating document with ID: ${id}`);
    console.log('Update data:', data);
    
    const docRef = doc(db, "results", id);
    
    // Add a timestamp for the update
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    console.log('Document successfully updated');
    return true;
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
}

// Function to get a student by name
export async function getStudentByName(name: string) {
  try {
    console.log(`Searching for student with name: ${name}`);
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("id", "==", name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Return the first matching student
      const studentDoc = querySnapshot.docs[0];
      return {
        id: studentDoc.id,
        ...studentDoc.data()
      };
    } else {
      console.log(`No student found with name: ${name}`);
      return null;
    }
  } catch (error) {
    console.error("Error getting student:", error);
    throw error;
  }
}

// Function to update a student's finalProject grade
export async function updateStudentGrade(studentId: string, grade: number) {
  try {
    console.log(`Updating grade for student ID: ${studentId}`);
    console.log(`New grade: ${grade}`);
    //find the student by the name in the students collection
    const studentRef = collection(db, "students");
    const q = query(studentRef, where("id", "==", studentId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const studentDoc = querySnapshot.docs[0];
      const studentRef = doc(db, "students", studentDoc.id);
      // Update the finalProject field with the grade
      await updateDoc(studentRef, {
        finalProject: grade,
        updatedAt: serverTimestamp()
      });
      console.log('Student grade successfully updated');
      return true;
    } else {
      console.log(`No student found with ID: ${studentId}`);
      return false;
    }
  } catch (error) {
    console.error("Error updating student grade:", error);
    throw error;
  }
}

export { app, db }; 