
// src/services/offlineSyncService.ts
'use client';
import { bulkAddAttendance } from './attendanceService';

const OFFLINE_ATTENDANCE_QUEUE_KEY = 'offline_attendance_queue';

type QueuedAttendanceRecord = any; 

// Helper to check for Firestore offline errors
export function isOfflineError(error: any): boolean {
  return error.code === 'unavailable' || error.message.toLowerCase().includes('offline');
}

// Get the current queue from localStorage
function getQueue(): QueuedAttendanceRecord[] {
  try {
    const storedQueue = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : [];
  } catch (error) {
    console.error("Error parsing offline queue:", error);
    return [];
  }
}

// Save the queue to localStorage
function saveQueue(queue: QueuedAttendanceRecord[]): void {
  try {
    localStorage.setItem(OFFLINE_ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error saving offline queue:", error);
  }
}

// Add a new attendance record to the offline queue
export async function addOfflineAttendance(record: any): Promise<void> {
  console.log("Adding record to offline queue:", record);
  const queue = getQueue();
  // Add a unique client-side ID to prevent duplicates if user clicks multiple times
  const newRecord = { ...record, clientId: `offline_${Date.now()}` };
  queue.push(newRecord);
  saveQueue(queue);
}

// Sync the queued records to Firestore
export async function syncOfflineAttendance(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) {
    console.log("Offline sync: No records to sync.");
    return 0;
  }

  console.log(`Offline sync: Found ${queue.length} records to sync.`);
  
  try {
    // Here you would implement the logic to send the queued data to your backend
    // For Firestore, this might be a batch write
    await bulkAddAttendance(queue);
    
    console.log("Offline sync: Successfully synced all records to Firestore.");
    
    // Clear the queue after successful sync
    saveQueue([]);
    return queue.length;

  } catch (error) {
    console.error("Offline sync: Failed to sync records to Firestore.", error);
    // Don't clear the queue if the sync fails, so we can retry later
    throw error;
  }
}
