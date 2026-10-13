export interface FunnelEvent { event_name: string; properties: Record<string, unknown> | null }
export function summarizeFunnel(events: FunnelEvent[], paidOrders: { paid_amount: number | null }[]) {
  const count = (name: string) => events.filter(event => event.event_name === name).length;
  const top = (name: string, property: string) => {
    const counts = new Map<string, number>();
    for (const event of events.filter(e => e.event_name === name)) {
      const value = event.properties?.[property];
      if (typeof value !== 'string' || value.length > 120 || /@|https?:|data:/.test(value)) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts].map(([label, count]) => ({ label, count })).sort((a,b) => b.count-a.count).slice(0, 5);
  };
  const revenue = paidOrders.reduce((sum, order) => sum + (order.paid_amount ?? 0), 0);
  return {
    sessions: count('session_started'), designInteractions: count('design_view') + count('design_selected'),
    generations: events.filter(e => e.event_name === 'preview_generated' && e.properties?.source === 'photo-edit').length,
    addToCart: count('add_to_cart'), checkout: count('begin_checkout'), purchases: paidOrders.length,
    aovCents: paidOrders.length ? Math.round(revenue / paidOrders.length) : null,
    upsellAttachRate: count('add_to_cart') ? count('upsell_added') / count('add_to_cart') : null,
    topDesigns: top('design_selected', 'designId'), topSources: top('session_started', 'utm_source'),
  };
}
