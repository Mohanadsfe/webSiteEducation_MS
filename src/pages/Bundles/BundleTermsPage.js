import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, Button, Checkbox, FormControlLabel,
  Stack, Alert, CircularProgress, Divider, Chip, Link
} from '@mui/material';
import { ArrowBack, Gavel, PictureAsPdf } from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/FirebaseService';
import PaymentMethodDialog from '../../components/common/PaymentMethodDialog';
import { useLanguage } from '../../context/LanguageContext';
import {
  PLACEHOLDER_TERMS,
  TERMS_DOC_URL,
  computePricing,
} from '../../constants/bundleTerms';
import { contentTrackLabel } from '../../constants/tracks';

export default function BundleTermsPage() {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [readConfirm, setReadConfirm] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [termsDocUrl, setTermsDocUrl] = useState(TERMS_DOC_URL);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'packages', bundleId));
        if (!snap.exists()) {
          setBundle(null);
        } else {
          setBundle({ id: snap.id, ...snap.data() });
        }
        try {
          const settings = await getDoc(doc(db, 'site_settings', 'terms'));
          if (settings.exists() && settings.data().termsDocUrl) {
            setTermsDocUrl(settings.data().termsDocUrl);
          }
        } catch {
          /* optional settings */
        }
      } catch (e) {
        console.error(e);
        setBundle(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [bundleId]);

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!bundle) {
    return (
      <Container sx={{ py: 6, textAlign: 'center', direction: 'rtl' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('الرزمة غير موجودة', 'החבילה לא נמצאה')}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/bundles')}>
          {t('العودة للرزمات', 'חזרה לחבילות')}
        </Button>
      </Container>
    );
  }

  const pricing = computePricing(bundle);
  const canPay = agreed && readConfirm;

  const paymentItem = {
    ...bundle,
    title: bundle.title,
    hours: bundle.hours,
    price: pricing.finalPrice,
    category: bundle.category,
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 4,
        background:
          'radial-gradient(900px 400px at 80% 0%, rgba(26,155,142,0.12), transparent), #eef4f8',
      }}
    >
      <Container maxWidth="md" sx={{ direction: 'rtl' }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/bundles')}
          sx={{ mb: 2, fontWeight: 800 }}
        >
          {t('رجوع للرزمات', 'חזרה לחבילות')}
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 4,
            border: '1px solid rgba(26,107,181,0.12)',
            boxShadow: '0 18px 44px rgba(11,61,92,0.1)',
            mb: 2.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#1a6bb5',
                color: '#fff',
              }}
            >
              <Gavel />
            </Box>
            <Box>
              <Typography fontWeight={900} fontSize="1.4rem">
                {t(PLACEHOLDER_TERMS.titleAr, PLACEHOLDER_TERMS.titleHe)}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {t('يجب القراءة والموافقة قبل الدفع', 'חובה לקרוא ולהסכים לפני התשלום')}
              </Typography>
            </Box>
          </Stack>

          {/* Selected bundle summary */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(26,107,181,0.08), rgba(26,155,142,0.08))',
            }}
          >
            <Typography fontWeight={900} color="primary.dark" sx={{ mb: 1 }}>
              {bundle.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Chip size="small" label={`${bundle.hours} ${t('ساعة', 'שעות')}`} />
              <Chip size="small" label={contentTrackLabel(bundle.category)} />
              {pricing.discountPercent > 0 && (
                <Chip size="small" color="error" label={`-${pricing.discountPercent}%`} sx={{ fontWeight: 800 }} />
              )}
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="baseline">
              <Typography fontWeight={900} fontSize="1.6rem" color="primary.main">
                ₪{pricing.finalPrice}
              </Typography>
              {pricing.discountPercent > 0 && (
                <>
                  <Typography
                    sx={{ textDecoration: 'line-through', color: 'text.secondary', fontWeight: 700 }}
                  >
                    ₪{pricing.originalPrice}
                  </Typography>
                  <Chip
                    size="small"
                    color="success"
                    label={t(`وفّرت ₪${pricing.saved}`, `חסכתם ₪${pricing.saved}`)}
                  />
                </>
              )}
            </Stack>
          </Paper>

          <Alert severity="warning" sx={{ mb: 2, textAlign: 'right', borderRadius: 3 }}>
            {t(PLACEHOLDER_TERMS.noticeAr, PLACEHOLDER_TERMS.noticeHe)}
          </Alert>

          {termsDocUrl ? (
            <Alert
              severity="info"
              icon={<PictureAsPdf />}
              sx={{ mb: 2, textAlign: 'right', borderRadius: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  href={termsDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 800 }}
                >
                  {t('فتح المستند', 'פתיחת המסמך')}
                </Button>
              }
            >
              {t(
                'المستند الرسمي للشروط متاح — يُفضّل فتحه وقراءته بالكامل.',
                'המסמך הרשמי זמין — מומלץ לפתוח ולקרוא במלואו.'
              )}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2, textAlign: 'right', borderRadius: 3 }}>
              {t(
                'المستند الرسمي لم يُرفع بعد من صاحب المنصة. الشروط المؤقتة أدناه سارية حتى رفع الملف.',
                'המסמך הרשמי עדיין לא הועלה. התנאים הזמניים למטה תקפים עד להעלאה.'
              )}
            </Alert>
          )}

          <Box
            sx={{
              maxHeight: 340,
              overflow: 'auto',
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(11,61,92,0.03)',
              border: '1px solid rgba(11,61,92,0.1)',
              mb: 2.5,
            }}
          >
            {PLACEHOLDER_TERMS.sections.map((s) => (
              <Box key={s.titleAr} sx={{ mb: 2.5 }}>
                <Typography fontWeight={900} sx={{ mb: 0.75, color: '#0b3d5c' }}>
                  {t(s.titleAr, s.titleHe)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}
                >
                  {t(s.bodyAr, s.bodyHe)}
                </Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </Box>

          <FormControlLabel
            sx={{ alignItems: 'flex-start', mb: 1, display: 'flex' }}
            control={
              <Checkbox
                checked={readConfirm}
                onChange={(e) => setReadConfirm(e.target.checked)}
                sx={{ pt: 0.3 }}
              />
            }
            label={
              <Typography fontWeight={700}>
                {t(
                  'أقرّ بأنني قرأت الشروط أعلاه (والمستند إن وُجد)',
                  'אני מאשר/ת שקראתי את התנאים למעלה (ואת המסמך אם קיים)'
                )}
              </Typography>
            }
          />
          <FormControlLabel
            sx={{ alignItems: 'flex-start', display: 'flex' }}
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                sx={{ pt: 0.3 }}
                color="success"
              />
            }
            label={
              <Typography fontWeight={700}>
                {t(
                  'أوافق على جميع الشروط لمصلحة صاحب المنصة (المعلّم) وأفهم أن الدفع غير قابل للاسترداد',
                  'אני מסכים/ה לכל התנאים לטובת בעל הפלטפורמה (המורה) ומבין/ה שהתשלום אינו ניתן להחזר'
                )}
              </Typography>
            }
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              disabled={!canPay}
              onClick={() => setPaymentOpen(true)}
              sx={{
                flex: 1,
                fontWeight: 900,
                py: 1.4,
                background: canPay
                  ? 'linear-gradient(135deg, #1a6bb5, #1a9b8e)'
                  : undefined,
              }}
            >
              {t('أوافق وأتابع للدفع', 'מסכים/ה וממשיך/ה לתשלום')}
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/bundles')}>
              {t('إلغاء', 'ביטול')}
            </Button>
          </Stack>

          {!canPay && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {t(
                'فعّل خانتي التأكيد أعلاه للمتابعة',
                'סמנו את שתי תיבות האישור כדי להמשיך'
              )}
            </Typography>
          )}
        </Paper>

        {termsDocUrl && (
          <Typography variant="body2" align="center" sx={{ mb: 2 }}>
            <Link href={termsDocUrl} target="_blank" rel="noopener noreferrer" fontWeight={700}>
              {t('رابط المستند الرسمي للشروط', 'קישור למסמך התנאים הרשמי')}
            </Link>
          </Typography>
        )}
      </Container>

      <PaymentMethodDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        item={paymentItem}
      />
    </Box>
  );
}
