// src/services/financeService.ts
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Transaction, FinancialCategory } from '@/types';

const transactionsCollection = collection(db, 'transactions');

// Centralized category definitions
export const FINANCIAL_CATEGORIES: {
    income: FinancialCategory[];
    expense: FinancialCategory[];
} = {
    income: [
        { id: 'membership_fees', name: 'Membership Fees' },
        { id: 'donations', name: 'Donations' },
        { id: 'fundraising', name: 'Fundraising Projects' },
        { id: 'sponsorships', name: 'Sponsorships' },
        { id: 'other', name: 'Other Income' },
    ],
    expense: [
        { id: 'event_costs', name: 'Event Costs' },
        { id: 'charity_donations', name: 'Charity Donations' },
        { id: 'administrative', name: 'Administrative Costs' },
        { id: 'travel', name: 'Travel & Accommodation' },
        { id: 'supplies', name: 'Supplies & Materials' },
        { id: 'other', name: 'Other Expenses' },
    ],
};

const docToTransaction = (docSnap: any): Transaction => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    type: data.type,
    date: (data.date as Timestamp).toDate().toISOString(),
    amount: data.amount,
    category: data.category,
    source: data.source,
    notes: data.notes,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
};

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(transactionsCollection, {
    ...data,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTransactions(): Promise<Transaction[]> {
  const q = query(transactionsCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTransaction);
}

export async function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, 'transactions', id);
  const updateData = { ...data };
  if (data.date) {
    updateData.date = Timestamp.fromDate(new Date(data.date));
  }
  await updateDoc(docRef, updateData);
}

export async function deleteTransaction(id: string): Promise<void> {
  const docRef = doc(db, 'transactions', id);
  await deleteDoc(docRef);
}
