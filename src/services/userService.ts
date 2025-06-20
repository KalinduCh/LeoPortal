// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { User } from '@/types';

export async function createUserProfile(uid: string, email: string, name: string, role: User['role'] = 'member'): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email,
    name,
    role,
    createdAt: serverTimestamp(),
    photoUrl: `https://placehold.co/100x100.png`, // Default placeholder
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    // We use 'id' in our User type, so map uid to id
    const userData = userSnap.data();
    return {
        id: userData.uid,
        name: userData.name,
        email: userData.email,
        photoUrl: userData.photoUrl,
        role: userData.role,
     } as User;
  }
  return null;
}
