
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
  } as AttendanceRecord;
}


export async function markUserAttendance(
  eventId: string,
  userId: string,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  console.log(`Attempting to mark user attendance for eventId: ${eventId}, userId: ${userId}`);
  
  try {
    const existingAttendance = await getUserAttendanceForEvent(eventId, userId);
    if (existingAttendance) {
      console.log(`User ${userId} already marked attendance for event ${eventId}.`);
      return {
        status: 'already_marked',
        message: 'Attendance already marked for this event.',
        record: existingAttendance
      };
    }
  } catch (error) {
    if (isOfflineError(error)) {
        // If offline, we can't check for existing attendance, so we queue it.
        // The backend sync process should handle potential duplicates if necessary.
        console.warn("Offline: Cannot check for existing attendance. Queuing record.");
    } else {
        throw error; // Re-throw other errors
    }
  }


  const attendanceData: Omit<AttendanceRecord, 'id' | 'timestamp'> & { timestamp: any; createdAt: any } = {
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

  try {
    const docRef = await addDoc(attendanceCollectionRef, attendanceData);
    const newDocSnap = await getDoc(doc(db, 'attendance', docRef.id));
    if (newDocSnap.exists()) {
        const newRecord = dataToAttendanceRecord(newDocSnap.id, newDocSnap.data());
        if (newRecord) {
            return { status: 'success', message: 'Your attendance has been recorded.', record: newRecord };
        }
    }
    return { status: 'error', message: 'Attendance recorded but failed to retrieve confirmation details.' };
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.log("Offline mode detected. Queuing user attendance.");
      await addOfflineAttendance({ ...attendanceData, timestamp: attendanceData.timestamp.toDate().toISOString() });
      return { status: 'offline_queued', message: 'You are offline. Attendance has been saved and will sync later.' };
    }
    console.error("Error adding user attendance document to Firestore for event " + eventId + ":", error);
    return { status: 'error', message: `Failed to record user attendance: ${error.message || 'Unknown error'}` };
  }
}

export async function markVisitorAttendance(
  eventId: string,
  visitorData: VisitorAttendanceFormValues,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  const attendanceData: Omit<AttendanceRecord, 'id' | 'timestamp' | 'userId'> & { timestamp: any; createdAt: any } = {
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

  try {
    await addDoc(attendanceCollectionRef, attendanceData);
    return { status: 'success', message: 'Your attendance has been recorded.' };
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.log("Offline mode detected. Queuing visitor attendance.");
      await addOfflineAttendance({ ...attendanceData, timestamp: attendanceData.timestamp.toDate().toISOString() });
      return { status: 'offline_queued', message: 'You are offline. Attendance has been saved and will sync later.' };
    }
    console.error("Error adding visitor attendance document to Firestore for event " + eventId + ":", error);
    return { status: 'error', message: `Failed to record visitor attendance: ${error.message || 'Unknown error'}` };
  }
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
    const docRef = doc(collection(db, 'attendance')); // Create a new doc with a random ID
    const recordData = {
        ...record,
        timestamp: Timestamp.fromDate(new Date(record.timestamp)), // Convert ISO string back to Timestamp
    };
    delete recordData.createdAt; // Let Firestore handle this on the backend
    batch.set(docRef, recordData);
  });
  await batch.commit();
}
