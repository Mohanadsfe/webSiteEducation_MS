import dayjs from 'dayjs';
import { parseAppointmentStart } from './AppointmentsService';

export function bookingStats(list, now = dayjs()) {
  let upcoming = 0;
  let completed = 0;
  let earlyCancels = 0;
  let lateCancels = 0;
  (list || []).forEach((booking) => {
    const status = String(booking.status || '').toLowerCase();
    const cancelled = status === 'cancelled' || status === 'canceled';
    if (booking.cancelKind === 'late' || (cancelled && booking.countsAsUsed === true)) {
      lateCancels += 1;
      return;
    }
    if (booking.cancelKind === 'early' || cancelled) {
      earlyCancels += 1;
      return;
    }
    if (status === 'rejected' || status === 'revoked') return;
    const start = parseAppointmentStart(booking);
    if (start && start.isBefore(now)) completed += 1;
    else upcoming += 1;
  });
  return { upcoming, completed, earlyCancels, lateCancels };
}
