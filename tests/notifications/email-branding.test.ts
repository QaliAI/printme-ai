import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderPrintMeEmail } from '@/lib/notifications/email-branding';
import { HttpEmailTransport } from '@/lib/notifications/email-service';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('PrintMe branded transactional email', () => {
  const plain = '<!DOCTYPE html><html><body><div><h1 style="font-size:24px">PRINTME.AI</h1>' +
    '<p>Order PM-100 — <strong>$34.00</strong></p></div>' +
    '<footer style="color:#888">Legacy generic footer</footer></body></html>';

  it.each([
    ['order_confirmed', 'ORDER / CONFIRMED', '#F7D431'],
    ['order_shipped', 'ORDER / SHIPPED', '#F23D99'],
    ['order_delivered', 'ORDER / DELIVERED', '#F7D431'],
    ['order_attention_required', 'ORDER / AN UPDATE', '#FF5B35'],
    ['order_refunded', 'ORDER / REFUNDED', '#F7D431'],
  ] as const)('%s uses approved brand artwork, layout and status palette', (kind, label, accent) => {
    const html = renderPrintMeEmail(plain, kind, 'Your order update');
    expect(html).toContain('<table role="presentation"');
    expect(html).toContain('https://www.printme.ai/email/printme-header.png');
    expect(html).toContain('#F4F0E8');
    expect(html).toContain('#111111');
    expect(html).toContain(accent);
    expect(html).toContain(label);
    expect(html).toContain('Order PM-100');
    expect(html).toContain('$34.00');
    expect(html).toContain('mailto:support@printme.ai');
    expect(html).not.toContain('Legacy generic footer');
    expect(html).not.toContain('<h1 style="font-size:24px">PRINTME.AI</h1>');
    expect(html.match(/<html\b/g)).toHaveLength(1);
    expect(html.match(/<\/html>/g)).toHaveLength(1);
  });

  it('escapes an untrusted email preheader and keeps it out of visible content', () => {
    const html = renderPrintMeEmail(plain, 'order_confirmed', '<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('display:none!important');
  });

  it('recognizes legacy lowercase Resend env without leaking the token in email payloads', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('resend_api_key', 're_test_legacy_lowercase');
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer re_test_legacy_lowercase');
      expect(init.body).not.toContain('re_test_legacy_lowercase');
      return { ok: true, json: async () => ({ id: 'email_test_success' }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await new HttpEmailTransport().send({
      idempotencyKey: 'test-branded-email-key',
      type: 'order_confirmed',
      to: 'example@example.test',
      subject: 'Test only',
      html: renderPrintMeEmail(plain, 'order_confirmed', 'Test only'),
      text: 'Test only',
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('email_test_success');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
