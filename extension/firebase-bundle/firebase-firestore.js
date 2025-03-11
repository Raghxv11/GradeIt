// Simplified Firestore implementation for Chrome Extensions
import { getApp } from './firebase-app.js';

// In-memory database for demo/fallback purposes
const inMemoryDb = {
  students: []
};

// Firestore class
export function getFirestore(app) {
  console.log('Firestore initialized for app:', app?.name || 'default');
  return {
    app: app || getApp(),
    name: 'firestore'
  };
}

// Collection reference
export function collection(db, collectionPath) {
  console.log(`Getting collection reference: ${collectionPath}`);
  return {
    path: collectionPath,
    id: collectionPath.split('/').pop(),
    db: db
  };
}

// Document reference
export function doc(db, collectionPath, docId) {
  const path = docId ? `${collectionPath}/${docId}` : collectionPath;
  console.log(`Getting document reference: ${path}`);
  return {
    path: path,
    id: path.split('/').pop(),
    db: db
  };
}

// Get documents
export async function getDocs(collectionRef) {
  console.log(`Getting documents from collection: ${collectionRef.path}`);
  
  try {
    // Try to fetch from real Firestore if available
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/gradify-extension/databases/(default)/documents/${collectionRef.path}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        docs: (data.documents || []).map(doc => ({
          id: doc.name.split('/').pop(),
          data: () => convertFirestoreDataToJS(doc.fields),
          exists: true
        })),
        size: data.documents?.length || 0
      };
    } else {
      console.warn('Falling back to in-memory database');
      // Fallback to in-memory database
      return {
        docs: inMemoryDb[collectionRef.path] || [],
        size: inMemoryDb[collectionRef.path]?.length || 0
      };
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    // Fallback to in-memory database
    return {
      docs: inMemoryDb[collectionRef.path] || [],
      size: inMemoryDb[collectionRef.path]?.length || 0
    };
  }
}

// Add document
export async function addDoc(collectionRef, data) {
  console.log(`Adding document to collection: ${collectionRef.path}`, data);
  
  try {
    // Try to add to real Firestore if available
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/gradify-extension/databases/(default)/documents/${collectionRef.path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: convertJSToFirestoreData(data)
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        id: result.name.split('/').pop(),
        path: result.name
      };
    } else {
      console.warn('Falling back to in-memory database for addDoc');
      // Fallback to in-memory database
      const docId = Math.random().toString(36).substring(2, 15);
      if (!inMemoryDb[collectionRef.path]) {
        inMemoryDb[collectionRef.path] = [];
      }
      inMemoryDb[collectionRef.path].push({
        id: docId,
        data: () => data,
        exists: true
      });
      return {
        id: docId,
        path: `${collectionRef.path}/${docId}`
      };
    }
  } catch (error) {
    console.error('Error adding document:', error);
    // Fallback to in-memory database
    const docId = Math.random().toString(36).substring(2, 15);
    if (!inMemoryDb[collectionRef.path]) {
      inMemoryDb[collectionRef.path] = [];
    }
    inMemoryDb[collectionRef.path].push({
      id: docId,
      data: () => data,
      exists: true
    });
    return {
      id: docId,
      path: `${collectionRef.path}/${docId}`
    };
  }
}

// Delete document
export async function deleteDoc(docRef) {
  console.log(`Deleting document: ${docRef.path}`);
  
  try {
    // Try to delete from real Firestore if available
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/gradify-extension/databases/(default)/documents/${docRef.path}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      return true;
    } else {
      console.warn('Falling back to in-memory database for deleteDoc');
      // Fallback to in-memory database
      const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
      const docId = docRef.path.split('/').pop();
      
      if (inMemoryDb[collectionPath]) {
        inMemoryDb[collectionPath] = inMemoryDb[collectionPath].filter(doc => doc.id !== docId);
      }
      return true;
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    // Fallback to in-memory database
    const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
    const docId = docRef.path.split('/').pop();
    
    if (inMemoryDb[collectionPath]) {
      inMemoryDb[collectionPath] = inMemoryDb[collectionPath].filter(doc => doc.id !== docId);
    }
    return true;
  }
}

// Helper functions for data conversion
function convertFirestoreDataToJS(fields) {
  if (!fields) return {};
  
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      result[key] = parseInt(value.integerValue, 10);
    } else if (value.doubleValue !== undefined) {
      result[key] = value.doubleValue;
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue;
    } else if (value.mapValue !== undefined) {
      result[key] = convertFirestoreDataToJS(value.mapValue.fields);
    } else if (value.arrayValue !== undefined) {
      result[key] = (value.arrayValue.values || []).map(item => {
        if (item.stringValue !== undefined) return item.stringValue;
        if (item.integerValue !== undefined) return parseInt(item.integerValue, 10);
        if (item.doubleValue !== undefined) return item.doubleValue;
        if (item.booleanValue !== undefined) return item.booleanValue;
        if (item.mapValue !== undefined) return convertFirestoreDataToJS(item.mapValue.fields);
        return null;
      });
    }
  }
  return result;
}

function convertJSToFirestoreData(data) {
  if (!data) return {};
  
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        result[key] = { integerValue: value.toString() };
      } else {
        result[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      result[key] = { booleanValue: value };
    } else if (value === null || value === undefined) {
      result[key] = { nullValue: null };
    } else if (Array.isArray(value)) {
      result[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') {
              if (Number.isInteger(item)) {
                return { integerValue: item.toString() };
              } else {
                return { doubleValue: item };
              }
            }
            if (typeof item === 'boolean') return { booleanValue: item };
            if (item === null || item === undefined) return { nullValue: null };
            if (typeof item === 'object') return { mapValue: { fields: convertJSToFirestoreData(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof value === 'object') {
      result[key] = { mapValue: { fields: convertJSToFirestoreData(value) } };
    }
  }
  return result;
}
