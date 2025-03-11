// Import Firebase functions
import { getStudents } from './firebase.js';

// Define Student interface type for TypeScript compatibility
/**
 * @typedef {Object} Student
 * @property {string} name - Student name
 * @property {string} id - Student ID
 * @property {Object} assignments - Student assignments
 * @property {number} assignments.assignment1 - Score for assignment 1
 * @property {number} assignments.assignment2 - Score for assignment 2
 * @property {number} assignments.assignment3 - Score for assignment 3
 * @property {number} [finalProject] - Optional final project score
 */

document.addEventListener('DOMContentLoaded', async function() {
  // DOM elements
  const welcomeContainer = document.getElementById('welcome-container');
  const startGradingBtn = document.getElementById('start-grading-btn');
  const statusContainer = document.getElementById('status-container');
  const filesContainer = document.getElementById('files-container');
  const resultContainer = document.getElementById('result-container');
  const progressText = document.getElementById('progress-text');
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const resultLink = document.getElementById('result-link');
  const backBtn = document.getElementById('back-btn');

  // Server endpoint for grading
  const SERVER_ENDPOINT = 'https://your-grading-server.com/api/grade';
  
  // Student data from Firebase
  let students = [];
  let studentFiles = [];
  
  // Initialize stats counters
  const statsValues = document.querySelectorAll('.stat-value');
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading student data...';
  welcomeContainer.querySelector('.welcome-content').appendChild(loadingIndicator);
  
  // Disable the start button until data is loaded
  startGradingBtn.disabled = true;
  startGradingBtn.classList.add('disabled');
  
  try {
    // Fetch students from Firebase
    students = await getStudents();
    
    // Create student files array for processing
    studentFiles = students.map(student => ({
      id: student.id,
      name: student.name,
      url: `https://example.com/assignments/${student.id.toLowerCase().replace(/ /g, '_')}_assignment.pdf`
    }));
    
    // Update stats
    if (statsValues.length >= 3) {
      statsValues[0].textContent = students.length.toString(); // Total students
      statsValues[1].textContent = studentFiles.length.toString(); // Total submissions
      statsValues[2].textContent = '0'; // Pending (all are pending initially)
    }
    
    // Remove loading indicator and enable button
    loadingIndicator.remove();
    startGradingBtn.disabled = false;
    startGradingBtn.classList.remove('disabled');
    
    console.log('Students loaded from Firebase:', students);
  } catch (error) {
    console.error('Failed to load students from Firebase:', error);
    loadingIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to load student data. Using demo data instead.';
    
    // Fallback to demo data if Firebase fails
    studentFiles = [
      { id: '001', name: 'John Smith', url: 'https://example.com/assignments/john_smith_assignment.pdf' },
      { id: '002', name: 'Emily Johnson', url: 'https://example.com/assignments/emily_johnson_assignment.pdf' },
      { id: '003', name: 'Michael Williams', url: 'https://example.com/assignments/michael_williams_assignment.pdf' },
      { id: '004', name: 'Jessica Brown', url: 'https://example.com/assignments/jessica_brown_assignment.pdf' },
      { id: '005', name: 'David Miller', url: 'https://example.com/assignments/david_miller_assignment.pdf' },
      { id: '006', name: 'Sarah Davis', url: 'https://example.com/assignments/sarah_davis_assignment.pdf' },
      { id: '007', name: 'Robert Wilson', url: 'https://example.com/assignments/robert_wilson_assignment.pdf' },
      { id: '008', name: 'Jennifer Martinez', url: 'https://example.com/assignments/jennifer_martinez_assignment.pdf' }
    ];
    
    // Update stats with demo data
    if (statsValues.length >= 3) {
      statsValues[0].textContent = studentFiles.length.toString();
      statsValues[1].textContent = studentFiles.length.toString();
      statsValues[2].textContent = '0';
    }
    
    // Enable button after a short delay
    setTimeout(() => {
      startGradingBtn.disabled = false;
      startGradingBtn.classList.remove('disabled');
    }, 1500);
  }

  // Event listener for the start grading button
  startGradingBtn.addEventListener('click', function() {
    // Hide the welcome container and show the status container
    welcomeContainer.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    // Process the student files
    processFiles(studentFiles);
  });
  
  // Event listener for the back button
  backBtn.addEventListener('click', function() {
    // Show the welcome container and hide both status and result containers
    welcomeContainer.classList.remove('hidden');
    statusContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    
    // Reset progress indicators
    progressBar.style.width = '0%';
    progressPercentage.textContent = '0%';
    progressText.textContent = 'Ready to process assignments';
    
    // Clear the files container for next run
    filesContainer.innerHTML = '';
  });

  /**
   * Updates the progress bar and percentage
   * @param {number} percent - The percentage to set (0-100)
   */
  function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressPercentage.textContent = `${Math.round(percent)}%`;
  }

  /**
   * Processes the files by sending them to the server
   * @param {Array} files - The array of files to process
   * @returns {Promise<string>} - A promise that resolves to the result URL
   */
  function processFiles(files) {
    // Clear the files container
    filesContainer.innerHTML = '';
    
    // Reset progress
    updateProgress(0);
    
    // Create file items in the UI
    files.forEach((file, index) => {
      const fileItem = createFileItem(file, index);
      filesContainer.appendChild(fileItem);
    });
    
    progressText.textContent = `Initializing grading for ${files.length} assignments...`;
    
    // Send the files to the server
    return sendFilesToServer(files);
  }

  /**
   * Creates a file item element for the UI
   * @param {Object} file - The file object with student info
   * @param {number} index - The index of the file
   * @returns {HTMLElement} - The file item element
   */
  function createFileItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = `file-${index}`;
    fileItem.dataset.studentId = file.id;
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    
    // Use student name if available, otherwise extract from URL
    let displayName = file.name || getFileNameFromUrl(file.url);
    
    fileName.textContent = displayName;
    
    const fileStatus = document.createElement('div');
    fileStatus.className = 'file-status status-pending';
    fileStatus.textContent = 'Pending';
    
    fileItem.appendChild(fileName);
    fileItem.appendChild(fileStatus);
    
    return fileItem;
  }

  /**
   * Extracts the file name from a URL
   * @param {string} url - The URL to extract the file name from
   * @returns {string} - The extracted file name
   */
  function getFileNameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return fileName || 'Unknown File';
    } catch (error) {
      return 'Unknown File';
    }
  }

  /**
   * Sends the files to the server for grading
   * @param {Array} files - The array of files to send
   * @returns {Promise<string>} - A promise that resolves to the result URL
   */
  function sendFilesToServer(files) {
    // Calculate total steps for progress tracking
    const totalSteps = files.length * 2 + 1; // Processing + Grading + Finalizing
    let completedSteps = 0;
    
    // Update progress function
    const updateProgressStep = (step) => {
      completedSteps += step;
      const percent = (completedSteps / totalSteps) * 100;
      updateProgress(Math.min(percent, 100));
    };
    
    // Simulate processing each file with delays
    const processPromises = files.map((file, index) => {
      return new Promise(resolve => {
        // Simulate processing delay
        setTimeout(() => {
          updateFileStatus(index, 'processing');
          progressText.textContent = `Processing ${file.name}'s assignment (${index + 1}/${files.length})...`;
          updateProgressStep(1);
          
          // Simulate grading delay
          setTimeout(() => {
            updateFileStatus(index, 'completed');
            progressText.textContent = `Graded ${file.name}'s assignment (${index + 1}/${files.length})`;
            updateProgressStep(1);
            resolve();
          }, 1500 + Math.random() * 1500);
        }, index * 800);
      });
    });
    
    // After all files are processed, simulate sending them to the server
    return Promise.all(processPromises)
      .then(() => {
        progressText.textContent = 'Finalizing grades and generating report...';
        updateProgressStep(1);
        
        // Simulate server request delay
        return new Promise(resolve => {
          setTimeout(() => {
            // In a real implementation, we would send the payload to the server
            const payload = {
              files: files.map(file => ({
                studentId: file.id,
                name: file.name,
                url: file.url
              }))
            };
            
            console.log('Sending payload to server:', payload);
            
            // For demo purposes, just resolve with a mock result URL
            resolve('https://your-grading-server.com/results/demo-result-123');
          }, 2000);
        });
      })
      .then(resultUrl => {
        // Display the result
        displayResult(resultUrl);
        return resultUrl;
      })
      .catch(handleError);
  }

  /**
   * Updates the status of a file in the UI
   * @param {number} index - The index of the file
   * @param {string} status - The new status ('pending', 'processing', 'completed')
   */
  function updateFileStatus(index, status) {
    const fileItem = document.getElementById(`file-${index}`);
    if (!fileItem) return;
    
    const fileStatus = fileItem.querySelector('.file-status');
    if (!fileStatus) return;
    
    // Remove all status classes
    fileStatus.classList.remove('status-pending', 'status-processing', 'status-completed');
    
    // Add the new status class
    fileStatus.classList.add(`status-${status}`);
    
    // Update the status text
    fileStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Displays the result URL in the UI
   * @param {string} resultUrl - The URL to the graded assignment
   */
  function displayResult(resultUrl) {
    // Hide the status container and show the result container
    statusContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    
    // Update the result link
    resultLink.href = resultUrl;
    
    // Make sure the back button is visible and styled correctly
    backBtn.classList.remove('hidden');
    backBtn.disabled = false;
  }

  /**
   * Handles errors that occur during processing
   * @param {Error} error - The error that occurred
   */
  function handleError(error) {
    console.error('Error:', error);
    
    // Hide the status container
    statusContainer.classList.add('hidden');
    
    // Show error in result container
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = `
      <div class="error-notice">
        <i class="fas fa-exclamation-triangle"></i>
        <span>An error occurred while processing assignments: ${error.message}</span>
      </div>
      <button id="error-back-btn" class="secondary-btn">
        <i class="fas fa-arrow-left"></i>
        Back to Dashboard
      </button>
    `;
    
    // Add event listener to the error back button
    document.getElementById('error-back-btn').addEventListener('click', function() {
      welcomeContainer.classList.remove('hidden');
      resultContainer.classList.add('hidden');
    });
  }
});
