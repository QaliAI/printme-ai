import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { PetGenerationError, type PetJob } from './schemas';

export type Reservation = { job: PetJob; shouldRun: boolean };
export interface PetGenerationStore {
  verify(): Promise<boolean>;
  reserve(input: { ownerHash: string; ipHash: string; requestId: string; requestHash: string; estimatedCostCents: number; dailyBudgetCents: number; ownerLimit: number; ipLimit: number; globalLimit: number }): Promise<Reservation>;
  finish(input: { jobId: string; ownerHash: string; status: 'completed' | 'failed' | 'uncertain'; originalPath?: string; previewPath?: string; providerRequestId?: string }): Promise<void>;
  find(jobId: string, ownerHash: string): Promise<PetJob | null>;
}

export class SupabasePetGenerationStore implements PetGenerationStore {
  async verify() {
    const { data, error } = await getSupabaseAdminClient().rpc('pets_generation_ledger_version');
    if (error || data !== 1) return false;
    const bucket = await getSupabaseAdminClient().storage.getBucket('user-uploads');
    return !bucket.error && bucket.data?.public === false;
  }
  async reserve(input: Parameters<PetGenerationStore['reserve']>[0]): Promise<Reservation> {
    const { data, error } = await getSupabaseAdminClient().rpc('reserve_pets_generation', {
      p_owner_hash: input.ownerHash, p_ip_hash: input.ipHash, p_request_id: input.requestId,
      p_request_hash: input.requestHash, p_estimated_cost_cents: input.estimatedCostCents,
      p_daily_budget_cents: input.dailyBudgetCents, p_owner_limit: input.ownerLimit,
      p_ip_limit: input.ipLimit, p_global_limit: input.globalLimit,
    });
    if (error) {
      if (error.code === 'P0001') throw new PetGenerationError('PETS_ALLOWANCE_REACHED', 'The portrait preview allowance has been reached. Please try another day.', 429);
      if (error.code === '23505') throw new PetGenerationError('PETS_REQUEST_CONFLICT', 'This request was already used for a different portrait. Start a new portrait request.', 409);
      throw new PetGenerationError('PETS_LEDGER_UNAVAILABLE', 'Portrait generation is temporarily unavailable. Your photos have not been sent.');
    }
    if (!data || typeof data !== 'object' || !data.job) throw new PetGenerationError('PETS_LEDGER_UNAVAILABLE', 'Portrait generation is temporarily unavailable.');
    return { job: data.job as PetJob, shouldRun: data.should_run === true };
  }
  async finish(input: Parameters<PetGenerationStore['finish']>[0]) {
    const { error } = await getSupabaseAdminClient().rpc('finish_pets_generation', {
      p_job_id: input.jobId, p_owner_hash: input.ownerHash, p_status: input.status,
      p_original_path: input.originalPath ?? null, p_preview_path: input.previewPath ?? null,
      p_provider_request_id: input.providerRequestId ?? null,
    });
    if (error) throw new PetGenerationError('PETS_SAVE_UNCERTAIN', 'Your portrait needs recovery. Reopening this request will not charge for another render.');
  }
  async find(jobId: string, ownerHash: string) {
    const { data, error } = await getSupabaseAdminClient().from('pets_generation_jobs')
      .select('id,status,owner_hash,request_hash,original_path,preview_path,provider_request_id')
      .eq('id', jobId).eq('owner_hash', ownerHash).maybeSingle();
    if (error) throw new PetGenerationError('PETS_LOOKUP_UNAVAILABLE', 'Your saved portrait is temporarily unavailable.');
    return data as PetJob | null;
  }
}
