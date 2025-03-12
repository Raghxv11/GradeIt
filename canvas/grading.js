import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

async function fetchStudentData() {
  try {
    const studentsCollection = collection(db, "students");
    const studentSnapshot = await getDocs(studentsCollection);
    
    if (studentSnapshot.empty) {
      document.querySelector('.gradebook-table tbody').innerHTML = 
        '<tr><td colspan="5" style="text-align: center;">No student data available</td></tr>';
      return;
    }
    
    const students = studentSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    
    updateGradebookUI(students);
  } catch (error) {
    document.querySelector('.gradebook-table tbody').innerHTML = 
      '<tr><td colspan="5" style="text-align: center;">Error loading student data</td></tr>';
  }
}

function updateGradebookUI(students) {
  const tableBody = document.querySelector('.gradebook-table tbody');
  tableBody.innerHTML = '';
  
  students.forEach(student => {
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.className = 'student-name';
    nameCell.textContent = student.name;
    row.appendChild(nameCell);
    
    const finalExamCell = document.createElement('td');
    finalExamCell.textContent = student.finalProject !== 0 ? student.finalProject.toString() : 'N/A';
    row.appendChild(finalExamCell);
    
    const assignment1Cell = document.createElement('td');
    assignment1Cell.textContent = student.assignments?.assignment1 !== undefined ? 
      student.assignments.assignment1.toString() : 'N/A';
    if (student.highlighted === "assignment1") {
      assignment1Cell.className = 'highlighted';
    }
    row.appendChild(assignment1Cell);
    
    const assignment2Cell = document.createElement('td');
    assignment2Cell.textContent = student.assignments?.assignment2 !== undefined ? 
      student.assignments.assignment2.toString() : 'N/A';
    if (student.highlighted === "assignment2") {
      assignment2Cell.className = 'highlighted';
    }
    row.appendChild(assignment2Cell);
    
    const assignment3Cell = document.createElement('td');
    assignment3Cell.textContent = student.assignments?.assignment3 !== undefined ? 
      student.assignments.assignment3.toString() : 'N/A';
    if (student.highlighted === "assignment3") {
      assignment3Cell.className = 'highlighted';
    }
    row.appendChild(assignment3Cell);
    
    tableBody.appendChild(row);
  });
}

function setupSearchFunctionality() {
  const studentSearch = document.querySelector('.student-names input');
  
  studentSearch.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('.gradebook-table tbody tr');
    
    rows.forEach(row => {
      const studentName = row.querySelector('.student-name')?.textContent.toLowerCase();
      if (studentName && studentName.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
  
  const filterButton = document.querySelector('.filter-button');
  filterButton.addEventListener('click', function() {
    alert('Filter functionality would be implemented here');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  fetchStudentData();
  setupSearchFunctionality();
});

window.addEventListener('unhandledrejection', function(event) {
});