// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { User } from '@/types';

export async function createUserProfile(
  uid: string, 
  email: string, 
  name: string, 
  role: User['role'] = 'member',
  photoUrl?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email,
    name,
    role,
    createdAt: serverTimestamp(), // Use serverTimestamp for consistency
    photoUrl: photoUrl || `https://placehold.co/100x100.png?text=${name.charAt(0)}`, 
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    // Ensure createdAt is handled correctly if it's a Firestore Timestamp
    let createdAtString;
    if (data.createdAt instanceof Timestamp) {
      createdAtString = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAtString = data.createdAt;
    }
    
    return {
        id: data.uid, // Ensure 'id' field from User type is mapped from 'uid'
        name: data.name,
        email: data.email,
        photoUrl: data.photoUrl || `https://placehold.co/100x100.png?text=${data.name.charAt(0)}`,
        role: data.role,
        // createdAt: createdAtString, // Optional: include if needed by User type
     } as User; // Cast to User, assuming all required fields are present
  }
  return null;
}
