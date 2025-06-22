
// src/services/userService.ts
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { User, UserRole } from '@/types';

export async function createUserProfile(
  uid: string, 
  email: string, 
  name: string, 
  role: UserRole = 'member',
  status: 'pending' | 'approved' = 'pending',
  photoUrl?: string,
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
    status,
    createdAt: serverTimestamp(),
    photoUrl: photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
  };

  if (nic) profileData.nic = nic;
  if (dateOfBirth) profileData.dateOfBirth = dateOfBirth;
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
        photoUrl: data.photoUrl || `https://placehold.co/100x100.png?text=${placeholderChar}`,
        role: data.role,
        status: data.status || 'approved', // Default to 'approved' for backward compatibility
        designation: data.designation,
        nic: data.nic,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        mobileNumber: data.mobileNumber,
     } as User;
  }
  return null;
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const updateData: { [key: string]: any } = { ...data };
  
  delete updateData.id; 
  
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
}

export async function approveUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { status: 'approved' });
}

export async function deleteUserProfile(uid: string): Promise<void> {
    // This function only deletes the Firestore document.
    // Deleting the Firebase Auth user requires admin privileges and is handled separately
    // for security reasons if a backend is implemented.
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
}
