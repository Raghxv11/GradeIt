/**
 * Configuration loader for GradeIt extension
 * Loads environment variables from .env file or chrome.storage using env-loader
 */
import { getEnv } from './env-loader.js';

// Default Firebase configuration (used as fallback)
const defaultFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

/**
 * Gets the Firebase configuration from environment variables
 * @returns {Promise<Object>} The Firebase configuration
 */
export async function getFirebaseConfig() {
  try {
    // Load Firebase configuration from environment variables
    const config = {
      apiKey: await getEnv('FIREBASE_API_KEY', defaultFirebaseConfig.apiKey),
      authDomain: await getEnv('FIREBASE_AUTH_DOMAIN', defaultFirebaseConfig.authDomain),
      projectId: await getEnv('FIREBASE_PROJECT_ID', defaultFirebaseConfig.projectId),
      storageBucket: await getEnv('FIREBASE_STORAGE_BUCKET', defaultFirebaseConfig.storageBucket),
      messagingSenderId: await getEnv('FIREBASE_MESSAGING_SENDER_ID', defaultFirebaseConfig.messagingSenderId),
      appId: await getEnv('FIREBASE_APP_ID', defaultFirebaseConfig.appId),
      measurementId: await getEnv('FIREBASE_MEASUREMENT_ID', defaultFirebaseConfig.measurementId)
    };
    
    // Validate that we have at least the required Firebase config properties
    if (!config.apiKey || !config.projectId) {
      console.warn('Missing required Firebase configuration. Check your .env file.');
    }
    
    return config;
  } catch (error) {
    console.error('Error loading Firebase configuration:', error);
    return defaultFirebaseConfig;
  }
}
