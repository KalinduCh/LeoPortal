// src/services/documentService.ts
'use server';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase/clientApp';
import type { Document as DocumentType } from '@/types';

const documentsCollection = collection(db, 'documents');

export async function uploadDocument(
  file: File,
  customName: string
): Promise<DocumentType> {
  const docRef = doc(collection(db, 'documents')); // Create a new doc ref to get ID
  const documentId = docRef.id;
  const storagePath = `documents/${documentId}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  // Upload file
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  // Create Firestore metadata document
  const docData = {
    name: customName,
    url,
    storagePath,
    uploadDate: serverTimestamp(),
    size: file.size,
    contentType: file.type,
  };

  await setDoc(docRef, docData);

  return {
    id: documentId,
    name: customName,
    url,
    storagePath,
    uploadDate: new Date().toISOString(), // Use current date as placeholder for immediate UI update
    size: file.size,
    contentType: file.type,
  };
}

// A helper function to convert firestore doc to Document type
const docToDocument = (docSnap: any): DocumentType => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        name: data.name,
        url: data.url,
        storagePath: data.storagePath,
        uploadDate: (data.uploadDate as Timestamp).toDate().toISOString(),
        size: data.size,
        contentType: data.contentType,
    };
}

export async function getDocuments(): Promise<DocumentType[]> {
  const q = query(documentsCollection, orderBy('uploadDate', 'desc'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  const documents = snapshot.docs.map(docToDocument);
  return documents;
}

export async function deleteDocument(documentId: string, storagePath: string): Promise<void> {
  // Delete from Storage
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);

  // Delete from Firestore
  const docRef = doc(db, 'documents', documentId);
  await deleteDoc(docRef);
}
