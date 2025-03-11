/**
 * Environment Variable Loader for Chrome Extensions
 * 
 * This module provides a secure way to load environment variables in Chrome extensions
 * by reading from a .env file and storing values in chrome.storage.local.
 */

/**
 * Loads environment variables from .env file and stores them in chrome.storage.local
 * @returns {Promise<Object>} The loaded environment variables
 */
export async function loadEnvironmentVariables() {
  try {
    // Try to load from chrome.storage.local first
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get('environmentVariables', async (result) => {
          if (result.environmentVariables) {
            console.log('Environment variables loaded from chrome.storage');
            resolve(result.environmentVariables);
          } else {
            // If not in storage, try to load from .env file
            const envVars = await loadFromEnvFile();
            if (Object.keys(envVars).length > 0) {
              // Save to chrome.storage for future use
              chrome.storage.local.set({ environmentVariables: envVars });
              console.log('Saved environment variables to chrome.storage');
            }
            resolve(envVars);
          }
        });
      });
    } else {
      // If chrome.storage is not available, just load from .env
      return loadFromEnvFile();
    }
  } catch (error) {
    console.error('Error loading environment variables:', error);
    return {};
  }
}

/**
 * Loads environment variables from .env file
 * @returns {Promise<Object>} The loaded environment variables
 */
async function loadFromEnvFile() {
  try {
    const response = await fetch('/.env');
    if (!response.ok) {
      console.warn('Failed to load .env file, using default environment');
      return {};
    }
    
    const text = await response.text();
    const envVars = {};
    
    // Parse .env file
    text.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        envVars[key.trim()] = value;
      }
    });
    
    console.log('Environment variables loaded from .env file');
    return envVars;
  } catch (error) {
    console.error('Error parsing .env file:', error);
    return {};
  }
}

/**
 * Gets a specific environment variable
 * @param {string} key - The environment variable key
 * @param {any} defaultValue - Default value if the key doesn't exist
 * @returns {Promise<any>} The environment variable value or default value
 */
export async function getEnv(key, defaultValue = '') {
  const envVars = await loadEnvironmentVariables();
  return envVars[key] || defaultValue;
}

/**
 * Sets an environment variable in chrome.storage
 * @param {string} key - The environment variable key
 * @param {any} value - The value to set
 * @returns {Promise<void>}
 */
export async function setEnv(key, value) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get('environmentVariables', (result) => {
        const envVars = result.environmentVariables || {};
        envVars[key] = value;
        
        chrome.storage.local.set({ environmentVariables: envVars }, () => {
          console.log(`Environment variable ${key} updated`);
          resolve();
        });
      });
    });
  } else {
    console.warn('chrome.storage not available, cannot set environment variable');
    return Promise.resolve();
  }
}
