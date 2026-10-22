import { createHash, randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ find: vi.fn(), verify: vi.fn(), signed: vi.fn(), auth: vi.fn() }));
vi.mock('@/lib/pets/store', () => ({ SupabasePetGenerationStore: class { find = mock.find; verify = mock.verify; } }));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdminClient: () => ({ storage: { from: () => ({ createSignedUrl: mock.signed }) }, auth: { getUser: mock.auth } }) }));
import { GET as readiness } from '@/app/api/pets/readiness/route';
import { POST as generate } from '@/app/api/pets/generations/route';
import { GET as status } from '@/app/api/pets/generations/[jobId]/route';
import { GET as preview } from '@/app/api/pets/generations/[jobId]/preview/route';
import { GET as download } from '@/app/api/pets/generations/[jobId]/download/route';
import { petIdentity } from '@/lib/pets/server';

const token = 'a'.repeat(43);
const ownerHash = createHash('sha256').update(`guest:${token}`).digest('hex');
const request = (path: string, init?: RequestInit) => new NextRequest(`https://www.printme.ai${path}`, { ...init, signal: init?.signal ?? undefined, headers: { cookie: `printme_pets_session=${token}`, ...init?.headers } });
beforeEach(() => { vi.stubEnv('PETS_GENERATION_ENABLED', 'false'); mock.find.mockReset().mockResolvedValue(null); mock.verify.mockReset().mockResolvedValue(false); mock.signed.mockReset(); mock.auth.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe('Pets HTTP safety boundaries', () => {
  it('reports disabled readiness without a ledger/provider call and sets a private recovery cookie', async () => {
    const response = await readiness(new NextRequest('https://www.printme.ai/api/pets/readiness'));
    expect(await response.json()).toMatchObject({ enabled: false }); expect(mock.verify).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toContain('HttpOnly'); expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('rejects cross-origin generation and oversized bodies before any ledger/provider access', async () => {
    const crossOrigin = await generate(request('/api/pets/generations', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{}' }));
    expect(crossOrigin.status).toBe(403);
    const large = await generate(request('/api/pets/generations', { method: 'POST', headers: { origin: 'https://www.printme.ai', 'content-type': 'application/json', 'content-length': '3100001' }, body: '{}' }));
    expect(large.status).toBe(413); expect(mock.verify).not.toHaveBeenCalled();
  });
  it('returns a truthful no-spend disabled response and retains a new owner cookie on failure', async () => {
    const response = await generate(new NextRequest('https://www.printme.ai/api/pets/generations', { method: 'POST', headers: { origin: 'https://www.printme.ai', 'content-type': 'application/json' }, body: JSON.stringify({ requestId: randomUUID(), styleId: 'reigning-floof', subjectCount: 1, references: [{ dataUrl: 'data:image/png;base64,aGVsbG8=', role: 'pet' }] }) }));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: 'PETS_GENERATION_UNAVAILABLE' });
    expect(response.headers.get('set-cookie')).toContain('printme_pets_session='); expect(mock.verify).not.toHaveBeenCalled();
  });
  it('uses server-derived owner identity for status lookup and never exposes originals', async () => {
    const id = randomUUID(); mock.find.mockResolvedValue({ id, status: 'completed', original_path: 'secret', preview_path: `pets/${id}/preview.png` });
    const response = await status(request(`/api/pets/generations/${id}`), { params: Promise.resolve({ jobId: id }) });
    expect(mock.find).toHaveBeenCalledWith(id, ownerHash);
    const body = await response.json(); expect(body.previewUrl).toBe(`/api/pets/generations/${id}/preview`); expect(JSON.stringify(body)).not.toContain('secret');
  });
  it('returns the same 404 for missing and unowned portraits without signing anything', async () => {
    const id = randomUUID(); const response = await preview(request(`/api/pets/generations/${id}/preview`), { params: Promise.resolve({ jobId: id }) });
    expect(response.status).toBe(404); expect(mock.find).toHaveBeenCalledWith(id, ownerHash); expect(mock.signed).not.toHaveBeenCalled();
  });
  it('signs only a canonical watermarked preview for ten minutes', async () => {
    const id = randomUUID(); mock.find.mockResolvedValue({ id, status: 'completed', preview_path: `pets/${id}/preview.png`, original_path: `pets/${id}/original.png` });
    mock.signed.mockResolvedValue({ data: { signedUrl: 'https://storage.example.test/signed-preview.png' }, error: null });
    const response = await preview(request(`/api/pets/generations/${id}/preview`), { params: Promise.resolve({ jobId: id }) });
    expect(mock.signed).toHaveBeenCalledWith(`pets/${id}/preview.png`, 600); expect(response.status).toBe(307);
    expect(response.headers.get('cache-control')).toContain('no-store'); expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    mock.find.mockResolvedValue({ id, status: 'completed', preview_path: `pets/${id}/original.png` });
    expect((await preview(request(`/api/pets/generations/${id}/preview`), { params: Promise.resolve({ jobId: id }) })).status).toBe(404);
    expect(mock.signed).toHaveBeenCalledTimes(1);
  });
  it('denies arbitrary digital downloads regardless of caller-provided purchase identifiers', async () => {
    const response = await download(); expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ code: 'DIGITAL_PURCHASE_UNAVAILABLE' }); expect(mock.find).not.toHaveBeenCalled();
  });
  it('does not accept a forged bearer owner and hashes IPs before persistence', async () => {
    mock.auth.mockResolvedValue({ error: new Error('invalid'), data: { user: null } });
    await expect(petIdentity(request('/api/pets/readiness', { headers: { authorization: 'Bearer forged' } }))).rejects.toMatchObject({ status: 401 });
    vi.stubEnv('PETS_QUOTA_SECRET', 's'.repeat(32));
    const identity = await petIdentity(request('/api/pets/readiness', { headers: { 'x-forwarded-for': '192.0.2.12, 10.0.0.1' } }));
    expect(identity.ipHash).toMatch(/^[a-f0-9]{64}$/); expect(identity.ipHash).not.toContain('192.0.2.12');
  });
});
