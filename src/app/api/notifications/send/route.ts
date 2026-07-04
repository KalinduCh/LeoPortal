import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb, adminAuth } from '@/lib/firebase/admin/config';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth().verifyIdToken(idToken);

    // Check if user is admin or super_admin
    const userDoc = await adminDb().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, body, userIds, link, type, eventId } = await req.json();

    let targetTokens: string[] = [];

    if (type === 'all') {
      const usersSnap = await adminDb().collection('users')
        .where('status', '==', 'approved')
        .get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) targetTokens.push(data.fcmToken);
      });
    } else if (type === 'executive') {
       const usersSnap = await adminDb().collection('users')
        .where('status', '==', 'approved')
        .where('role', 'in', ['admin', 'super_admin'])
        .get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) targetTokens.push(data.fcmToken);
      });
    } else if (type === 'participants' && eventId) {
      const attendanceSnap = await adminDb().collection('attendance')
        .where('eventId', '==', eventId)
        .get();

      const participantIds = attendanceSnap.docs.map(doc => doc.data().userId).filter(Boolean);

      if (participantIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < participantIds.length; i += 30) {
          chunks.push(participantIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          const usersSnap = await adminDb().collection('users')
            .where('__name__', 'in', chunk)
            .get();
          usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) targetTokens.push(data.fcmToken);
          });
        }
      }
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        const usersSnap = await adminDb().collection('users')
          .where('__name__', 'in', chunk)
          .get();
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.fcmToken) targetTokens.push(data.fcmToken);
        });
      }
    }

    targetTokens = [...new Set(targetTokens)];

    if (targetTokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No registered tokens found for selected recipients.' });
    }

    const response = await adminMessaging().sendEachForMulticast({
      notification: { title, body },
      tokens: targetTokens,
      webpush: {
        fcmOptions: { link: link || '/dashboard' },
        notification: { icon: 'https://i.imgur.com/MP1YFNf.png' },
      },
    });

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      recipientCount: targetTokens.length
    });

  } catch (error: any) {
    console.error('API_NOTIFICATION_ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
