import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

const GOOGLE_SCHEDULE_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2u0ljpb9p-J_IQUtiPKG98M7BUChRGN0RUYGt7GIvQjhBMdu65szu-vCuz8J9F9yj5BSWTCVeu?gv=true';

/**
 * Original Google Appointment Schedule.
 * Google’s iframe cannot expose the inner “Book” click, so when the user
 * interacts with the calendar and returns to the page, we trigger payment.
 */
const GoogleCalendar = ({ onAfterPickTime }) => {
  const interactedRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const onWindowBlur = () => {
      // Focus usually moves into the Google iframe when the user picks a slot
      interactedRef.current = true;
    };

    const onWindowFocus = () => {
      if (interactedRef.current && !firedRef.current && typeof onAfterPickTime === 'function') {
        firedRef.current = true;
        interactedRef.current = false;
        onAfterPickTime();
        // Allow another payment open on a later booking attempt
        setTimeout(() => {
          firedRef.current = false;
        }, 4000);
      }
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [onAfterPickTime]);

  return (
    <Box sx={{ direction: 'rtl' }}>
      <Typography
        component="h2"
        sx={{ fontWeight: 900, mb: 1.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}
      >
        Education Calendar_MS
      </Typography>
      <iframe
        title="Google Calendar"
        src={GOOGLE_SCHEDULE_URL}
        style={{ border: 0, borderRadius: 12, width: '100%', minHeight: 675 }}
        width="100%"
        height="675"
      />
    </Box>
  );
};

export default GoogleCalendar;
