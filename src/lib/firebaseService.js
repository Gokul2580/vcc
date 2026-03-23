import { 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo,
  onValue,
  push 
} from 'firebase/database';
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { database, storage } from './firebase';

// ==================== Realtime Database Operations ====================

export const firebaseDB = {
  // Create/Set data
  set: async (path, data) => {
    try {
      await set(ref(database, path), data);
      return { success: true, data };
    } catch (error) {
      console.error('Firebase set error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get data once
  get: async (path) => {
    try {
      const snapshot = await get(ref(database, path));
      return snapshot.val();
    } catch (error) {
      console.error('Firebase get error:', error);
      return null;
    }
  },

  // Update data
  update: async (path, updates) => {
    try {
      await update(ref(database, path), updates);
      return { success: true };
    } catch (error) {
      console.error('Firebase update error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete data
  delete: async (path) => {
    try {
      await remove(ref(database, path));
      return { success: true };
    } catch (error) {
      console.error('Firebase delete error:', error);
      return { success: false, error: error.message };
    }
  },

  // Listen to realtime updates
  onSnapshot: (path, callback) => {
    const dbRef = ref(database, path);
    return onValue(dbRef, (snapshot) => {
      callback(snapshot.val());
    });
  },

  // Query data
  query: async (path, childPath, value) => {
    try {
      const q = query(
        ref(database, path),
        orderByChild(childPath),
        equalTo(value)
      );
      const snapshot = await get(q);
      return snapshot.val();
    } catch (error) {
      console.error('Firebase query error:', error);
      return null;
    }
  },

  // Push new data (auto-generated key)
  push: async (path, data) => {
    try {
      const newRef = push(ref(database, path), data);
      return { success: true, key: newRef.key, ref: newRef };
    } catch (error) {
      console.error('Firebase push error:', error);
      return { success: false, error: error.message };
    }
  }
};

// ==================== Storage Operations ====================

export const firebaseStorage = {
  // Upload file
  upload: async (path, file) => {
    try {
      const fileRef = storageRef(storage, path);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
    } catch (error) {
      console.error('Firebase upload error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get download URL
  getDownloadURL: async (path) => {
    try {
      const url = await getDownloadURL(storageRef(storage, path));
      return url;
    } catch (error) {
      console.error('Firebase getDownloadURL error:', error);
      return null;
    }
  },

  // Delete file
  delete: async (path) => {
    try {
      await deleteObject(storageRef(storage, path));
      return { success: true };
    } catch (error) {
      console.error('Firebase delete error:', error);
      return { success: false, error: error.message };
    }
  }
};

// ==================== Helper Functions ====================

// Create a project in Firebase
export const createProject = async (userId, projectData) => {
  const result = await firebaseDB.push(`/users/${userId}/projects`, {
    ...projectData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return result;
};

// Get all projects for a user
export const getUserProjects = async (userId) => {
  const projects = await firebaseDB.get(`/users/${userId}/projects`);
  if (!projects) return [];
  return Object.entries(projects).map(([id, data]) => ({ id, ...data }));
};

// Update project
export const updateProject = async (userId, projectId, updates) => {
  return firebaseDB.update(`/users/${userId}/projects/${projectId}`, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

// Delete project
export const deleteProject = async (userId, projectId) => {
  return firebaseDB.delete(`/users/${userId}/projects/${projectId}`);
};

// Upload media asset
export const uploadMediaAsset = async (userId, projectId, file) => {
  const filename = `${Date.now()}-${file.name}`;
  const path = `users/${userId}/projects/${projectId}/media/${filename}`;
  
  const uploadResult = await firebaseStorage.upload(path, file);
  
  if (uploadResult.success) {
    // Save metadata to database
    const assetData = {
      name: file.name,
      type: file.type,
      size: file.size,
      url: uploadResult.url,
      storagePath: uploadResult.path,
      uploadedAt: new Date().toISOString()
    };
    
    const dbResult = await firebaseDB.push(
      `/users/${userId}/projects/${projectId}/assets`,
      assetData
    );
    
    if (dbResult.success) {
      return { success: true, assetId: dbResult.key, ...assetData };
    }
  }
  
  return uploadResult;
};

// Get project assets
export const getProjectAssets = async (userId, projectId) => {
  const assets = await firebaseDB.get(`/users/${userId}/projects/${projectId}/assets`);
  if (!assets) return [];
  return Object.entries(assets).map(([id, data]) => ({ id, ...data }));
};

// Save timeline
export const saveTimeline = async (userId, projectId, timelineData) => {
  return firebaseDB.set(
    `/users/${userId}/projects/${projectId}/timeline`,
    {
      ...timelineData,
      updatedAt: new Date().toISOString()
    }
  );
};

// Get timeline
export const getTimeline = async (userId, projectId) => {
  return firebaseDB.get(`/users/${userId}/projects/${projectId}/timeline`);
};
