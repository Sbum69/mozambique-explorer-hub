import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { BOOKING_SELECT, mapBooking, type BookingRow } from './bookings';

export const getOwnerBookings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: roles, error: roleError } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId);
  if (roleError || !roles?.some(r => r.role === 'business_small' || r.role === 'business_large')) throw new Error('Forbidden');
  const { data: businesses, error } = await context.supabase.from('businesses').select('id').eq('owner_id', context.userId);
  if (error) throw new Error('Could not load businesses');
  const ids = (businesses ?? []).map(b => b.id);
  if (!ids.length) return [];
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const result = await context.supabase.from('bookings').select(BOOKING_SELECT).in('business_id', ids).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (result.error) throw new Error('Could not load bookings');
    rows.push(...(result.data ?? []).map(r => mapBooking(r as unknown as BookingRow)));
    if ((result.data?.length ?? 0) < 500) break;
  }
  return rows;
});

export const getAdminSummary = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !admin) throw new Error('Forbidden');
  const [profiles, businesses, activities, bookings, pending, recent] = await Promise.all([
    context.supabase.from('profiles').select('id', { count: 'exact', head: true }),
    context.supabase.from('businesses').select('id', { count: 'exact', head: true }),
    context.supabase.from('experiences').select('id', { count: 'exact', head: true }),
    context.supabase.from('bookings').select('id', { count: 'exact', head: true }),
    context.supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    context.supabase.from('businesses').select('id,name,status,created_at').order('created_at', { ascending: false }).order('id').limit(5),
  ]);
  for (const result of [profiles, businesses, activities, bookings, pending, recent]) if (result.error) throw new Error('Could not load summary');
  return { profiles: profiles.count ?? 0, businesses: businesses.count ?? 0, activities: activities.count ?? 0, bookings: bookings.count ?? 0, pending: pending.count ?? 0, recent: recent.data ?? [] };
});
