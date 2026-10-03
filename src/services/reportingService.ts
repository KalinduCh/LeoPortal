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
 * Normalized fetch that avoids Index Errors by sorting on client side.
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

    // Sort by month index ascending in JavaScript to avoid composite index requirement
    return reports.sort((a, b) => a.month - b.month);
  } catch (err) {
    console.error("GET_REPORTS_FAILED:", err);
    return [];
  }
}

/**
 * Simplistic "Gallery Style" Upsert for Monthly Reports.
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

  // Using non-blocking setDoc for maximum performance
  setDoc(reportRef, payload, { merge: true })
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: reportRef.path,
        operation: 'write',
        requestResourceData: payload,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
}