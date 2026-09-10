
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface EmailRequestBody {
    to: string;
    subject: string;
    body: string;
    attachments?: {
        filename: string;
        content: string;
        contentType: string;
    }[];
}

export async function POST(request: Request) {
  try {
    const { to, subject, body, attachments }: EmailRequestBody = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Mapped to user's specific Netlify variable names
    const GMAIL_EMAIL = process.env.GMAIL_TICKET_CLUB_EMAIL || "athugalpuraleoclub306d9@gmail.com";
    const GMAIL_APP_PASSWORD = process.env.GMAIL_TICKET_CLUB_PASSWORD || "osng xjdz lhwu movh";

    console.log(`[Communication] Sending email to ${to} via ${GMAIL_EMAIL}`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; padding: 25px; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; padding: 25px;">
            <p>Dear Member,</p>
            <p>${body.replace(/\n/g, '<br>')}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">Leo Club of Athugalpura | Leo District 306 D9</p>
          </div>
      </div>
    `;

    const mailOptions: any = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to: to,
        subject: subject,
        html: emailHtml,
    };
    
    if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            encoding: 'base64',
            contentType: att.contentType,
        }));
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (err: any) {
    console.error("[API_SEND_EMAIL_ERROR]", err);
    return NextResponse.json({ error: 'Failed to send email', details: err.message }, { status: 500 });
  }
}
