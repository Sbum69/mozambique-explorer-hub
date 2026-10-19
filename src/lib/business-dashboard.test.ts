import { describe, expect, test } from 'vitest';
import { activityMetrics, bookingHasStarted, bookingMetrics } from './business-dashboard';
const now = Date.parse('2026-10-19T10:00:00Z');
describe('8E.4 real metrics', () => {
  const rows = ['pending','confirmed','completed','rejected','cancelled'].map(status => ({ status: status as 'pending'|'confirmed'|'completed'|'rejected'|'cancelled', date: '2026-10-20', time:'12:00' }));
  test('each booking state counted separately', () => expect(bookingMetrics(rows,now)).toEqual({ all:5,pending:1,confirmed:1,completed:1,rejected:1,cancelled:1,upcoming:1 }));
  test('rejected and cancelled are never confirmed/upcoming', () => expect(bookingMetrics(rows.slice(3),now)).toMatchObject({ confirmed:0,upcoming:0 }));
  test('upcoming excludes confirmed past bookings', () => expect(bookingMetrics([{status:'confirmed',date:'2026-10-18',time:'12:00'}],now).upcoming).toBe(0));
  test('completion uses Mozambique time, not browser timezone', () => { expect(bookingHasStarted('2026-10-19','12:00',now)).toBe(true); expect(bookingHasStarted('2026-10-19','12:01',now)).toBe(false); });
  const activities = [{id:'a',business_id:'b',active:true},{id:'i',business_id:'b',active:false}];
  test('active and inactive activities stay separate', () => expect(activityMetrics(activities,[],[{id:'b',status:'approved'}])).toMatchObject({total:2,active:1,inactive:1}));
  test('closed schedules never count as open', () => expect(activityMetrics(activities,[{experience_id:'a',active:true,accepts_new_bookings:false}],[{id:'b',status:'approved'}])).toMatchObject({open:0,closed:1}));
  test('inactive schedules or activities cannot accept bookings', () => expect(activityMetrics(activities,[{experience_id:'i',active:true,accepts_new_bookings:true},{experience_id:'a',active:false,accepts_new_bookings:true}],[{id:'b',status:'approved'}])).toMatchObject({open:0,unavailable:2}));
  test('pending business schedules cannot be open', () => expect(activityMetrics(activities,[{experience_id:'a',active:true,accepts_new_bookings:true}],[{id:'b',status:'pending'}])).toMatchObject({open:0,unavailable:1}));
  test('empty metrics return honest zero counts', () => expect(bookingMetrics([],now).all).toBe(0));
});
