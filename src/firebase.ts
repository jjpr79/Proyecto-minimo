import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || 'ai-studio-minimalistauthap-bff6a43f-c4aa-4e0a-a6b4-4183a6f00ef8';
export const db = getFirestore(app, dbId);
export const auth = getAuth(app);

