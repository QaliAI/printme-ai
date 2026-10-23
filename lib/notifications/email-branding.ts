/**
 * Email-client-compatible PrintMe brand frame.
 * Tokens: brand/references/PrintMe_Punk_Brand_Kit_v1/04_Developer_Handoff/brand-tokens.json.
 * Table layout, inline styles and PNG artwork are intentional for Gmail/Outlook.
 */
import type { NotificationType } from './email-service';

const ink = '#111111';
const paper = '#F4F0E8';
const pink = '#F23D99';
const yellow = '#F7D431';
const orange = '#FF5B35';

const variants: Record<NotificationType, { label: string; headline: string; stripe: string }> = {
  order_confirmed: { label: 'ORDER / CONFIRMED', headline: 'YOUR ORDER IS IN.', stripe: yellow },
  order_shipped: { label: 'ORDER / SHIPPED', headline: 'ON ITS WAY.', stripe: pink },
  order_delivered: { label: 'ORDER / DELIVERED', headline: 'IT HAS LANDED.', stripe: yellow },
  order_attention_required: { label: 'ORDER / AN UPDATE', headline: 'A QUICK HEADS-UP.', stripe: orange },
  order_refunded: { label: 'ORDER / REFUNDED', headline: 'REFUND UPDATE.', stripe: yellow },
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Restyle legacy notification bodies without touching escaping, amounts, recipient
 * details, tracking, event logic, or the durable notification outbox.
 */
export function renderPrintMeEmail(html: string, kind: NotificationType, preheader: string): string {
  const v = variants[kind];
  const inner = (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html)
    .replace(/<h1\b[^>]*>\s*PRINTME\.AI\s*<\/h1>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/#f0fdf4/gi, paper)
    .replace(/#bbf7d0/gi, yellow)
    .replace(/#166534/gi, ink)
    .replace(/#fffbeb/gi, paper)
    .replace(/#fde68a/gi, yellow)
    .replace(/#92400e/gi, ink)
    .replace(/#78350f/gi, ink);
  return [
    '<!doctype html><html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light"><title>', esc(v.label), ' | PrintMe.ai</title></head>',
    '<body style="margin:0;padding:0;background-color:', paper,
    ';color:', ink, ';font-family:Arial,Helvetica,sans-serif;">',
    '<div style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">',
    esc(preheader), '</div>',
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="',
    paper, '" style="border-collapse:collapse;background-color:', paper, ';">',
    '<tr><td align="center" style="padding:24px 12px 40px;">',
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#FFFFFF;border:2px solid ',
    ink, ';">',
    '<tr><td bgcolor="', ink, '" style="padding:0;background-color:', ink, ';">',
    '<a href="https://www.printme.ai" style="display:block;text-decoration:none;color:#FFFFFF;">',
    '<img src="https://www.printme.ai/email/printme-header.png" width="600" height="160" alt="PrintMe.ai — Your imagination. No permission required." border="0" style="display:block;width:100%;max-width:600px;height:auto;border:0;color:#FFFFFF;font-size:22px;font-weight:900;text-align:center;"></a></td></tr>',
    '<tr><td bgcolor="', v.stripe, '" style="padding:14px 28px;background-color:', v.stripe,
    ';border-top:2px solid ', ink, ';border-bottom:2px solid ', ink, ';">',
    '<p style="margin:0;color:', ink,
    ';font-size:11px;line-height:16px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">',
    esc(v.label), '</p></td></tr>',
    '<tr><td style="padding:30px 28px 8px;background-color:#FFFFFF;">',
    '<h1 style="margin:0;color:', ink,
    ';font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;letter-spacing:-1px;font-weight:900;text-transform:uppercase;">',
    esc(v.headline), '</h1></td></tr>',
    '<tr><td style="padding:12px 28px 30px;color:', ink,
    ';font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;">',
    inner, '</td></tr>',
    '<tr><td bgcolor="', paper, '" style="padding:22px 28px;border-top:2px solid ',
    ink, ';background-color:', paper, ';">',
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>',
    '<td style="vertical-align:top;color:', ink, ';font-size:12px;line-height:18px;">',
    '<strong style="font-size:16px;letter-spacing:-.3px;">PRINTME.AI</strong>',
    '<div style="margin-top:4px;">YOUR IMAGINATION. NO PERMISSION REQUIRED.</div></td>',
    '<td align="right" style="vertical-align:top;font-size:12px;line-height:19px;">',
    '<a href="mailto:support@printme.ai" style="color:', ink,
    ';text-decoration:underline;font-weight:bold;">Need help?</a>',
    '<div><a href="https://www.printme.ai" style="color:', ink,
    ';text-decoration:underline;">Shop PrintMe.ai</a></div></td>',
    '</tr></table></td></tr>',
    '<tr><td bgcolor="', ink, '" style="height:7px;line-height:7px;font-size:1px;">&nbsp;</td></tr>',
    '</table><p style="font-family:Arial,Helvetica,sans-serif;color:', ink,
    ';font-size:11px;line-height:17px;margin:16px 0 0;">',
    'An order update from PrintMe.ai. Questions? Reply to this email.</p>',
    '</td></tr></table></body></html>',
  ].join('');
}
