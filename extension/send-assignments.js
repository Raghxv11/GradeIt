/**
 * Utility module for sending assignment URLs to the grading server
 */

// Import Firebase functions
import { saveGradingResult } from './firebase.js';

// Server endpoint for grading
const SERVER_ENDPOINT = 'https://2c53-129-219-21-203.ngrok-free.app/api/grade/automate';

/**
 * Sends assignment URLs to the server for grading
 * @param {string[]} assignmentUrls - Array of assignment URLs to send
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<string>} - A promise that resolves to the result URL
 */
export async function sendAssignmentUrls(assignmentUrls, progressCallback = null) {
  try {
    console.log('Preparing to send assignment URLs to server:', assignmentUrls);
    
    // Create payload with assignment URLs in the format expected by the server
    // The server expects a 'files' array containing the URLs directly
    const payload = {
      files: assignmentUrls,
      question: `Compose a 1500-2000 word critical analysis of a piece of published nonfiction writing where writers are taking risks. The types of risks may include addressing controversial topics; taking a non-dominant or unpopular perspective; or using unconventional writing features, including vocabulary, style, language variety, genre or visual design. You will choose one outside source that exemplifies a writer taking a risk, and you will complete a summary, analysis, and response to this source in essay format. Overall, you will analyze the effect of this risk taking: Does it make sense considering the author’s purpose, audience or genre? Or, does it fall into the “crazy” category?`,
rubric:'https://assignmentfil.s3.us-west-2.amazonaws.com/Project_2_Rubric+(2).pdf'
    };
    
    // Track progress
    let progress = 0;
    const totalSteps = assignmentUrls.length + 1; // Processing + Finalizing
    
    // Update progress if callback provided
    const updateProgress = (step = 1) => {
      progress += step;
      const percent = (progress / totalSteps) * 100;
      if (progressCallback) {
        progressCallback(Math.min(percent, 100), `Processing assignments (${progress}/${totalSteps})`);
      }
    };
    
    // Process each URL (in a real implementation, this could involve validating URLs)
    for (let i = 0; i < assignmentUrls.length; i++) {
      console.log(`Processing assignment URL ${i + 1}/${assignmentUrls.length}: ${assignmentUrls[i]}`);
      
      // In a real implementation, you might want to check if URLs are accessible
      // await fetch(assignmentUrls[i], { method: 'HEAD' });
      
      // Update progress after each URL is processed
      updateProgress();
    }
    
    console.log('All assignment URLs processed, sending to server with payload:', payload);
    
    // Create a FormData object for multipart/form-data request
    const formData = new FormData();
    
    // Add the question and rubric to the form data
    formData.append('question', payload.question);
    formData.append('rubric', payload.rubric);
    
    // Add each file URL as a separate form field with the same key
    payload.files.forEach(url => {
      formData.append('files', url);
    });
    
    console.log('Sending multipart/form-data request to server');
    
    // Send the formData to the server
    const response = await fetch(SERVER_ENDPOINT, {
      method: 'POST',
      // No need to set Content-Type header, the browser will set it automatically with the boundary
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with status: ${response.status}. Details: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Server response:', result);
    
    // Save the result to Firebase
    const resultId = await saveGradingResult(result, assignmentUrls);
    if (resultId.startsWith('error-saving-')) {
      console.warn('There was an issue saving the result to Firebase, but processing will continue');
    } else {
      console.log('Successfully saved grading result to Firebase with ID:', resultId);
      // Add the resultId to the result object for reference
      result.firestoreId = resultId;
    }
    
    // Return the result URL from the server or construct a default one
    return result.resultUrl || result.url || `${SERVER_ENDPOINT.replace('/api/grade/automate', '/results/')}`;
  } catch (error) {
    console.error('Error sending assignment URLs to server:', error);
    throw error;
  }
}

/**
 * Sends a predefined set of assignment URLs to the server
 * This is a convenience function for quickly sending the standard set of assignments
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<string>} - A promise that resolves to the result URL
 */
export async function sendStandardAssignments(progressCallback = null) {
  const standardAssignmentUrls = [
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+1.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+2.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+3.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+4.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+5.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+6.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+7.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+8.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+9.pdf',
    'https://assignmentfil.s3.us-west-2.amazonaws.com/student+10.pdf'
  ];
  
  return sendAssignmentUrls(standardAssignmentUrls, progressCallback);
}
