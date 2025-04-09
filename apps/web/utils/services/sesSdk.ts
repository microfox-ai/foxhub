import { createSESSdk } from "@microfox/aws-ses";

export const sesSdk = createSESSdk({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "sladivjkvnkjb",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "sladivjkvnkjb",
  region: "us-east-1",
});

interface EmailTemplateOptions {
  title: string;
  content: string;
  ctaText?: string;
  ctaLink?: string;
  footerText?: string;
}

export const generateMicrofoxEmailTemplate = ({
  title,
  content,
  ctaText,
  ctaLink,
  footerText = "© 2024 Microfox. All rights reserved.",
}: EmailTemplateOptions): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin: 20px auto;
      overflow: hidden;
    }
    .header {
      background-color:rgb(219, 219, 219);
      padding: 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 30px;
      color: #333333;
      max-width: 400px;
      margin: 0 auto;
    }
    .title {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      text-align: left;
    }
    .message {
      color: #4a4a4a;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .cta-button {
      display: inline-block;
      background-color: #2b7fff;
      color: #ffffff;
      text-decoration: none;
      padding: 6px 24px;
      border-radius: 24px;
      font-weight: 500;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666666;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 10px !important;
      }
      .content {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <img src="https://microfox.app/logo.png" alt="Microfox Logo" class="logo">
      </div>
      <div class="content">
        <h1 class="title">${title}</h1>
        <div class="message">${content}</div>
        ${
          ctaText && ctaLink
            ? `
          <div>
            <a href="${ctaLink}" class="cta-button">${ctaText}</a>
          </div>
        `
            : ""
        }
      </div>
      <div class="footer">
        ${footerText}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const sendMicrofoxNotification = async (
  to: string,
  subject: string,
  options: EmailTemplateOptions
) => {
  const htmlContent = generateMicrofoxEmailTemplate(options);

  return sesSdk.sendEmail({
    sender: "notifications@microfox.ai",
    recipient: to,
    subject,
    bodyHtml: htmlContent,
  });
};
