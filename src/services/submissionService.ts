import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { FormSubmission } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const SUBMISSIONS_COLLECTION = 'formSubmissions';

/**
 * Submits a native form response using a non-blocking mutation pattern.
 */
export async function submitForm(formId: string, data: Record<string, any>, respondentInfo?: { name: string; email: string; id?: string }): Promise<void> {
    const submissionData: any = {
        formId,
        data,
        submittedAt: serverTimestamp(),
    };

    if (respondentInfo) {
        submissionData.respondentName = respondentInfo.name;
        submissionData.respondentEmail = respondentInfo.email;
        if (respondentInfo.id) submissionData.respondentId = respondentInfo.id;
    }

    const colRef = collection(db, SUBMISSIONS_COLLECTION);
    addDoc(colRef, submissionData)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: colRef.path,
                operation: 'create',
                requestResourceData: submissionData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
}

export async function getSubmissionsForForm(formId: string): Promise<FormSubmission[]> {
    const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('formId', '==', formId),
        orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            submittedAt: data.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        } as FormSubmission;
    });
}
