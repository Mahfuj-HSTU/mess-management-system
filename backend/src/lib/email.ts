import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendDueReminderEmail({
  to,
  name,
  dueAmount,
  messName,
  month,
  year,
}: {
  to: string;
  name: string;
  dueAmount: number;
  messName: string;
  month: string;
  year: number;
}) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Payment Due Reminder — ${messName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">Payment Due Reminder</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">
          This is a friendly reminder that you have an outstanding balance for
          <strong>${messName}</strong> for the month of <strong>${month} ${year}</strong>.
        </p>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:6px;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#92400e;">
            Due Amount: ৳${dueAmount.toFixed(2)}
          </p>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          Please pay your dues to the manager at your earliest convenience.
        </p>
        <p style="color:#6b7280;font-size:14px;margin-top:16px;">
          — ${messName} Management System
        </p>
      </div>
    `,
  });
}
