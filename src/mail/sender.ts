import nodemailer from 'nodemailer';
import type { DeliveryKind, EmailPayload } from './types.js';

const SUBJECT_MARK: Record<DeliveryKind, string> = {
  primary: '',
  backup: '[予備配信・primary 未着] ',
  manual: '[手動送信] ',
};

/**
 * メールの件名を組み立てる。backup と manual には件名の先頭に印を付け、
 * 定時配信が届かなかった日を受信箱で見分けられるようにする。
 * @param payload メールのコンテンツ
 */
export function buildSubject(payload: EmailPayload): string {
  return `${SUBJECT_MARK[payload.deliveryKind]}[AI News] ${payload.deliveryDate} の AI/テックニュース ${payload.totalCount} 件`;
}

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

  const subject = buildSubject(payload);

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
