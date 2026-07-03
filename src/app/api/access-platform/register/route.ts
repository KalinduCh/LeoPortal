
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

const PLATFORM_REGISTRATIONS = 'accessRegistrations';

const OFFICIAL_SENDER = process.env.GMAIL_TICKET_EMAIL || "noreplydistrictconferenced9@gmail.com";
const GMAIL_PASSWORD = process.env.GMAIL_TICKET_APP_PASSWORD || "ceth hegq xouv nrvl";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
        eventId, eventName, eventDate, eventTime, eventLocation, 
        name, email, club, contactNumber, role, foodPreference,
        submitterInfo, customEmailBody, attachmentUrl, attachmentName,
        tierName, priceAtRegistration
    } = data;

    if (!eventId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ticketId = `ENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const qrPayload = JSON.stringify({ ticketId, eventId });
    const qrBase64 = await QRCode.toDataURL(qrPayload, {
      color: { dark: '#1e3a8a', light: '#ffffff' },
      margin: 2,
      width: 400
    });

    let finalEmailStatus: 'success' | 'failed' = 'failed';

    if (OFFICIAL_SENDER && GMAIL_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: OFFICIAL_SENDER, pass: GMAIL_PASSWORD },
          pool: true,
          maxConnections: 5,
        });

        const foodLabel = foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian';
        const defaultBody = `Your registration for <strong>${eventName}</strong> is successful. Please show the QR code below at the check-in desk for entry.`;
        const emailContent = customEmailBody ? customEmailBody.replace(/\n/g, '<br>') : defaultBody;

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #1e3a8a; padding: 40px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">Entry Pass Issued</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-weight: 500;">${eventName}</p>
            </div>
            <div style="padding: 40px; background-color: white;">
              <p style="font-size: 18px; color: #1e293b; margin-top: 0;">Dear <strong>${name}</strong>,</p>
              <p style="color: #475569; line-height: 1.6;">${emailContent}</p>
              
              <div style="text-align: center; margin: 35px 0; padding: 30px; border: 2px dashed #cbd5e1; border-radius: 15px; background-color: #f8fafc;">
                <img src="cid:qrcode" alt="QR Pass" style="width: 200px; height: 200px; display: block; margin: 0 auto;" />
                <p style="font-family: monospace; font-weight: bold; font-size: 20px; margin: 15px 0 0 0; color: #1e3a8a;">${ticketId}</p>
                ${tierName ? `<p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0;">${tierName} Category • LKR ${priceAtRegistration.toLocaleString()}</p>` : ''}
              </div>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 10px;">
                <p style="margin: 0; font-size: 14px; color: #334155;">📅 <strong>${eventDate}</strong> at <strong>${eventTime}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #334155;">📍 <strong>${eventLocation}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #334155;">🍽️ Meal: <strong>${foodLabel}</strong></p>
              </div>
            </div>
          </div>
        `;

        const mailAttachments: any[] = [{
          filename: 'pass-qr.png',
          content: qrBase64.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }];

        if (attachmentUrl) {
            mailAttachments.push({
                filename: attachmentName || 'Event_Info',
                content: attachmentUrl.split('base64,')[1],
                encoding: 'base64'
            });
        }

        await transporter.sendMail({
          from: `"LeoEntrivo" <${OFFICIAL_SENDER}>`,
          to: email,
          subject: `Entry Pass: ${eventName} (${ticketId})`,
          html: emailHtml,
          attachments: mailAttachments
        });
        finalEmailStatus = 'success';
      } catch (err) {
        console.error("LEOENTRIVO_MAIL_ERROR:", err);
      }
    }

    const registrationData: any = {
      eventId,
      name,
      email,
      club: club || 'Individual',
      contactNumber: contactNumber || '',
      role: role || 'Guest',
      foodPreference: foodPreference || 'non_veg',
      ticketId,
      status: 'registered',
      emailStatus: finalEmailStatus,
      tierName: tierName || 'Standard',
      priceAtRegistration: priceAtRegistration || 0,
      createdAt: serverTimestamp(),
    };

    if (submitterInfo) registrationData.registeredBy = submitterInfo;

    await addDoc(collection(db, PLATFORM_REGISTRATIONS), registrationData);

    return NextResponse.json({ success: true, ticketId, emailStatus: finalEmailStatus });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
