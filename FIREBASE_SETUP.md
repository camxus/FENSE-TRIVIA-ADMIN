# Firebase Setup Instructions

This project uses Firebase for authentication and Firestore for data storage.

## Required Environment Variables

You need to add the following environment variables to your Vercel project. These can be found in your Firebase Console under Project Settings > General > Your apps.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Add a Web App to your project
4. Copy the configuration values

Add these environment variables in the **Vars** section of the v0 sidebar:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Firebase Console Setup

### 1. Enable Authentication

1. Go to Firebase Console > Authentication
2. Click "Get Started"
3. Enable "Email/Password" sign-in method

### 2. Create Firestore Database

1. Go to Firebase Console > Firestore Database
2. Click "Create Database"
3. Start in **Test Mode** (you can set up security rules later)
4. Choose a location close to your users

### 3. Firestore Structure

The app will automatically create the following structure:

```
categories (collection)
  └── {categoryId} (document)
      ├── categoryName: string
      └── questions (subcollection)
          └── {questionId} (document)
              ├── question: string
              ├── answer: string
              └── timeLimit: number
```

### 4. Security Rules (Recommended)

Once you've created an admin account, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /categories/{categoryId} {
      allow read, write: if request.auth != null;
      
      match /questions/{questionId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Getting Started

1. Add all environment variables to your project
2. Visit `/login` to create your admin account
3. Start managing your quiz questions!
