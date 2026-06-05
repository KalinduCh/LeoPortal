// src/services/attendanceService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  limit,
  orderBy,
  doc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AttendanceRecord } from '@/types';
import type { VisitorAttendanceFormValues } from '@/components/events/visitor-attendance-form';
import { addOfflineAttendance, isOfflineError } from './offlineSyncService';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const attendanceCollectionRef = collection(db, 'attendance');

export interface MarkAttendanceResult {
  status: 'success' | 'already_marked' | 'error' | 'offline_queued';
  message: string;
  record?: AttendanceRecord;
}

function dataToAttendanceRecord(docId: string, data: any): AttendanceRecord | null {
  if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
    console.warn(`Attendance record ${docId} has an invalid or missing timestamp. Record will be skipped. Data:`, data);
    return null;
  }
  return {
    id: docId,
    eventId: data.eventId,
    timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
    status: data.status,
    attendanceType: data.attendanceType || 'member',
    userId: data.userId,
    visitorName: data.visitorName,
    visitorDesignation: data.visitorDesignation,
    visitorClub: data.visitorClub,
    visitorComment: data.visitorComment,
    markedLatitude: data.markedLatitude,
    markedLongitude: data.markedLongitude,
    markedByAdminId: data.markedByAdminId,
    markedByAdminName: data.markedByAdminName,
  } as AttendanceRecord;
}


export async function markUserAttendance(
  eventId: string,
  userId: string,
  markedLatitude?: number,
  markedLongitude?: number,
  adminInfo?: { id: string; name: string }
): Promise<MarkAttendanceResult> {
  
  try {
    const existingAttendance = await getUserAttendanceForEvent(eventId, userId);
    if (existingAttendance) {
      return {
        status: 'already_marked',
        message: 'Attendance already marked for this event.',
        record: existingAttendance
      };
    }
  } catch (error) {
    if (!isOfflineError(error)) {
        throw error;
    }
  }

  const attendanceData: any = {
    eventId,
    userId,
    status: 'present',
    attendanceType: 'member',
    createdAt: serverTimestamp(),
    timestamp: Timestamp.now(),
  };

  if (markedLatitude !== undefined && markedLongitude !== undefined) {
    attendanceData.markedLatitude = markedLatitude;
    attendanceData.markedLongitude = markedLongitude;
  }

  if (adminInfo) {
    attendanceData.markedByAdminId = adminInfo.id;
    attendanceData.markedByAdminName = adminInfo.name;
  }

  // Refactored to follow non-blocking mutation pattern with contextual error handling
  addDoc(attendanceCollectionRef, attendanceData)
    .then(async (docRef) => {
        console.log("Attendance record created with ID:", docRef.id);
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: attendanceCollectionRef.path,
            operation: 'create',
            requestResourceData: attendanceData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

  // For UI purposes, we assume success or handle offline queuing
  if (typeof window !== 'undefined' && !navigator.onLine) {
      await addOfflineAttendance({ ...attendanceData, timestamp: new Date().toISOString() });
      return { status: 'offline_queued', message: 'You are offline. Attendance has been saved and will sync later.' };
  }

  return { status: 'success', message: 'Attendance record submitted.' };
}

export async function markVisitorAttendance(
  eventId: string,
  visitorData: VisitorAttendanceFormValues,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  const attendanceData: any = {
    eventId,
    status: 'present',
    attendanceType: 'visitor',
    visitorName: visitorData.name,
    visitorDesignation: visitorData.designation,
    visitorClub: visitorData.club,
    visitorComment: visitorData.comment || '',
    createdAt: serverTimestamp(),
    timestamp: Timestamp.now(),
  };

  if (markedLatitude !== undefined && markedLongitude !== undefined) {
    attendanceData.markedLatitude = markedLatitude;
    attendanceData.markedLongitude = markedLongitude;
  }

  addDoc(attendanceCollectionRef, attendanceData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: attendanceCollectionRef.path,
            operation: 'create',
            requestResourceData: attendanceData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

  if (typeof window !== 'undefined' && !navigator.onLine) {
      await addOfflineAttendance({ ...attendanceData, timestamp: new Date().toISOString() });
      return { status: 'offline_queued', message: 'You are offline. Attendance has been saved and will sync later.' };
  }

  return { status: 'success', message: 'Your attendance has been recorded.' };
}


export async function getUserAttendanceForEvent(
  eventId: string,
  userId: string
): Promise<AttendanceRecord | null> {
  const q = query(
    attendanceCollectionRef,
    where('eventId', '==', eventId),
    where('userId', '==', userId),
    where('attendanceType', '==', 'member'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docSnap = snapshot.docs[0];
  return dataToAttendanceRecord(docSnap.id, docSnap.data());
}

export async function getAttendanceRecordsForUser(userId: string): Promise<AttendanceRecord[]> {
  const q = query(
    attendanceCollectionRef, 
    where('userId', '==', userId), 
    where('attendanceType', '==', 'member'),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => 
    dataToAttendanceRecord(docSnap.id, docSnap.data())
  );
  return records.filter(record => record !== null) as AttendanceRecord[];
}

export async function getAttendanceRecordsForEvent(eventId: string): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, where('eventId', '==', eventId), orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => 
    dataToAttendanceRecord(docSnap.id, docSnap.data())
  );
  return records.filter(record => record !== null) as AttendanceRecord[];
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => 
    dataToAttendanceRecord(docSnap.id, docSnap.data())
  );
  return records.filter(record => record !== null) as AttendanceRecord[];
}

export async function bulkAddAttendance(records: any[]): Promise<void> {
  const batch = writeBatch(db);
  records.forEach(record => {
    const docRef = doc(collection(db, 'attendance'));
    const recordData = {
        ...record,
        timestamp: Timestamp.fromDate(new Date(record.timestamp)),
    };
    delete recordData.createdAt;
    batch.set(docRef, recordData);
  });
  await batch.commit();
}