import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { NotificationType } from './email-service';

export interface OutboxEntry {
  id: string;
  orderId?: string | null;
  eventType: NotificationType;
  recipient: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  providerMessageId?: string | null;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  attempts: number;
  lastError?: string | null;
  nextAttemptAt?: string | null;
  createdAt: string;
  sentAt?: string | null;
  updatedAt: string;
}

// In-memory fallback map for unit test runs and offline mock execution
const inMemoryOutbox = new Map<string, OutboxEntry>();

function isPersistenceActive(): boolean {
  return (
    process.env.COMMERCE_PERSISTENCE_ENABLED === 'true' &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export class NotificationOutboxService {
  /**
   * Check if a notification with this idempotency key was already delivered.
   */
  async isAlreadyDelivered(idempotencyKey: string): Promise<boolean> {
    if (!isPersistenceActive()) {
      const entry = inMemoryOutbox.get(idempotencyKey);
      return entry?.status === 'sent';
    }

    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('commerce_notification_outbox')
        .select('id, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (error || !data) return false;
      return data.status === 'sent';
    } catch {
      return false;
    }
  }

  /**
   * Records that an email sending attempt has started.
   */
  async recordSending(input: {
    orderId?: string | null;
    eventType: NotificationType;
    recipient: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date().toISOString();

    if (!isPersistenceActive()) {
      const existing = inMemoryOutbox.get(input.idempotencyKey);
      inMemoryOutbox.set(input.idempotencyKey, {
        id: existing?.id || `mem-${Date.now()}`,
        orderId: input.orderId,
        eventType: input.eventType,
        recipient: input.recipient,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        status: 'sending',
        attempts: (existing?.attempts ?? 0) + 1,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      return;
    }

    try {
      const supabase = getSupabaseAdminClient();
      // Upsert outbox row
      await supabase.from('commerce_notification_outbox').upsert(
        {
          order_id: input.orderId || null,
          event_type: input.eventType,
          recipient: input.recipient,
          idempotency_key: input.idempotencyKey,
          payload: input.payload,
          status: 'sending',
          attempts: 1,
          updated_at: now,
        },
        { onConflict: 'idempotency_key' },
      );
    } catch (err) {
      console.warn('[NotificationOutbox] Failed to record sending state:', err);
    }
  }

  /**
   * Marks notification as sent successfully.
   */
  async recordSuccess(
    idempotencyKey: string,
    providerMessageId?: string | null,
  ): Promise<void> {
    const now = new Date().toISOString();

    if (!isPersistenceActive()) {
      const existing = inMemoryOutbox.get(idempotencyKey);
      if (existing) {
        existing.status = 'sent';
        existing.providerMessageId = providerMessageId;
        existing.sentAt = now;
        existing.updatedAt = now;
      }
      return;
    }

    try {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from('commerce_notification_outbox')
        .update({
          status: 'sent',
          provider_message_id: providerMessageId ?? null,
          sent_at: now,
          updated_at: now,
          last_error: null,
        })
        .eq('idempotency_key', idempotencyKey);
    } catch (err) {
      console.warn('[NotificationOutbox] Failed to record success state:', err);
    }
  }

  /**
   * Marks notification as failed with error details for retry or operator investigation.
   */
  async recordFailure(
    idempotencyKey: string,
    error: string,
    nextAttemptMinutes: number = 15,
  ): Promise<void> {
    const now = new Date();
    const nextAttempt = new Date(now.getTime() + nextAttemptMinutes * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    if (!isPersistenceActive()) {
      const existing = inMemoryOutbox.get(idempotencyKey);
      if (existing) {
        existing.status = 'failed';
        existing.lastError = error;
        existing.nextAttemptAt = nextAttempt;
        existing.updatedAt = nowIso;
      }
      return;
    }

    try {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from('commerce_notification_outbox')
        .update({
          status: 'failed',
          last_error: error.slice(0, 1000),
          next_attempt_at: nextAttempt,
          updated_at: nowIso,
        })
        .eq('idempotency_key', idempotencyKey);
    } catch (err) {
      console.warn('[NotificationOutbox] Failed to record failure state:', err);
    }
  }

  /**
   * Query recent outbox entries for an order or operations inspection.
   */
  async queryByOrder(orderId: string): Promise<OutboxEntry[]> {
    if (!isPersistenceActive()) {
      return Array.from(inMemoryOutbox.values()).filter((e) => e.orderId === orderId);
    }

    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('commerce_notification_outbox')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as OutboxEntry[];
    } catch {
      return [];
    }
  }
}

let outboxInstance: NotificationOutboxService | null = null;

export function getNotificationOutbox(): NotificationOutboxService {
  if (!outboxInstance) {
    outboxInstance = new NotificationOutboxService();
  }
  return outboxInstance;
}
