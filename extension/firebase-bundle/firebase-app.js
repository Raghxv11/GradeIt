// Simplified Firebase App implementation for Chrome Extensions
export function initializeApp(config) {
  console.log('Firebase App initialized with config:', config);
  return {
    name: config.projectId || 'default',
    options: config
  };
}

export function getApp(name = '[DEFAULT]') {
  console.log('Getting Firebase app instance:', name);
  return {
    name: name,
    options: {}
  };
}
