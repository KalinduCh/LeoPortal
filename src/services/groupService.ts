
// src/services/groupService.ts
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { CommunicationGroup } from '@/types';

const groupsCollectionRef = collection(db, 'communicationGroups');

const docToGroup = (docSnap: any): CommunicationGroup => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        name: data.name,
        memberIds: data.memberIds || [],
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    };
};

export async function createGroup(name: string, memberIds: string[]): Promise<string> {
  const docRef = await addDoc(groupsCollectionRef, {
    name,
    memberIds,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getGroups(): Promise<CommunicationGroup[]> {
  const q = query(groupsCollectionRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToGroup);
}

export async function getGroup(groupId: string): Promise<CommunicationGroup | null> {
    const docRef = doc(db, 'communicationGroups', groupId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        return docToGroup(docSnap);
    }
    return null;
}

export async function updateGroup(groupId: string, updates: Partial<{ name: string; memberIds: string[] }>): Promise<void> {
  const docRef = doc(db, 'communicationGroups', groupId);
  await updateDoc(docRef, updates);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const docRef = doc(db, 'communicationGroups', groupId);
  await deleteDoc(docRef);
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<void> {
    const docRef = doc(db, 'communicationGroups', groupId);
    await updateDoc(docRef, {
        memberIds: arrayUnion(userId)
    });
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    const docRef = doc(db, 'communicationGroups', groupId);
    await updateDoc(docRef, {
        memberIds: arrayRemove(userId)
    });
}
