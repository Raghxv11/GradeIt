/**
 * Demo script for sending assignment URLs to the server
 * 
 * This script demonstrates how to use the send-assignments.js module
 * to send a batch of assignment URLs to the grading server.
 */

import { sendAssignmentUrls, sendStandardAssignments } from './send-assignments.js';

// DOM elements for the demo UI
let progressBar;
let progressText;
let resultContainer;

/**
 * Initialize the demo UI
 */
function initializeUI() {
  // Create UI elements if they don't exist
  if (!document.getElementById('assignment-sender-container')) {
    const container = document.createElement('div');
    container.id = 'assignment-sender-container';
    container.style.cssText = 'font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
    
    container.innerHTML = `
      <h2 style="color: #333; margin-top: 0;">Assignment Sender</h2>
      <div id="progress-container" style="margin: 20px 0;">
        <div id="progress-text">Ready to send assignments</div>
        <div style="background: #eee; height: 20px; border-radius: 10px; margin-top: 10px; overflow: hidden;">
          <div id="progress-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s;"></div>
        </div>
      </div>
      <button id="send-btn" style="background: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">Send Standard Assignments</button>
      <div id="result-container" style="margin-top: 20px; display: none;"></div>
    `;
    
    document.body.appendChild(container);
  }
  
  // Get references to UI elements
  progressBar = document.getElementById('progress-bar');
  progressText = document.getElementById('progress-text');
  resultContainer = document.getElementById('result-container');
  const sendButton = document.getElementById('send-btn');
  
  // Add event listener to the send button
  sendButton.addEventListener('click', handleSendButtonClick);
}

/**
 * Handle the send button click event
 */
async function handleSendButtonClick() {
  try {
    // Reset UI
    progressBar.style.width = '0%';
    progressText.textContent = 'Sending assignments...';
    resultContainer.style.display = 'none';
    
    // Disable the button while sending
    const sendButton = document.getElementById('send-btn');
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    // Send the standard assignments with progress updates
    const resultUrl = await sendStandardAssignments((percent, message) => {
      progressBar.style.width = `${percent}%`;
      progressText.textContent = message;
    });
    
    // Display the result
    resultContainer.innerHTML = `
      <div style="padding: 15px; background: #e8f5e9; border-radius: 4px; margin-top: 20px;">
        <h3 style="margin-top: 0; color: #2e7d32;">Assignments Sent Successfully!</h3>
        <p>The grading server is processing your assignments. You can view the results here:</p>
        <a href="${resultUrl}" target="_blank" style="color: #2e7d32; text-decoration: underline;">${resultUrl}</a>
      </div>
    `;
    resultContainer.style.display = 'block';
    
    // Re-enable the button
    sendButton.disabled = false;
    sendButton.textContent = 'Send Standard Assignments';
    
    console.log('Assignments sent successfully. Result URL:', resultUrl);
  } catch (error) {
    // Handle errors
    console.error('Error sending assignments:', error);
    
    resultContainer.innerHTML = `
      <div style="padding: 15px; background: #ffebee; border-radius: 4px; margin-top: 20px;">
        <h3 style="margin-top: 0; color: #c62828;">Error Sending Assignments</h3>
        <p>An error occurred while sending the assignments:</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error.message}</pre>
      </div>
    `;
    resultContainer.style.display = 'block';
    
    // Re-enable the button
    const sendButton = document.getElementById('send-btn');
    sendButton.disabled = false;
    sendButton.textContent = 'Retry Sending Assignments';
  }
}

// Initialize the UI when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

// Export functions for use in other scripts
export { handleSendButtonClick };
