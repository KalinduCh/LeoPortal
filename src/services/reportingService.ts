import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { MonthlyReport, ReportFile } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('year', '==', year),
      orderBy('month', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToReport);
  } catch (err) {
    console.error("GET_REPORTS_FAILED:", err);
    return [];
  }
}

/**
 * Upserts a monthly report record using a non-blocking pattern.
 */
export async function updateMonthlyReport(month: number, year: number, updates: Partial<MonthlyReport>): Promise<void> {
  const reportId = `${year}-${month}`;
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  
  const currentSnap = await getDoc(reportRef);
  
  const payload: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  if (currentSnap.exists()) {
    updateDoc(reportRef, payload)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: reportRef.path,
          operation: 'update',
          requestResourceData: payload,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  } else {
    const newDoc = {
      month,
      year,
      files: [],
      folderUrl: '',
      ...payload,
    };
    setDoc(reportRef, newDoc)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: reportRef.path,
          operation: 'create',
          requestResourceData: newDoc,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  }
}

/**
 * Adds a file link to a specific monthly report using non-blocking pattern.
 */
export async function addFileToReport(reportId: string, file: ReportFile): Promise<void> {
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  const reportSnap = await getDoc(reportRef);
  
  if (reportSnap.exists()) {
    const data = reportSnap.data();
    const files = data.files || [];
    const newFiles = [...files, file];
    
    updateDoc(reportRef, {
      files: newFiles,
      updatedAt: serverTimestamp(),
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: reportRef.path,
          operation: 'update',
          requestResourceData: { files: newFiles },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  }
}

/**
 * Removes a file link using non-blocking pattern.
 */
export async function removeFileFromReport(reportId: string, fileName: string): Promise<void> {
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  const reportSnap = await getDoc(reportRef);
  
  if (reportSnap.exists()) {
    const data = reportSnap.data();
    const files = (data.files || []).filter((f: ReportFile) => f.name !== fileName);
    
    updateDoc(reportRef, {
      files,
      updatedAt: serverTimestamp(),
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: reportRef.path,
          operation: 'update',
          requestResourceData: { files },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  }
}