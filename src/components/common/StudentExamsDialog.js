import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, IconButton, Chip, Box,
  CircularProgress, Alert, Paper, Grid
} from '@mui/material';
import {
  Delete, Edit, Save, Close, MenuBook, EventNote, Image as ImageIcon
} from '@mui/icons-material';
import ExamsService from '../../services/ExamsService';
import { useLanguage } from '../../context/LanguageContext';
import { EXAM_PRESET_COVERS } from '../../utils/compressImage';

function toInputDate(value) {
  if (!value) return '';
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const emptyForm = () => ({
  id: null,
  examName: '',
  examDate: '',
  notes: '',
  imageUrl: '',
});

export default function StudentExamsDialog({
  open,
  onClose,
  studentId,
  studentEmail,
  studentName,
}) {
  const { t, isHe } = useLanguage();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open || !studentId) return undefined;
    setLoading(true);
    setError('');
    const unsub = ExamsService.listenStudentExams(studentId, (list) => {
      setExams(list);
      setLoading(false);
    });
    return unsub;
  }, [open, studentId]);

  const resetForm = () => setForm(emptyForm());

  const upcomingCount = useMemo(
    () => exams.filter((e) => {
      const days = ExamsService.daysUntil(e.examDate);
      return days !== null && days >= 0;
    }).length,
    [exams]
  );

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        examName: form.examName,
        examDate: form.examDate,
        notes: form.notes,
        imageUrl: form.imageUrl,
      };
      if (form.id) {
        await ExamsService.updateExam(form.id, payload);
      } else {
        await ExamsService.addExam({
          studentId,
          studentEmail,
          studentName,
          ...payload,
        });
      }
      resetForm();
    } catch (e) {
      console.error(e);
      setError(e?.message || t('فشل حفظ الامتحان', 'שמירת המבחן נכשלה'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (exam) => {
    setForm({
      id: exam.id,
      examName: exam.examName || '',
      examDate: toInputDate(exam.examDate),
      notes: exam.notes || '',
      imageUrl: exam.imageUrl || '',
    });
  };

  const remove = async (exam) => {
    if (!window.confirm(t(`حذف امتحان "${exam.examName}"؟`, `למחוק את המבחן "${exam.examName}"?`))) return;
    try {
      await ExamsService.deleteExam(exam.id);
      if (form.id === exam.id) resetForm();
    } catch (e) {
      console.error(e);
      setError(t('فشل حذف الامتحان', 'מחיקת המבחן נכשלה'));
    }
  };

  const urgencyChip = (exam) => {
    const days = ExamsService.daysUntil(exam.examDate);
    if (days === null) return null;
    if (days < 0) return <Chip size="small" label={t('انتهى', 'הסתיים')} />;
    if (days === 0) return <Chip size="small" color="error" label={t('اليوم', 'היום')} sx={{ fontWeight: 800 }} />;
    if (days === 1) return <Chip size="small" color="warning" label={t('غداً', 'מחר')} sx={{ fontWeight: 800 }} />;
    if (days <= 7) return <Chip size="small" color="info" label={t(`بعد ${days} أيام`, `בעוד ${days} ימים`)} />;
    return <Chip size="small" color="success" label={t(`بعد ${days} يوم`, `בעוד ${days} ימים`)} />;
  };

  const preview = form.imageUrl || EXAM_PRESET_COVERS[0].url;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #eef5ff 0%, #ffffff 28%)',
        },
      }}
    >
      <Box
        sx={{
          height: 8,
          background: 'linear-gradient(90deg, #1565c0, #42a5f5, #c62828)',
        }}
      />
      <DialogTitle sx={{ textAlign: 'right', direction: 'rtl', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-start">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(145deg, #1565c0, #0d47a1)',
              color: '#fff',
              boxShadow: '0 10px 24px rgba(13,71,161,0.35)',
            }}
          >
            <MenuBook sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.45rem' }}>
              {t('بيانات الامتحانات', 'נתוני המבחנים')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('اسم · تاريخ', 'שם · תאריך')}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ direction: 'rtl' }}>
        <Alert
          severity="info"
          icon={<EventNote />}
          sx={{ mb: 2.5, textAlign: 'right', borderRadius: 3 }}
        >
          {t(
            'احفظ امتحاناتك: الاسم والتاريخ — ويمكن اختيار غلاف جاهز فقط (بدون رفع صور).',
            'שמרו מבחנים: שם ותאריך — אפשר לבחור עטיפה מוכנה בלבד (בלי העלאת תמונות).'
          )}
          {upcomingCount > 0
            ? ` ${t(`لديك ${upcomingCount} امتحان قادم.`, `יש לך ${upcomingCount} מבחנים קרובים.`)}`
            : ''}
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}

        {/* Pretty form card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 3,
            borderRadius: 4,
            border: '1px solid rgba(21,101,192,0.15)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,242,255,0.9))',
            boxShadow: '0 12px 36px rgba(13,71,161,0.08)',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>
            {form.id
              ? t('تعديل بيانات امتحان', 'עריכת נתוני מבחן')
              : t('إضافة امتحان جديد', 'הוספת מבחן חדש')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  height: 160,
                  backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55)), url(${preview})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <Chip
                  size="small"
                  icon={<ImageIcon sx={{ color: '#fff !important' }} />}
                  label={t('معاينة الصورة', 'תצוגת תמונה')}
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Stack spacing={2}>
                <TextField
                  label={t('اسم الامتحان', 'שם המבחן')}
                  value={form.examName}
                  onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
                  fullWidth
                  placeholder={t('مثال: رياضيات — الوحدة 3', 'לדוגמה: מתמטיקה — יחידה 3')}
                />
                <TextField
                  label={t('تاريخ الامتحان', 'תאריך המבחן')}
                  type="date"
                  value={form.examDate}
                  onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Grid>
          </Grid>

          <Typography sx={{ mt: 2.5, mb: 1, fontWeight: 800, fontSize: '0.95rem' }}>
            {t('غلاف جاهز (اختياري)', 'עטיפה מוכנה (אופציונלי)')}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {EXAM_PRESET_COVERS.map((c) => {
              const selected = form.imageUrl === c.url;
              return (
                <Box
                  key={c.id}
                  title={isHe ? c.labelHe : c.labelAr}
                  onClick={() => setForm((f) => ({ ...f, imageUrl: c.url }))}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selected ? '3px solid #1565c0' : '2px solid transparent',
                    boxShadow: selected ? '0 0 0 2px rgba(21,101,192,0.25)' : '0 2px 8px rgba(0,0,0,0.12)',
                    backgroundImage: `url(${c.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 0.15s ease',
                    '&:hover': { transform: 'scale(1.05)' },
                  }}
                />
              );
            })}
          </Stack>
          {form.imageUrl && (
            <Button
              size="small"
              color="inherit"
              onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
              sx={{ mb: 1 }}
            >
              {t('إزالة الغلاف', 'הסרת עטיפה')}
            </Button>
          )}

          <TextField
            label={t('ملاحظات (اختياري)', 'הערות (אופציונלי)')}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
          />

          <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-start">
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={save}
              disabled={saving}
              sx={{
                borderRadius: 999,
                px: 3,
                fontWeight: 900,
                background: 'linear-gradient(135deg, #1565c0, #0d47a1)',
              }}
            >
              {form.id
                ? t('حفظ التعديل', 'שמירת שינוי')
                : t('حفظ بيانات الامتحان', 'שמירת נתוני המבחן')}
            </Button>
            {form.id && (
              <Button variant="outlined" startIcon={<Close />} onClick={resetForm} sx={{ borderRadius: 999 }}>
                {t('إلغاء التعديل', 'ביטול עריכה')}
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Pretty exam cards */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : exams.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              py: 5,
              px: 2,
              textAlign: 'center',
              borderRadius: 4,
              border: '1px dashed rgba(21,101,192,0.35)',
              bgcolor: 'rgba(21,101,192,0.04)',
            }}
          >
            <MenuBook sx={{ fontSize: 42, color: '#1565c0', mb: 1 }} />
            <Typography fontWeight={800}>
              {t(
                'لا توجد بيانات امتحانات بعد',
                'אין עדיין נתוני מבחנים'
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('أضف اسم وتاريخ لأول امتحان أعلاه', 'הוסיפו למעלה שם ותאריך למבחן ראשון')}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {exams.map((exam) => (
              <Grid item xs={12} sm={6} key={exam.id}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3.5,
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.08)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
                >
                  <Box
                    sx={{
                      height: 140,
                      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.65)), url(${ExamsService.coverOf(exam)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                    }}
                  >
                    {urgencyChip(exam)}
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => startEdit(exam)}
                        sx={{ bgcolor: 'rgba(255,255,255,0.92)', '&:hover': { bgcolor: '#fff' } }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => remove(exam)}
                        sx={{ bgcolor: 'rgba(255,255,255,0.92)', '&:hover': { bgcolor: '#fff' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 2, flexGrow: 1 }}>
                    <Typography fontWeight={900} sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                      {exam.examName}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={700} sx={{ mb: 0.75 }}>
                      📅 {ExamsService.formatExamDate(exam.examDate)}
                    </Typography>
                    {exam.notes ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                        {exam.notes}
                      </Typography>
                    ) : null}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ direction: 'rtl', px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 999, fontWeight: 700 }}>
          {t('إغلاق', 'סגירה')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
