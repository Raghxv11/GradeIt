import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACLvunRNHz5Ja7iJagI3ri4DJ4F-lu3d8",
  authDomain: "gradify-extension.firebaseapp.com",
  projectId: "gradify-extension",
  storageBucket: "gradify-extension.firebasestorage.app",
  messagingSenderId: "915234556406",
  appId: "1:915234556406:web:b991375217736ef0c4dfd7",
  measurementId: "G-5Q502T1HF5"
};

console.log("Initializing Firebase with config:", firebaseConfig);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
console.log("Firebase initialized successfully");

async function fetchStudentData() {
  console.log("Starting fetchStudentData()");
  try {
    console.log("Creating reference to students collection");
    const studentsCollection = collection(db, "students");
    
    console.log("Fetching documents from students collection...");
    console.time("Firebase getDocs");
    const studentSnapshot = await getDocs(studentsCollection);
    console.timeEnd("Firebase getDocs");
    
    console.log("Firebase response received:", studentSnapshot);
    console.log("Number of documents:", studentSnapshot.size);
    
    if (studentSnapshot.empty) {
      console.warn("No student records found in Firebase");
      document.querySelector('.gradebook-table tbody').innerHTML = 
        '<tr><td colspan="5" style="text-align: center;">No student data available</td></tr>';
      return;
    }
    
    console.log("Processing student documents...");
    const students = studentSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Document ID: ${doc.id}, Data:`, data);
      return {
        id: doc.id,
        ...data
      };
    });
    
    console.log("All student data processed:", students);
    updateGradebookUI(students);
  } catch (error) {
    console.error("Error fetching student data:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    document.querySelector('.gradebook-table tbody').innerHTML = 
      '<tr><td colspan="5" style="text-align: center;">Error loading student data</td></tr>';
  }
}

function updateGradebookUI(students) {
  console.log("Starting updateGradebookUI with", students.length, "students");
  const tableBody = document.querySelector('.gradebook-table tbody');
  tableBody.innerHTML = '';
  
  students.forEach(student => {
    console.log("Processing student for UI:", student);
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.className = 'student-name';
    nameCell.textContent = student.name;
    row.appendChild(nameCell);
    
    const finalExamCell = document.createElement('td');
    finalExamCell.textContent = student.finalProject !== undefined ? student.finalProject.toString() : 'N/A';
    console.log(`Student ${student.name} - Final Exam: ${finalExamCell.textContent}`);
    row.appendChild(finalExamCell);
    
    const assignment1Cell = document.createElement('td');
    assignment1Cell.textContent = student.assignments?.assignment1 !== undefined ? 
      student.assignments.assignment1.toString() : 'N/A';
    if (student.highlighted === "assignment1") {
      assignment1Cell.className = 'highlighted';
      console.log(`Student ${student.name} - Assignment 1 is highlighted`);
    }
    console.log(`Student ${student.name} - Assignment 1: ${assignment1Cell.textContent}`);
    row.appendChild(assignment1Cell);
    
    const assignment2Cell = document.createElement('td');
    assignment2Cell.textContent = student.assignments?.assignment2 !== undefined ? 
      student.assignments.assignment2.toString() : 'N/A';
    if (student.highlighted === "assignment2") {
      assignment2Cell.className = 'highlighted';
      console.log(`Student ${student.name} - Assignment 2 is highlighted`);
    }
    console.log(`Student ${student.name} - Assignment 2: ${assignment2Cell.textContent}`);
    row.appendChild(assignment2Cell);
    
    const assignment3Cell = document.createElement('td');
    assignment3Cell.textContent = student.assignments?.assignment3 !== undefined ? 
      student.assignments.assignment3.toString() : 'N/A';
    if (student.highlighted === "assignment3") {
      assignment3Cell.className = 'highlighted';
      console.log(`Student ${student.name} - Assignment 3 is highlighted`);
    }
    console.log(`Student ${student.name} - Assignment 3: ${assignment3Cell.textContent}`);
    row.appendChild(assignment3Cell);
    
    tableBody.appendChild(row);
  });
  
  console.log("UI update complete");
}

function setupSearchFunctionality() {
  console.log("Setting up search functionality");
  const studentSearch = document.querySelector('.student-names input');
  
  studentSearch.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    console.log("Search term:", searchTerm);
    
    const rows = document.querySelectorAll('.gradebook-table tbody tr');
    console.log("Number of rows to filter:", rows.length);
    
    let matchCount = 0;
    rows.forEach(row => {
      const studentName = row.querySelector('.student-name')?.textContent.toLowerCase();
      if (studentName && studentName.includes(searchTerm)) {
        row.style.display = '';
        matchCount++;
      } else {
        row.style.display = 'none';
      }
    });
    
    console.log(`Search results: ${matchCount} matches found`);
  });
  
  const filterButton = document.querySelector('.filter-button');
  filterButton.addEventListener('click', function() {
    console.log("Filter button clicked");
    alert('Filter functionality would be implemented here');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded");
  
  console.log("Starting data fetch process");
  fetchStudentData();
  
  setupSearchFunctionality();
  
  console.log("Initialization complete");
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});