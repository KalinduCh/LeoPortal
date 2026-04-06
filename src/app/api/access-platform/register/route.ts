
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

// Consistent collection names matching service and rules
const PLATFORM_REGISTRATIONS = 'accessRegistrations';

/**
 * API route for public district event registration.
 * Handles Ticket generation, Firestore storage, QR creation, and Email delivery.
 */
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

    // 1. Generate unique high-density Ticket ID
    const ticketId = `PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // 2. Save Registration to Firestore
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

    // 3. Generate Secure QR Code Pass
    const qrPayload = JSON.stringify({ ticketId, eventId });
    const qrBase64 = await QRCode.toDataURL(qrPayload, {
      color: { dark: '#1e3a8a', light: '#ffffff' },
      margin: 2,
      width: 400
    });

    // 4. Send Confirmation Email via SMTP
    const { GMAIL_EMAIL, GMAIL_APP_PASSWORD } = process.env;
    if (GMAIL_EMAIL && GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_EMAIL, pass: GMAIL_APP_PASSWORD },
      });

      const foodLabel = foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian';

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1e3a8a; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">District Entry Pass</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Registration Confirmed</p>
          </div>
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">Your registration for <strong>${eventName}</strong> is complete. Please present the QR code below at the check-in desk for entry.</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed #1e3a8a; border-radius: 12px;">
              <img src="cid:qrcode" alt="QR Pass" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />
              <p style="font-family: monospace; font-weight: bold; font-size: 20px; margin: 10px 0 0 0; color: #1e3a8a;">${ticketId}</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Your Details</h3>
              <p style="margin: 5px 0; font-size: 14px;">Club: <strong>${club}</strong></p>
              <p style="margin: 5px 0; font-size: 14px;">Type: <strong>${role}</strong></p>
              <p style="margin: 5px 0; font-size: 14px;">Food: <strong>${foodLabel}</strong></p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Event Logistics</h3>
              <p style="margin: 5px 0; font-size: 15px;">📅 <strong>${eventDate}</strong> at <strong>${eventTime}</strong></p>
              <p style="margin: 5px 0; font-size: 15px;">📍 <strong>${eventLocation}</strong></p>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background-color: #f1f5f9; color: #64748b; font-size: 11px;">
            This pass is unique. Please have it ready on your mobile for scanning. &copy; 2026 Access Platform.
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Event Platform" <${GMAIL_EMAIL}>`,
        to: email,
        subject: `Your Pass for ${eventName}: ${ticketId}`,
        html: emailHtml,
        attachments: [{
          filename: 'entry-pass.png',
          content: qrBase64.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }]
      });
    }

    return NextResponse.json({ success: true, ticketId });

  } catch (error: any) {
    console.error("Platform API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
