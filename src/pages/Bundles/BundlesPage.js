import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, CardActions,
  Typography, Button, Box, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, IconButton,
  Alert, InputAdornment
} from '@mui/material';
import { Add, Edit, Delete, LocalOffer, ShoppingCart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc
} from 'firebase/firestore';
import { auth, db } from '../../services/FirebaseService';
import ContentTrackField from '../../components/common/ContentTrackField';
import useStudyTrack from '../../hooks/useStudyTrack';
import { matchesTrackCategory, contentTrackLabel, normalizeContentTrack } from '../../constants/tracks';
import { computePricing } from '../../constants/bundleTerms';
import { useLanguage } from '../../context/LanguageContext';
import './BundlesPage.css';

const DEFAULT_BG = {
  tutoring: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  academic: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
  exam: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
  bagrut: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
  both: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
};

const emptyForm = () => ({
  title: '',
  hours: '',
  originalPrice: '',
  price: '',
  discountPercent: '',
  category: 'academic',
  active: true,
  imageUrl: '',
});

export default function BundlesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { track } = useStudyTrack();
  const [role, setRole] = useState('');
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [termsDocUrl, setTermsDocUrl] = useState('');
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole('');
        return;
      }
      try {
        const u = await getDoc(doc(db, 'users', user.uid));
        if (u.exists()) setRole(u.data().role || '');
      } catch {
        /* ignore */
      }
    });
    return unsub;
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'packages'), orderBy('hours', 'asc'));
      const s = await getDocs(q);
      setBundles(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      try {
        const settings = await getDoc(doc(db, 'site_settings', 'terms'));
        if (settings.exists()) setTermsDocUrl(settings.data().termsDocUrl || '');
      } catch {
        /* optional */
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isTeacher = role === 'teacher';

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpenDialog(true);
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setForm({
      title: b.title || '',
      hours: b.hours ?? '',
      originalPrice: b.originalPrice ?? '',
      price: b.price ?? '',
      discountPercent: b.discountPercent ?? '',
      category: normalizeContentTrack(b.category),
      active: b.active ?? true,
      imageUrl: b.imageUrl || '',
    });
    setOpenDialog(true);
  };

  const saveBundle = async () => {
    const { title, hours, price, originalPrice, discountPercent, category, active, imageUrl } = form;
    if (!title || !hours || !price) {
      alert(t('املأ العنوان والساعات وسعر البيع', 'מלאו כותרת, שעות ומחיר מכירה'));
      return;
    }
    const payload = {
      title: title.trim(),
      hours: Number(hours),
      price: Number(price),
      originalPrice: originalPrice !== '' ? Number(originalPrice) : Number(price),
      discountPercent: discountPercent !== '' ? Number(discountPercent) : 0,
      category,
      active: !!active,
      imageUrl: (imageUrl || '').trim(),
      updatedAt: new Date(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'packages', editingId), payload);
      } else {
        await addDoc(collection(db, 'packages'), {
          ...payload,
          createdAt: new Date(),
          createdBy: auth.currentUser?.uid || '',
        });
      }
      setOpenDialog(false);
      await load();
    } catch (e) {
      console.error(e);
      alert(t('فشل الحفظ — تحقق من صلاحيات Firestore', 'השמירה נכשלה — בדקו הרשאות'));
    }
  };

  const removeBundle = async (id) => {
    if (!window.confirm(t('حذف هذه الرزمة؟', 'למחוק את החבילה?'))) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
      setBundles((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      console.error(e);
      alert(t('فشل الحذف', 'המחיקה נכשלה'));
    }
  };

  const saveTermsUrl = async () => {
    try {
      await setDoc(
        doc(db, 'site_settings', 'terms'),
        { termsDocUrl: (termsDocUrl || '').trim(), updatedAt: new Date() },
        { merge: true }
      );
      setTermsDialogOpen(false);
      alert(t('تم حفظ رابط الشروط', 'קישור התנאים נשמר'));
    } catch (e) {
      console.error(e);
      alert(t('فشل حفظ رابط الشروط', 'שמירת קישור התנאים נכשלה'));
    }
  };

  const visibleBundles = (isTeacher ? bundles : bundles.filter((b) => b.active !== false)).filter(
    (b) => (isTeacher || !track ? true : matchesTrackCategory(b.category, track))
  );

  return (
    <div className="bundles-page">
      <Container sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            direction: 'rtl',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 28, md: 36 },
                fontWeight: 900,
                background: 'linear-gradient(90deg,#0b3d5c,#1a6bb5,#1a9b8e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('الرزمات التعليمية', 'חבילות לימוד')}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.5 }}>
              <LocalOffer sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                {isTeacher
                  ? t(
                      'أضف رزمات مع خصم — الطلاب يدفعون بعد الموافقة على الشروط',
                      'הוסיפו חבילות עם הנחה — התלמידים משלמים אחרי הסכמה לתנאים'
                    )
                  : t(
                      'اختر رزمة، اقرأ الشروط، ثم ادفع (Visa / Bit / تواصل)',
                      'בחרו חבילה, קראו תנאים, ואז שלמו (Visa / Bit / פנייה)'
                    )}
              </Typography>
            </Stack>
          </Box>

          {isTeacher && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setTermsDialogOpen(true)} sx={{ fontWeight: 800 }}>
                {t('مستند الشروط', 'מסמך תנאים')}
              </Button>
              <Button variant="contained" startIcon={<Add />} onClick={startAdd} sx={{ fontWeight: 800 }}>
                {t('إضافة رزمة', 'הוספת חבילה')}
              </Button>
            </Stack>
          )}
        </Box>

        {isTeacher && (
          <Alert severity="info" sx={{ mb: 2.5, textAlign: 'right', direction: 'rtl', borderRadius: 3 }}>
            {t(
              'فقط المعلّم/المسؤول يضيف الرزمات. حدّد السعر الأصلي وسعر البيع لإظهار الخصم. رابط الشروط الرسمي يمكنك حفظه من زر «مستند الشروط» لاحقاً.',
              'רק המורה/המנהל מוסיף חבילות. הגדירו מחיר מקורי ומחיר מכירה להצגת הנחה. קישור לתנאים הרשמיים אפשר לשמור ב«מסמך תנאים».'
            )}
          </Alert>
        )}

        {loading ? (
          <Typography align="center">{t('جارِ التحميل…', 'טוען…')}</Typography>
        ) : (
          <Grid container spacing={2.5}>
            {visibleBundles.map((b) => {
              const pricing = computePricing(b);
              const trackKey = normalizeContentTrack(b.category);
              const bg =
                (b.imageUrl && b.imageUrl.trim()) ||
                DEFAULT_BG[trackKey] ||
                DEFAULT_BG.academic;

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={b.id}>
                  <Card
                    elevation={0}
                    className="bundle-card"
                    sx={{
                      borderRadius: 4,
                      overflow: 'hidden',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid rgba(26,107,181,0.12)',
                      boxShadow: '0 16px 40px rgba(11,61,92,0.1)',
                      transition: 'transform 0.2s ease',
                      '&:hover': { transform: 'translateY(-6px)' },
                    }}
                  >
                    <Box
                      sx={{
                        height: 168,
                        position: 'relative',
                        backgroundImage: `linear-gradient(to top, rgba(11,61,92,0.75), rgba(11,61,92,0.15)), url(${bg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {pricing.discountPercent > 0 && (
                        <Chip
                          label={`-${pricing.discountPercent}%`}
                          color="error"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            fontWeight: 900,
                            fontSize: '0.95rem',
                          }}
                        />
                      )}
                      <Box sx={{ position: 'absolute', bottom: 12, left: 12, right: 12, color: '#fff' }}>
                        <Chip
                          size="small"
                          label={contentTrackLabel(b.category)}
                          sx={{
                            mb: 0.75,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.35)',
                            fontWeight: 700,
                          }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.25 }}>
                          {b.title}
                        </Typography>
                      </Box>
                    </Box>

                    <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                        {b.hours} {t('ساعة', 'שעות')}
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="baseline">
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: '2rem',
                            background: 'linear-gradient(90deg,#1a6bb5,#1a9b8e)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          ₪{pricing.finalPrice}
                        </Typography>
                        {pricing.discountPercent > 0 && (
                          <Typography
                            sx={{
                              textDecoration: 'line-through',
                              color: 'text.secondary',
                              fontWeight: 700,
                              fontSize: '1.1rem',
                            }}
                          >
                            ₪{pricing.originalPrice}
                          </Typography>
                        )}
                      </Stack>
                      {pricing.saved > 0 && (
                        <Chip
                          size="small"
                          color="success"
                          label={t(`خصم ₪${pricing.saved}`, `הנחה ₪${pricing.saved}`)}
                          sx={{ mt: 1, fontWeight: 800 }}
                        />
                      )}
                      {!b.active && (
                        <Chip size="small" label={t('غير متاحة', 'לא זמין')} sx={{ mt: 1, display: 'block' }} />
                      )}
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ShoppingCart />}
                        disabled={b.active === false}
                        onClick={() => navigate(`/bundles/${b.id}/terms`)}
                        sx={{
                          fontWeight: 900,
                          py: 1.15,
                          background: 'linear-gradient(135deg, #1a6bb5, #1a9b8e)',
                        }}
                      >
                        {t('اختر وادفع', 'בחירה ותשלום')}
                      </Button>
                    </CardActions>

                    {isTeacher && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, pb: 2 }}>
                        <IconButton size="small" onClick={() => startEdit(b)}>
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeBundle(b.id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    )}
                  </Card>
                </Grid>
              );
            })}

            {visibleBundles.length === 0 && (
              <Grid item xs={12}>
                <Typography align="center" color="text.secondary" sx={{ py: 6 }}>
                  {t('لا توجد رزمات حالياً.', 'אין חבילות כרגע.')}
                </Typography>
              </Grid>
            )}
          </Grid>
        )}

        {/* Admin add/edit */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ textAlign: 'right', direction: 'rtl', fontWeight: 900 }}>
            {editingId ? t('تعديل الرزمة', 'עריכת חבילה') : t('إضافة رزمة بخصم', 'הוספת חבילה עם הנחה')}
          </DialogTitle>
          <DialogContent sx={{ direction: 'rtl' }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('العنوان', 'כותרת')}
                fullWidth
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <TextField
                label={t('الساعات', 'שעות')}
                type="number"
                fullWidth
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              />
              <TextField
                label={t('السعر الأصلي (قبل الخصم)', 'מחיר מקורי (לפני הנחה)')}
                fullWidth
                value={form.originalPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, originalPrice: e.target.value.replace(/[^\d.]/g, '') }))
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">₪</InputAdornment>,
                }}
              />
              <TextField
                label={t('سعر البيع بعد الخصم', 'מחיר מכירה אחרי הנחה')}
                fullWidth
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.]/g, '') }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₪</InputAdornment>,
                }}
              />
              <TextField
                label={t('نسبة الخصم % (اختياري)', 'אחוז הנחה % (אופציונלי)')}
                type="number"
                fullWidth
                value={form.discountPercent}
                onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                helperText={t('مثال: 20 — أو اتركه واملأ السعرين فقط', 'לדוגמה: 20 — או השאירו ריק ומלאו שני מחירים')}
              />
              <ContentTrackField
                value={normalizeContentTrack(form.category)}
                onChange={(category) => setForm((f) => ({ ...f, category }))}
              />
              <TextField
                label={t('صورة (رابط)', 'תמונה (קישור)')}
                fullWidth
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
              <Button
                variant={form.active ? 'contained' : 'outlined'}
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              >
                {form.active
                  ? t('متاحة للطلاب', 'זמינה לתלמידים')
                  : t('مخفية عن الطلاب', 'מוסתרת מתלמידים')}
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ direction: 'rtl' }}>
            <Button onClick={() => setOpenDialog(false)}>{t('إلغاء', 'ביטול')}</Button>
            <Button variant="contained" onClick={saveBundle}>
              {t('حفظ', 'שמירה')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Terms document URL for owner */}
        <Dialog open={termsDialogOpen} onClose={() => setTermsDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ textAlign: 'right', direction: 'rtl', fontWeight: 900 }}>
            {t('مستند الشروط الرسمي', 'מסמך התנאים הרשמי')}
          </DialogTitle>
          <DialogContent sx={{ direction: 'rtl' }}>
            <Alert severity="info" sx={{ mb: 2, textAlign: 'right' }}>
              {t(
                'عندما تجهّز ملف الشروط (PDF / Google Drive)، الصق الرابط هنا. حتى ذلك الحين تظهر شروط مؤقتة للطالب.',
                'כשיהיה מוכן קובץ התנאים (PDF / Drive), הדביקו כאן קישור. עד אז יוצגו תנאים זמניים.'
              )}
            </Alert>
            <TextField
              label={t('رابط المستند', 'קישור למסמך')}
              fullWidth
              value={termsDocUrl}
              onChange={(e) => setTermsDocUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ direction: 'rtl' }}>
            <Button onClick={() => setTermsDialogOpen(false)}>{t('إلغاء', 'ביטול')}</Button>
            <Button variant="contained" onClick={saveTermsUrl}>
              {t('حفظ الرابط', 'שמירת קישור')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </div>
  );
}
