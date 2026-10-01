/**
 * VÉRONA — Luxury Email HTML Layout & Text Helper (Phase 25)
 *
 * Implements haute-couture email formatting, responsive tables,
 * secure text escaping, and accessible CTA buttons.
 */

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface EmailLayoutOptions {
  preheader: string;
  headline: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryInfoHtml?: string;
}

export function renderEmailHtml(options: EmailLayoutOptions): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verona.fashion";
  const ctaUrl = options.ctaUrl?.startsWith("http")
    ? options.ctaUrl
    : `${baseUrl}${options.ctaUrl || ""}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VÉRONA</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F8F7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #171717;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E5E5E5;
    }
    .header {
      padding: 36px 32px 24px;
      text-align: center;
      border-bottom: 1px solid #F0F0EE;
    }
    .brand-title {
      font-family: "Didot", "Bodoni MT", "Cinzel", Georgia, serif;
      font-size: 26px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #0A0A0A;
      margin: 0;
      font-weight: 300;
    }
    .brand-subtitle {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #8C827A;
      margin-top: 6px;
    }
    .content {
      padding: 40px 32px;
    }
    .headline {
      font-family: "Didot", "Bodoni MT", Georgia, serif;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: 0.05em;
      color: #171717;
      margin: 0 0 20px;
    }
    .body-text {
      font-size: 14px;
      line-height: 1.7;
      color: #404040;
      margin: 0 0 24px;
    }
    .btn-container {
      padding: 16px 0 32px;
      text-align: center;
    }
    .btn-primary {
      display: inline-block;
      padding: 14px 32px;
      background-color: #0F0F0F;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 600;
      border-radius: 1px;
    }
    .footer {
      padding: 32px;
      background-color: #FAFAF9;
      border-top: 1px solid #EFEFEF;
      text-align: center;
      font-size: 11px;
      color: #737373;
      line-height: 1.6;
    }
    .footer a {
      color: #171717;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <!-- Preheader preview text -->
  <div style="display:none;font-size:1px;color:#F8F8F7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(options.preheader)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding: 30px 15px;">
        <table class="container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 class="brand-title">VÉRONA</h1>
              <div class="brand-subtitle">Atelier &bull; Haute Couture &bull; Pan-India</div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content">
              <h2 class="headline">${escapeHtml(options.headline)}</h2>
              ${options.contentHtml}

              ${
                options.ctaText && options.ctaUrl
                  ? `<div class="btn-container">
                      <a href="${escapeHtml(ctaUrl)}" class="btn-primary" target="_blank">
                        ${escapeHtml(options.ctaText)}
                      </a>
                    </div>`
                  : ""
              }

              ${options.secondaryInfoHtml || ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 8px;">
                VÉRONA Atelier Client Concierge &bull; Contact: concierge@verona.fashion
              </p>
              <p style="margin: 0 0 8px;">
                Handcrafted bespoke garments and luxury ready-to-wear tailored across India.
              </p>
              <p style="margin: 0; font-size: 10px; color: #A3A3A3;">
                This transactional email was sent to your registered address regarding your atelier account.
                <br>Manage your notification settings anytime in <a href="${escapeHtml(baseUrl)}/account/settings/notifications">Client Preferences</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
