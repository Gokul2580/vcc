# Firebase Integration Setup - VOXCUT

## Overview
VOXCUT has been fully integrated with Firebase for complete backend functionality including authentication, real-time database, and cloud storage.

## Firebase Configuration
Your Firebase credentials are embedded in `/src/lib/firebase.js`:

```
Project: pixiebloomsin
API Key: AIzaSyDVKJL9JYVbhiHpBut7AgmTQUUT1jVXGew
Auth Domain: pixiebloomsin.firebaseapp.com
Database URL: https://pixiebloomsin-default-rtdb.firebaseio.com
Project ID: pixiebloomsin
Storage Bucket: pixiebloomsin.firebasestorage.app
Messaging Sender ID: 928829690664
App ID: 1:928829690664:web:491e0b74f319bfa0fb361d
Measurement ID: G-N7VH1H8J47
```

## Features Implemented

### 1. Authentication
- Firebase Authentication with email/password
- Real-time auth state management
- User-specific data isolation
- Automatic logout functionality

**Files:**
- `src/lib/firebase.js` - Firebase config initialization
- `src/lib/AuthContext.jsx` - Auth context provider with real-time state

### 2. Realtime Database
- User projects storage
- Project timelines
- Asset metadata
- Organized by user ID for data isolation

**Database Structure:**
```
/users/{userId}/
  /projects/
    /{projectId}/
      /timeline - Timeline data
      /assets - Media assets metadata
```

### 3. Cloud Storage
- Video file uploads
- Audio file uploads
- Image file uploads
- Organized file structure with timestamps

**Storage Structure:**
```
users/{userId}/
  /projects/{projectId}/media/{timestamp}-{filename}
  /videos/enhancer/{timestamp}-{filename}
```

### 4. Media Upload Features

#### Video Library Uploads (MediaLibrary.jsx)
- Supports multiple file uploads (video, audio, images)
- File size validation (max 500MB)
- Real-time progress feedback
- Automatic asset metadata creation

#### Video Enhancer (VideoEnhancer.jsx)
- Single video upload for AI enhancement
- Platform selection (Instagram, YouTube, TikTok, etc.)
- Automatic project and timeline creation
- Direct navigation to editor with uploaded video

#### Project Creation (CreateProjectDialog.jsx)
- Firebase project creation
- Empty timeline initialization
- User-specific project organization

### 5. Dashboard Features (Dashboard.jsx)
- Project listing from Firebase
- Project search and filtering
- Real-time project deletion
- Project status tracking

## File Changes Summary

### Updated Files

1. **src/lib/firebase.js** - NEW
   - Firebase initialization with all services
   - Auth, Database, Storage configuration

2. **src/lib/firebaseService.js** - NEW
   - Database operations (CRUD)
   - Storage file management
   - Helper functions for projects, assets, timelines

3. **src/lib/AuthContext.jsx** - UPDATED
   - Replaced with Firebase Authentication
   - Real-time auth state tracking
   - User session management

4. **src/components/editor/MediaLibrary.jsx** - UPDATED
   - Firebase Storage file uploads
   - Firebase Database asset creation
   - File deletion with storage cleanup

5. **src/components/dashboard/CreateProjectDialog.jsx** - UPDATED
   - Firebase project creation
   - Timeline initialization in database
   - User-specific data storage

6. **src/pages/Dashboard.jsx** - UPDATED
   - Firebase project querying
   - Real-time project management
   - User-specific dashboard data

7. **src/pages/VideoEnhancer.jsx** - UPDATED
   - Firebase video upload to storage
   - Automatic project setup
   - Timeline creation with uploaded asset

8. **src/pages/Editor.jsx** - UPDATED
   - Firebase data fetching for projects, assets, timelines
   - Real-time save to Firebase
   - User-specific data isolation

9. **src/Layout.jsx** - UPDATED
   - Firebase logout integration
   - Auth context usage

10. **src/pages/Landing.jsx** - CLEANED
    - Removed obsolete db initialization

11. **package.json** - UPDATED
    - Added Firebase dependency: `"firebase": "^11.0.2"`

## Data Flow

### Project Creation
1. User fills project form
2. CreateProjectDialog creates project in `/users/{userId}/projects`
3. Empty timeline created at `/users/{userId}/projects/{projectId}/timeline`
4. User redirected to editor

### Media Upload
1. User selects files in MediaLibrary
2. Files uploaded to Firebase Storage
3. Asset metadata saved to `/users/{userId}/projects/{projectId}/assets`
4. Asset added to UI

### Video Enhancement
1. User uploads video in VideoEnhancer
2. Video uploaded to Storage
3. Project created with metadata
4. Asset created and linked
5. Timeline initialized with video clip
6. User redirected to editor

### Timeline Save
1. User makes edits in editor
2. Changes saved to `/users/{userId}/projects/{projectId}/timeline`
3. Real-time sync across components

## Security Notes

- All data is organized under `/users/{userId}/` for natural isolation
- Firebase Realtime Database can be protected with rules (recommend setting RLS)
- Storage files inherit user-specific directory structure
- Authentication required for all operations
- Password handling via Firebase Authentication (bcrypt-managed)

## Environment Variables

All Firebase configuration is embedded in code. No environment variables needed for Firebase credentials.

## Testing Checklist

- [ ] User can sign up with Firebase Auth
- [ ] User can log in with credentials
- [ ] Dashboard loads user projects
- [ ] Can create new project
- [ ] Can upload media files
- [ ] Timeline saves to Firebase
- [ ] Can use Video Enhancer
- [ ] Can delete projects
- [ ] Logout works properly
- [ ] User data is isolated correctly

## Troubleshooting

### Upload Fails
- Check Firebase Storage permissions
- Verify user is authenticated
- Check file size limits (max 500MB)

### Project Not Loading
- Verify Firebase Database is enabled
- Check user authentication state
- Verify project ID in URL

### Timeline Not Saving
- Check database write permissions
- Verify user UID is correct
- Check browser console for errors

## Future Enhancements

- Add Firebase Rules for production security
- Implement offline persistence
- Add real-time collaboration
- Implement file versioning
- Add automatic backups
