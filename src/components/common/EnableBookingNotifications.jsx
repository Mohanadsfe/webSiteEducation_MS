import React, { useEffect, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import {
  enableBookingNotifications,
  pushSupport,
  refreshBookingNotifications,
} from '../../services/PushService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Permission is requested only when the student clicks the button.
 */
export default function EnableBookingNotifications() {
  const { t } = useLanguage();
  const [uid, setUid] = useState('');
  const [permission, setPermission] = useState('default');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const support = pushSupport();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : '');
      setStatus('');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    if (!uid || Notification.permission !== 'granted') return undefined;
    let cancel = false;
    refreshBookingNotifications(uid).then((result) => {
      if (cancel || result.ok || result.reason === 'not-granted') return;
      if (result.reason === 'missing-config') setStatus('missing-config');
    });
    return () => {
      cancel = true;
    };
  }, [uid]);

  if (!uid) return null;

  const enabled = permission === 'granted' && support !== 'missing-config' && status !== 'failed';

  const onEnable = async () => {
    setBusy(true);
    setStatus('');
    const result = await enableBookingNotifications(uid);
    setBusy(false);
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    if (result.ok) {
      setStatus('on');
      return;
    }
    setStatus(result.reason || 'failed');
  };

  const problem = status === 'denied' || permission === 'denied'
    ? t(
      'المتصفح منع الإشعارات. اسمح بها من إعدادات الموقع في المتصفح، ثم اضغط الزر مرة أخرى.',
      'הדפדפן חסם התראות. אשרו אותן בהגדרות האתר ואז לחצו שוב.'
    )
    : status === 'failed'
      ? t(
        'تعذر حفظ إشعار هذا الجهاز. تحقق من الاتصال وحاول مرة أخرى.',
        'לא הצלחנו לשמור את ההתראה במכשיר זה. בדקו את החיבור ונסו שוב.'
      )
      : '';

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Button
        variant="contained"
        color={enabled || status === 'on' ? 'success' : 'primary'}
        startIcon={<NotificationsActiveIcon />}
        disabled={busy || support === 'unsupported' || support === 'insecure' || support === 'ios-home-screen' || support === 'missing-config'}
        onClick={onEnable}
        sx={{ fontWeight: 900, borderRadius: 2, alignSelf: 'flex-start' }}
      >
        {enabled || status === 'on'
          ? t('إشعارات الحجز مفعّلة', 'התראות ההזמנה פעילות')
          : t('تفعيل إشعارات الحجز', 'הפעלת התראות הזמנה')}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
        {t(
          'Enable Booking Notifications — تنبيه في الجهاز عند اقتراب المحاضرة، وليس رسالة SMS. يحتاج إذناً واتصالاً بالإنترنت. لا يُطلب الإذن إلا بعد الضغط.',
          'Enable Booking Notifications — התראה במכשיר לפני השיעור, לא SMS. נדרשים אישור וחיבור לאינטרנט. האישור מתבקש רק אחרי לחיצה.'
        )}
      </Typography>
      {support === 'ios-home-screen' && (
        <Alert severity="info">
          {t(
            'على iPhone و iPad، إشعارات الموقع تعمل فقط بعد إضافة الموقع إلى الشاشة الرئيسية (iOS 16.4 أو أحدث) وفتحه من الأيقونة، ثم الضغط على الزر والموافقة. هذا ليس متاحاً من تبويب Safari العادي.',
            'ב-iPhone וב-iPad התראות אתר עובדות רק אחרי הוספה למסך הבית (iOS 16.4 ומעלה), פתיחה מהאייקון, ואז אישור. לא מתוך לשונית Safari רגילה.'
          )}
        </Alert>
      )}
      {support === 'unsupported' && (
        <Alert severity="warning">
          {t(
            'هذا المتصفح لا يدعم إشعارات المواقع. جرّب Chrome على أندرويد أو متصفح سطح المكتب.',
            'הדפדפן הזה לא תומך בהתראות אתר. נסו Chrome באנדרואיד או דפדפן במחשב.'
          )}
        </Alert>
      )}
      {support === 'insecure' && (
        <Alert severity="warning">
          {t(
            'الإشعارات تعمل على الموقع المنشور أو على localhost فقط.',
            'התראות עובדות באתר המפורסם או ב-localhost בלבד.'
          )}
        </Alert>
      )}
      {(support === 'missing-config' || status === 'missing-config') && (
        <Alert severity="warning">
          {t(
            'مفتاح Web Push غير موجود بعد. من Firebase Console: Project settings ثم Cloud Messaging ثم Web configuration ثم Web Push certificates ثم Generate key pair. انسخ المفتاح العام إلى ملف .env في جذر المشروع بالسطر REACT_APP_FIREBASE_VAPID_KEY= ثم أعد تشغيل الموقع. لا تضع المفتاح الخاص في الموقع.',
            'מפתח Web Push עדיין חסר. ב-Firebase Console: Project settings, אחר כך Cloud Messaging, Web configuration, Web Push certificates, Generate key pair. העתיקו את המפתח הציבורי לקובץ .env בשורש הפרויקט בשורה REACT_APP_FIREBASE_VAPID_KEY= והפעילו מחדש. אל תשימו את המפתח הפרטי באתר.'
          )}
        </Alert>
      )}
      {problem && <Alert severity="warning">{problem}</Alert>}
    </Stack>
  );
}
