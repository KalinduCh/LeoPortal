import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

const PLATFORM_REGISTRATIONS = 'accessRegistrations';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
        eventId, eventName, eventDate, eventTime, eventLocation, 
        name, email, club, contactNumber, role, foodPreference 
    } = data;

    if (!eventId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ticketId = `ENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    await addDoc(collection(db, PLATFORM_REGISTRATIONS), {
      eventId,
      name,
      email,
      club: club || 'Individual',
      contactNumber: contactNumber || '',
      role: role || 'Guest',
      foodPreference: foodPreference || 'non_veg',
      ticketId,
      status: 'registered',
      createdAt: serverTimestamp(),
    });

    const qrPayload = JSON.stringify({ ticketId, eventId });
    const qrBase64 = await QRCode.toDataURL(qrPayload, {
      color: { dark: '#1e3a8a', light: '#ffffff' },
      margin: 2,
      width: 400
    });

    const { GMAIL_EMAIL, GMAIL_APP_PASSWORD } = process.env;
    if (GMAIL_EMAIL && GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_EMAIL, pass: GMAIL_APP_PASSWORD },
      });

      const foodLabel = foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian';

      const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #2563eb; padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.5px; text-transform: uppercase;">LeoEntrivo Digital Pass</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: 500;">Registration Confirmed</p>
          </div>
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 18px; color: #1e293b; margin-top: 0;">Dear <strong>${name}</strong>,</p>
            <p style="color: #475569; line-height: 1.6; font-size: 15px;">Your registration for <strong>${eventName}</strong> is successful. Please show the QR code below at the check-in desk for entry.</p>
            
            <div style="text-align: center; margin: 40px 0; padding: 30px; border: 2px dashed #cbd5e1; border-radius: 20px; background-color: #f8fafc;">
              <img src="cid:qrcode" alt="Access QR" style="width: 240px; height: 240px; display: block; margin: 0 auto; border-radius: 8px;" />
              <p style="font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 22px; margin: 20px 0 0 0; color: #2563eb; letter-spacing: 2px;">${ticketId}</p>
            </div>

            <div style="background-color: #f1f5f9; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; letter-spacing: 1px;">Logistics Summary</h3>
              <p style="margin: 8px 0; font-size: 15px; color: #334155;">📅 Date: <strong>${eventDate}</strong></p>
              <p style="margin: 8px 0; font-size: 15px; color: #334155;">⏰ Time: <strong>${eventTime}</strong></p>
              <p style="margin: 8px 0; font-size: 15px; color: #334155;">📍 Venue: <strong>${eventLocation}</strong></p>
              <p style="margin: 8px 0; font-size: 15px; color: #334155;">🍽️ Meal: <strong>${foodLabel}</strong></p>
            </div>
          </div>
          <div style="padding: 25px; text-align: center; background-color: #f8fafc; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9;">
            This pass is unique to your registration. Powered by LeoEntrivo &copy; 2026.
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"LeoEntrivo Pass" <${GMAIL_EMAIL}>`,
        to: email,
        subject: `Your Pass for ${eventName}: ${ticketId}`,
        html: emailHtml,
        attachments: [{
          filename: 'leoentrivo-pass.png',
          content: qrBase64.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }]
      });
    }

    return NextResponse.json({ success: true, ticketId });

  } catch (error: any) {
    console.error("LeoEntrivo API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
