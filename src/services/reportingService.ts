
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { MonthlyReport, ReportFile } from '@/types';

const REPORTS_COLLECTION = 'monthlyReports';

/**
 * Normalizes Firestore data to a MonthlyReport object.
 */
const docToReport = (docSnap: any): MonthlyReport => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    month: data.month,
    year: data.year,
    folderUrl: data.folderUrl || '',
    files: data.files || [],
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
};

/**
 * Fetches all reports for a specific year.
 */
export async function getReportsByYear(year: number): Promise<MonthlyReport[]> {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('year', '==', year),
    orderBy('month', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToReport);
}

/**
 * Upserts a monthly report record.
 */
export async function updateMonthlyReport(month: number, year: number, updates: Partial<MonthlyReport>): Promise<void> {
  const reportId = `${year}-${month}`;
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  
  const currentSnap = await getDoc(reportRef);
  
  if (currentSnap.exists()) {
    await updateDoc(reportRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(reportRef, {
      month,
      year,
      files: [],
      folderUrl: '',
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Adds a file link to a specific monthly report.
 */
export async function addFileToReport(reportId: string, file: ReportFile): Promise<void> {
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  const reportSnap = await getDoc(reportRef);
  
  if (reportSnap.exists()) {
    const data = reportSnap.data();
    const files = data.files || [];
    await updateDoc(reportRef, {
      files: [...files, file],
      updatedAt: serverTimestamp(),
    });
  }
}
