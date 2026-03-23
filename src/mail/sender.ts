import nodemailer from 'nodemailer';
import type { EmailPayload } from './types.js';

/**
 * Gmail SMTP 経由でダイジストメールを送信する。
 * @param payload メールのコンテンツ
 * @param config Gmail 認証情報と宛先
 */
export async function sendEmail(
  payload: EmailPayload,
  config: {
    gmailUser: string;
    gmailAppPassword: string;
    recipientEmail: string;
  }
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  const subject = `[AI News] ${payload.deliveryDate} の AI/テックニュース ${payload.totalCount} 件`;

  await transporter.sendMail({
    from: `"AI News Digest" <${config.gmailUser}>`,
    to: config.recipientEmail,
    subject,
    html: payload.html,
    text: payload.text,
    encoding: 'utf8',
  });

  console.log(`[mail] メール送信完了: ${subject}`);
}
