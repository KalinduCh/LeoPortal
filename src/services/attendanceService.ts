
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
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AttendanceRecord } from '@/types';

const attendanceCollectionRef = collection(db, 'attendance');

export interface MarkAttendanceResult {
  status: 'success' | 'already_marked' | 'error';
  message: string;
  record?: AttendanceRecord;
}

export async function markUserAttendance(
  eventId: string,
  userId: string,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  const existingAttendance = await getUserAttendanceForEvent(eventId, userId);
  if (existingAttendance) {
    return {
      status: 'already_marked',
      message: 'Attendance already marked for this event.',
      record: existingAttendance
    };
  }

  const attendanceData: Omit<AttendanceRecord, 'id' | 'timestamp'> & { timestamp: any; createdAt: any } = {
    eventId,
    userId,
    status: 'present',
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
        const newData = newDocSnap.data();
        // Ensure timestamp is valid before creating the record object
        let isoTimestamp: string;
        if (newData.timestamp && typeof newData.timestamp.toDate === 'function') {
            isoTimestamp = (newData.timestamp as Timestamp).toDate().toISOString();
        } else {
            console.warn(`Newly created attendance record ${newDocSnap.id} has invalid or missing timestamp. Using current date as fallback. Data:`, newData);
            isoTimestamp = new Date().toISOString(); // Fallback, should ideally not happen for new records
        }

        const newRecord: AttendanceRecord = {
            id: newDocSnap.id,
            eventId: newData.eventId,
            userId: newData.userId,
            timestamp: isoTimestamp,
            status: newData.status,
            markedLatitude: newData.markedLatitude,
            markedLongitude: newData.markedLongitude,
        };
        return {
          status: 'success',
          message: 'Your attendance has been recorded.',
          record: newRecord
        };
    } else {
        return {
            status: 'error',
            message: 'Attendance recorded but failed to retrieve confirmation details.'
        }
    }
  } catch (error: any) {
    console.error("Error adding attendance document to Firestore:", error);
    return {
        status: 'error',
        message: `Failed to record attendance: ${error.message || 'Unknown error'}`
    };
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
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
    console.warn(`Attendance record ${docSnap.id} for user ${userId} on event ${eventId} has an invalid or missing timestamp. Record skipped. Data:`, data);
    return null;
  }

  return {
    id: docSnap.id,
    eventId: data.eventId,
    userId: data.userId,
    timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
    status: data.status,
    markedLatitude: data.markedLatitude,
    markedLongitude: data.markedLongitude,
  } as AttendanceRecord;
}

export async function getAttendanceRecordsForUser(userId: string): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
      console.warn(`Attendance record ${docSnap.id} for user ${userId} on event ${data.eventId} has an invalid or missing timestamp. Record will be skipped. Data:`, data);
      return null;
    }
    return {
      id: docSnap.id,
      eventId: data.eventId,
      userId: data.userId,
      timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      status: data.status,
      markedLatitude: data.markedLatitude,
      markedLongitude: data.markedLongitude,
    } as AttendanceRecord;
  });
  return records.filter(record => record !== null) as AttendanceRecord[];
}

export async function getAttendanceRecordsForEvent(eventId: string): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, where('eventId', '==', eventId), orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
      console.warn(`Attendance record ${docSnap.id} for event ${eventId} has an invalid or missing timestamp. Record will be skipped. Data:`, data);
      return null;
    }
    return {
      id: docSnap.id,
      eventId: data.eventId,
      userId: data.userId,
      timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      status: data.status,
      markedLatitude: data.markedLatitude,
      markedLongitude: data.markedLongitude,
    } as AttendanceRecord;
  });
  return records.filter(record => record !== null) as AttendanceRecord[];
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
      console.warn(`Attendance record ${docSnap.id} (getAll) has an invalid or missing timestamp. Record will be skipped. Data:`, data);
      return null;
    }
    return {
      id: docSnap.id,
      eventId: data.eventId,
      userId: data.userId,
      timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      status: data.status,
      markedLatitude: data.markedLatitude,
      markedLongitude: data.markedLongitude,
    } as AttendanceRecord;
  });
  return records.filter(record => record !== null) as AttendanceRecord[];
}
