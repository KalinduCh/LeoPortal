import { NextResponse } from 'next/server';
import { createRegistration, getAccessEvent } from '@/services/accessManagementService';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { eventId, name, email, club, role } = data;

    if (!eventId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event = await getAccessEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const ticketId = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    await createRegistration({
      eventId,
      name,
      email,
      club: club || 'Individual',
      role: role || 'Guest',
      ticketId,
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

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">LeoEntrivo Entry Pass</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Registration Confirmed</p>
          </div>
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">Your registration for <strong>${event.name}</strong> is successful. Present this QR code at the desk.</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed #cbd5e1; border-radius: 12px;">
              <img src="cid:qrcode" alt="Entry QR" style="width: 200px; height: 200px; display: block; margin: 0 auto;" />
              <p style="font-family: monospace; font-weight: bold; font-size: 18px; margin: 10px 0 0 0; color: #1e3a8a;">${ticketId}</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Logistics</h3>
              <p style="margin: 5px 0; font-size: 15px;">📅 <strong>${event.date}</strong> at <strong>${event.time}</strong></p>
              <p style="margin: 5px 0; font-size: 15px;">📍 <strong>${event.location}</strong></p>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background-color: #f1f5f9; color: #64748b; font-size: 12px;">
            &copy; 2026 LeoEntrivo Platform. Designed by Leo Club of Athugalpura.
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"LeoEntrivo" <${GMAIL_EMAIL}>`,
        to: email,
        subject: `Pass for ${event.name}: ${ticketId}`,
        html: emailHtml,
        attachments: [{
          filename: 'pass-qr.png',
          content: qrBase64.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }]
      });
    }

    return NextResponse.json({ success: true, ticketId });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
