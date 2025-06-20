// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { User, UserRole } from '@/types';

export async function createUserProfile(
  uid: string, 
  email: string, 
  name: string, 
  role: UserRole = 'member',
  photoUrl?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const placeholderChar = name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'U';
  await setDoc(userRef, {
    uid, // Storing uid explicitly for easier querying if needed, though doc.id is the uid
    email,
    name: name || "Unnamed User", // Ensure name is not empty
    role,
    createdAt: serverTimestamp(),
    photoUrl: photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`, 
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    const userName = data.name || ""; 
    const placeholderChar = userName && userName.trim().length > 0 ? userName.trim().charAt(0).toUpperCase() : 'U';

    return {
        id: userSnap.id, // Use document ID as the user ID
        name: data.name || "Unnamed User",
        email: data.email,
        photoUrl: data.photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
        role: data.role,
     } as User;
  }
  return null;
}

export async function updateUserProfile(uid: string, data: { name?: string; role?: UserRole }): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
}
