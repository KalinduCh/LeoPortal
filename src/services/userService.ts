
// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { User, UserRole } from '@/types';

export async function createUserProfile(
  uid: string, 
  email: string, 
  name: string, 
  role: UserRole = 'member',
  photoUrl?: string,
  nic?: string,
  dateOfBirth?: string,
  gender?: string,
  mobileNumber?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const placeholderChar = name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'U';
  
  const profileData: Partial<User> & { createdAt: any } = { // Ensure all fields are optional for partial updates
    uid,
    email,
    name: name || "Unnamed User",
    role,
    createdAt: serverTimestamp(),
    photoUrl: photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
  };

  if (nic) profileData.nic = nic;
  if (dateOfBirth) profileData.dateOfBirth = dateOfBirth;
  if (gender) profileData.gender = gender;
  if (mobileNumber) profileData.mobileNumber = mobileNumber;

  await setDoc(userRef, profileData);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    const userName = data.name || ""; 
    const placeholderChar = userName && userName.trim().length > 0 ? userName.trim().charAt(0).toUpperCase() : 'U';

    return {
        id: userSnap.id,
        name: data.name || "Unnamed User",
        email: data.email,
        photoUrl: data.photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
        role: data.role,
        nic: data.nic,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        mobileNumber: data.mobileNumber,
     } as User;
  }
  return null;
}

// Ensure this function can handle all new User fields for updates
export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  // Create a mutable copy to avoid modifying the input `data` object if it's read-only
  const updateData: Partial<User> = { ...data }; 
  
  // Firestore does not allow 'id' or 'uid' to be part of the update payload if they are the document ID
  // However, our User type includes 'id'. We should remove it before updating.
  // Also, 'uid' if it's the same as the doc id and already stored, might not need explicit update.
  // For simplicity, we assume 'id' might be passed from forms and should be stripped.
  delete updateData.id; 
  // delete updateData.uid; // uid is usually not changed.

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
}
