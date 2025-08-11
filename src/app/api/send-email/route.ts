// src/app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Define the expected request body shape
interface EmailRequestBody {
    to: string;
    subject: string;
    body: string;
}

export async function POST(request: Request) {
  try {
    const { to, subject, body }: EmailRequestBody = await request.json();

    // Validate request body
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, and body are required.' }, { status: 400 });
    }

    const { GMAIL_EMAIL, GMAIL_APP_PASSWORD } = process.env;

    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
        console.error("Missing GMAIL_EMAIL or GMAIL_APP_PASSWORD from environment variables.");
        return NextResponse.json({ error: 'Server configuration error: Email credentials are not set.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    // Enhanced HTML with header and footer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <img src="https://i.imgur.com/aRktweQ.png" alt="LEO Portal Logo" style="width: 60px; height: 60px; margin-bottom: 10px;" data-ai-hint="club logo">
          <div style="margin-top: 10px;">
            <a href="https://www.facebook.com/leoclubofathugalpura/" style="margin: 0 8px; text-decoration: none;">
              <img src="https://i.imgur.com/3Y1aYxV.png" alt="Facebook" style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.instagram.com/athugalpuraleos/" style="margin: 0 8px; text-decoration: none;">
              <img src="https://i.imgur.com/aC3QJm8.png" alt="Instagram" style="width: 24px; height: 24px;">
            </a>
          </div>
        </div>
        <div style="padding: 25px;">
          <p>Dear Member,</p>
          ${body.replace(/\n/g, '<br>')}
        </div>
        <div style="text-align: left; padding: 25px; margin-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #555;">
          <p>Sincerely,<br>Leo Club Of Athugalpura<br>LEO District 306 D9</p>
        </div>
      </div>
    `;

    const mailOptions = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to: to, // Can be a single email or a comma-separated list
        subject: subject,
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (err: any) {
    console.error("Error in /api/send-email:", err);
    // Provide a more specific error message if available
    const errorMessage = err.message || 'An unknown error occurred while sending the email.';
    return NextResponse.json({ error: 'Failed to send email', details: errorMessage }, { status: 500 });
  }
}
