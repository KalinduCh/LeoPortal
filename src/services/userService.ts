// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { User, UserRole } from '@/types';

export async function createUserProfile(
  uid: string, 
  email: string, 
  name: string, 
  role: UserRole = 'member',
  photoUrl?: string, // photoUrl is now expected to be a Base64 string or placeholder
  nic?: string,
  dateOfBirth?: string,
  gender?: string,
  mobileNumber?: string,
  designation?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const placeholderChar = name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'U';
  
  const profileData: Partial<User> & { createdAt: any } = { 
    uid,
    email,
    name: name || "Unnamed User",
    role,
    createdAt: serverTimestamp(),
    // If photoUrl is provided (Base64 or existing placeholder), use it. Otherwise, generate new placeholder.
    photoUrl: photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
  };

  if (nic) profileData.nic = nic;
  if (dateOfBirth) profileData.dateOfBirth = dateOfBirth; // Expects "YYYY-MM-DD" string
  if (gender) profileData.gender = gender;
  if (mobileNumber) profileData.mobileNumber = mobileNumber;
  if (designation) profileData.designation = designation;

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
        // If photoUrl exists (could be Base64 or placeholder), use it. Else, generate placeholder.
        photoUrl: data.photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
        role: data.role,
        designation: data.designation,
        nic: data.nic,
        dateOfBirth: data.dateOfBirth, // Expects "YYYY-MM-DD" string
        gender: data.gender,
        mobileNumber: data.mobileNumber,
     } as User;
  }
  return null;
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  // We need a mutable object that we can delete keys from.
  const updateData: { [key: string]: any } = { ...data };
  
  // The 'id' field is not part of the 'users' document data model, so it should be removed.
  delete updateData.id; 
  
  // Sanitize the data to remove any fields with `undefined` values.
  // Firestore does not support `undefined` and will throw an error.
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // Only proceed with the update if there's actual data to update.
  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
}
