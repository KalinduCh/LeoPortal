
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { MonthlyReport } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const REPORTS_COLLECTION = 'monthlyReports';

/**
 * Normalized fetch that avoids Index Errors by filtering on year and sorting locally.
 */
export async function getReportsByYear(year: number): Promise<MonthlyReport[]> {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('year', '==', year)
    );
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as MonthlyReport;
    });

    return reports.sort((a, b) => a.month - b.month);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: REPORTS_COLLECTION,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    console.error("GET_REPORTS_FAILED:", error);
    return [];
  }
}

/**
 * Updates or creates a monthly reporting link module.
 */
export async function updateMonthlyReport(month: number, year: number, data: { viewUrl?: string; uploadUrl?: string }): Promise<void> {
  const reportId = `${year}-${month}`;
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  
  const payload: any = {
    month,
    year,
    ...data,
    updatedAt: serverTimestamp(),
  };

  setDoc(reportRef, payload, { merge: true })
    .catch(async (serverError) => {
      if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: reportRef.path,
          operation: 'update',
          requestResourceData: payload,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }
    });
}
