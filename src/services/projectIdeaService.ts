
// src/services/projectIdeaService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { ProjectIdea } from '@/types';

const projectIdeasCollection = collection(db, 'projectIdeas');

// Helper to convert Firestore doc to ProjectIdea type
const docToProjectIdea = (docSnap: any): ProjectIdea => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
    } as ProjectIdea;
};

// Create a new project idea
export async function createProjectIdea(ideaData: Omit<ProjectIdea, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(projectIdeasCollection, {
    ...ideaData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// Get all project ideas, sorted by most recent
export async function getProjectIdeas(): Promise<ProjectIdea[]> {
  const q = query(projectIdeasCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToProjectIdea);
}

// Get a single project idea by ID
export async function getProjectIdea(id: string): Promise<ProjectIdea | null> {
    const docRef = doc(db, 'projectIdeas', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docToProjectIdea(docSnap);
    }
    return null;
}

// Update a project idea (e.g., to change its status)
export async function updateProjectIdea(id: string, updates: Partial<Omit<ProjectIdea, 'id'>>): Promise<void> {
  const docRef = doc(db, 'projectIdeas', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
