
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
import type { VisitorAttendanceFormValues } from '@/components/events/visitor-attendance-form'; // Import visitor form values

const attendanceCollectionRef = collection(db, 'attendance');

export interface MarkAttendanceResult {
  status: 'success' | 'already_marked' | 'error';
  message: string;
  record?: AttendanceRecord;
}

// Utility function to convert Firestore data to AttendanceRecord, handling timestamps
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
    attendanceType: data.attendanceType || 'member', // Default to member if not specified
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
    attendanceType: 'member', // Explicitly set for user attendance
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
    console.error("Error adding user attendance document to Firestore:", error);
    return { status: 'error', message: `Failed to record user attendance: ${error.message || 'Unknown error'}` };
  }
}

export async function markVisitorAttendance(
  eventId: string,
  visitorData: VisitorAttendanceFormValues
): Promise<MarkAttendanceResult> {
  // For visitors, we don't check for existing attendance as they are anonymous per submission
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

  try {
    const docRef = await addDoc(attendanceCollectionRef, attendanceData);
    const newDocSnap = await getDoc(doc(db, 'attendance', docRef.id));
     if (newDocSnap.exists()) {
        const newRecord = dataToAttendanceRecord(newDocSnap.id, newDocSnap.data());
        if (newRecord) {
            return { status: 'success', message: 'Visitor attendance has been recorded.', record: newRecord };
        }
    }
    return { status: 'error', message: 'Visitor attendance recorded but failed to retrieve confirmation details.' };
  } catch (error: any) {
    console.error("Error adding visitor attendance document to Firestore:", error);
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
    where('userId', '==', userId), // Ensure we are querying for a member's record
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
    where('attendanceType', '==', 'member'), // Only member records for this function
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => 
    dataToAttendanceRecord(docSnap.id, docSnap.data())
  );
  return records.filter(record => record !== null) as AttendanceRecord[];
}

// This function now fetches ALL attendance records for an event, members and visitors
export async function getAttendanceRecordsForEvent(eventId: string): Promise<AttendanceRecord[]> {
  console.log(`Fetching all attendance records for eventId: ${eventId}`);
  const q = query(attendanceCollectionRef, where('eventId', '==', eventId), orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  console.log(`Found ${snapshot.docs.length} raw attendance docs for event ${eventId}`);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => {
    const record = dataToAttendanceRecord(docSnap.id, docSnap.data());
    // if (record) console.log(`Processed record for event ${eventId}:`, record);
    return record;
  });
  const validRecords = records.filter(record => record !== null) as AttendanceRecord[];
  console.log(`Returning ${validRecords.length} valid attendance records for event ${eventId}`);
  return validRecords;
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  console.log("Fetching all attendance records (admin dashboard)...");
  const q = query(attendanceCollectionRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  console.log(`Found ${snapshot.docs.length} raw attendance docs (getAll)`);
  const records: (AttendanceRecord | null)[] = snapshot.docs.map(docSnap => 
    dataToAttendanceRecord(docSnap.id, docSnap.data())
  );
  const validRecords = records.filter(record => record !== null) as AttendanceRecord[];
  console.log(`Returning ${validRecords.length} valid attendance records (getAll)`);
  return validRecords;
}
