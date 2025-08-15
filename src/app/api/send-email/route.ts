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

    const emailHtml = `
      <div style="font-family: 'PT Sans', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="padding: 25px; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="padding: 25px;">
                <p>Dear Member,</p>
                <p>${body.replace(/\n/g, '<br>')}</p>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding: 20px 25px; background-color: #f9fafb;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td valign="top">
                      <p style="margin: 0; font-weight: bold; font-size: 15px; color: #1e3a8a;">LEO CLUB OF ATHUGALPURA</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #555555;">Leo District 306 D9 | Sri Lanka</p>
                      <p style="margin: 5px 0 0 0; font-size: 11px; color: #777777;">Leostic Year 2025/26</p>
                      <p style="margin-top: 15px;">
                          <a href="https://www.facebook.com/leoclubofathugalpura/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook" width="24" height="24">
                          </a>
                          <a href="https://www.instagram.com/athugalpuraleos/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://img.icons8.com/color/48/instagram-new--v1.png" alt="Instagram" width="24" height="24">
                          </a>
                          <a href="https://www.youtube.com/channel/UCe23x0ATwC2rIqA5RKWuF6w" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://img.icons8.com/color/48/youtube-play.png" alt="YouTube" width="24" height="24">
                          </a>
                          <a href="https://www.tiktok.com/@athugalpuraleos" target="_blank" style="text-decoration: none;">
                              <img src="https://img.icons8.com/color/48/tiktok--v1.png" alt="TikTok" width="24" height="24">
                          </a>
                      </p>
                    </td>
                    <td align="right" valign="top" style="width: 70px;">
                      <img src="https://i.imgur.com/aRktweQ.png" alt="Leo Club Logo" width="60" style="width: 60px; height: auto;" data-ai-hint="club logo">
                    </td>
                  </tr>
                </table>
              </div>
          </div>
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
