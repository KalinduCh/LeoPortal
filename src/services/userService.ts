
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
  const updateData: Partial<User> = { ...data }; 
  
  delete updateData.id; 

  // If photoUrl is an empty string, explicitly set it to null or use a server-side delete if needed.
  // For now, if it's empty, it will save an empty string. If it's undefined, the field won't be updated.
  // If it's null, it might remove the field or set it to null based on Firestore behavior.
  // For Base64, an empty string means no image, null means remove previous.
  // Let's ensure if an empty string is passed for photoUrl, it signifies "no custom image".
  // The consumer (ProfileCard) should send a placeholder URL or an empty string/null if they want to clear it.
  // For now, we assume ProfileCard sends a valid Base64 data URI, a placeholder, or existing value.

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
}
