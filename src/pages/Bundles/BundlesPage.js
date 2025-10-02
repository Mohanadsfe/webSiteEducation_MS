import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, CardActions,
  Typography, Button, Box, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, IconButton,
  FormControlLabel, Checkbox, Alert, Divider
} from '@mui/material';
import { Add, Edit, Delete, WhatsApp } from '@mui/icons-material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import './BundlesPage.css';
import { LocalOffer } from '@mui/icons-material';
import { InputAdornment } from '@mui/material'; 

import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc
} from 'firebase/firestore';

const WHATSAPP_NUMBER = '972548010225'; // Israel number, no leading 0

// Fallback images if a bundle has no imageUrl
const DEFAULT_BG = {
  tutoring: 'https://t3.ftcdn.net/jpg/08/96/96/26/240_F_896962692_oDDwSrKWr4jFe4LXHex7TuthvsGRP10o.jpg',
  exam:     'https://as2.ftcdn.net/v2/jpg/02/33/14/23/1000_F_233142339_2XkJuFHLndXZoohWWkNzA9wYSIiGstJk.jpg',
};

export default function BundlesPage() {
  const [role, setRole] = useState('');

  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    hours: '',
    price: '',
    category: 'tutoring',
    active: true,
    imageUrl: '',
  });

  // Terms and conditions dialog state
  const [openTermsDialog, setOpenTermsDialog] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
// clean numeric input (allows digits and a single dot)
const handlePriceChange = (e) => {
  const v = e.target.value.replace(/[^\d.]/g, '');
  setForm(f => ({ ...f, price: v }));
};

  // auth + role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole('');
        return;
      }
      try {
        const u = await getDoc(doc(db, 'users', user.uid));
        if (u.exists()) setRole(u.data().role || '');
      } catch {}
    });
    return unsub;
  }, []);

  // load bundles
  const load = async () => {
    setLoading(true);
    const q = query(collection(db, 'packages'), orderBy('hours', 'asc'));
    const s = await getDocs(q);
    setBundles(s.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isTeacher = role === 'teacher';

  const handleBundleSelection = (bundle) => {
    setSelectedBundle(bundle);
    setTermsAccepted(false);
    setOpenTermsDialog(true);
  };

  const sendWhatsAppMessage = () => {
    if (!selectedBundle || !termsAccepted) return;

    const userEmail = auth.currentUser?.email || '';
    const userName = auth.currentUser?.displayName || 'طالب';
    
    const msg = `مرحباً، أرغب بشراء الرزمة التعليمية التالية:

📚 *${selectedBundle.title}*
⏰ عدد الساعات: ${selectedBundle.hours} ساعة
📖 الفئة: ${selectedBundle.category === 'exam' ? 'محاضرات امتحانات' : 'دروس خصوصية'}
💰 السعر: ₪${selectedBundle.price}

👤 بياناتي:
📧 البريد الإلكتروني: ${userEmail}
👨‍🎓 الاسم: ${userName}

✅ *أؤكد أنني قرأت وفهمت الشروط والأحكام*
✅ *أوافق على عدم إمكانية استرداد المبلغ بعد الدفع*
✅ *أفهم أن الساعات محفوظة للاستخدام حسب الاتفاق*

أرجو التواصل معي لتأكيد الطلب وتنسيق الدفع.

شكراً لكم 🙏`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Close dialog after sending
    setOpenTermsDialog(false);
    setSelectedBundle(null);
    setTermsAccepted(false);
  };

  // teacher: open add/edit dialog
  const startAdd = () => {
    setEditingId(null);
    setForm({ title: '', hours: '', price: '', category: 'tutoring', active: true, imageUrl: '' });
    setOpenDialog(true);
  };
  const startEdit = (b) => {
    setEditingId(b.id);
    setForm({
      title: b.title || '',
      hours: b.hours || '',
      price: b.price || '',
      category: b.category || 'tutoring',
      active: b.active ?? true,
      imageUrl: b.imageUrl || '',
    });
    setOpenDialog(true);
  };

  const saveBundle = async () => {
    const { title, hours, price, category, active, imageUrl } = form;
    if (!title || !hours || !price) return alert('املأ العنوان/الساعات/السعر');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'packages', editingId), {
          title,
          hours: Number(hours),
          price: Number(price),
          category,
          active,
          imageUrl: (imageUrl || '').trim(),
        });
      } else {
        await addDoc(collection(db, 'packages'), {
          title,
          hours: Number(hours),
          price: Number(price),
          category,
          active,
          imageUrl: (imageUrl || '').trim(),
          createdAt: new Date(),
        });
      }
      setOpenDialog(false);
      await load();
    } catch (e) {
      console.error(e);
      alert('فشل الحفظ (تحقق من صلاحيات Firestore)');
    }
  };

  const removeBundle = async (id) => {
    if (!window.confirm('حذف هذه الرزمة')) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
      setBundles(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      console.error(e);
      alert('فشل الحذف (تحقق من صلاحيات Firestore)');
    }
  };

  const visibleBundles = isTeacher ? bundles : bundles.filter(b => b.active !== false);

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
  }}
>
  {/* Right side: gradient title + subtitle */}
  <Box sx={{ textAlign: 'right' }}>
    <Typography
      component="h1"
      sx={{
        fontSize: { xs: 28, md: 36 },
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: '.3px',
        background: 'linear-gradient(90deg,#0d47a1,#1976d2,#42a5f5)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      الرزمات التعليمية
    </Typography>

    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mt: 0.5 }}>
      <LocalOffer sx={{ fontSize: 20, color: 'primary.main' }} />
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        اختر الخطة التي تناسب أهدافك التعليمية
      </Typography>
    </Box>

    <Box
      sx={{
        height: 4,
        width: 84,
        bgcolor: 'primary.main',
        borderRadius: 2,
        ml: 'auto',      // keep the bar right-aligned in RTL
        mt: 1,
        opacity: 0.75,
      }}
    />
  </Box>

  {/* Left side: teacher action */}
  {isTeacher && (
    <Button variant="contained" startIcon={<Add />} onClick={startAdd}>
      إضافة الرزمة
    </Button>
  )}
</Box>

      {loading ? (
        <Typography align="center">جارِ التحميل…</Typography>
      ) : (
        <Grid container spacing={2}>
          {visibleBundles.map(b => {
            const bg = (b.imageUrl && b.imageUrl.trim()) || DEFAULT_BG[b.category] || DEFAULT_BG.tutoring;
            return (
              <Grid item xs={12} md={3} key={b.id}>
                <Card elevation={6} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  {/* Image header */}
                  <Box
                    sx={{
                      height: 160,
                      position: 'relative',
                      backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.15)), url(${bg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <Box sx={{ position: 'absolute', bottom: 12, left: 12, right: 12, color: '#fff' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip
                          label={b.category === 'exam' ? 'محاضرات امتحانات' : 'دروس خصوصية'}
                          size="small"
                          color="default"
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
                        />
                        {!b.active && (
                          <Chip label="غير متاحة" size="small" sx={{ bgcolor: 'rgba(255,193,7,0.9)', color: '#000' }} />
                        )}
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {b.title}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Content */}
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>₪{b.price}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.hours} ساعة</Typography>
                  </CardContent>

                  {/* Actions */}
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<WhatsApp />}
                      onClick={() => handleBundleSelection(b)}
                      sx={{
                        bgcolor: '#25D366',
                        '&:hover': { bgcolor: '#128C7E' }
                      }}
                    >
                      اختر هذه الرزمة
                    </Button>
                  </CardActions>

                  {/* Teacher controls */}
                  {isTeacher && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, pb: 2 }}>
                      <IconButton size="small" onClick={() => startEdit(b)}><Edit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => removeBundle(b.id)}><Delete /></IconButton>
                    </Box>
                  )}
                </Card>
              </Grid>
            );
          })}

          {visibleBundles.length === 0 && (
            <Grid item xs={12}>
              <Typography align="center" color="text.secondary">
                لا توجد باقات حالياً.
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* Teacher dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textAlign: 'right', direction: 'rtl' }}>
          {editingId ? 'تعديل الباقة' : 'إضافة باقة'}
        </DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <TextField
            label="العنوان"
            fullWidth
            sx={{ mt: 2 }}
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <TextField
            label="الساعات"
            type="number"
            fullWidth
            sx={{ mt: 2 }}
            value={form.hours}
            onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))}
          />
         <TextField
          label="السعر"
          fullWidth
          sx={{ mt: 2 }}
          value={form.price}
          onChange={handlePriceChange}
          inputProps={{ inputMode: 'decimal' }}   // numeric keypad on mobile
          InputProps={{
            startAdornment: <InputAdornment position="start">₪</InputAdornment>,
          }}
        />
          <TextField
            label="الفئة"
            select
            fullWidth
            sx={{ mt: 2 }}
            value={form.category}
            onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
          >
            <MenuItem value="tutoring">دروس خصوصية</MenuItem>
            <MenuItem value="exam">محاضرات امتحانات</MenuItem>
          </TextField>
          <TextField
            label="صورة (رابط)"
            placeholder="https://example.com/image.jpg"
            fullWidth
            sx={{ mt: 2 }}
            value={form.imageUrl}
            onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
          />
          <Box sx={{ mt: 1 }}>
            <Button
              variant={form.active ? 'contained' : 'outlined'}
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
            >
              {form.active ? 'جعلها غير متاحة' : 'جعلها متاحة'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={saveBundle}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Terms and Conditions Dialog */}
      <Dialog 
        open={openTermsDialog} 
        onClose={() => setOpenTermsDialog(false)} 
        fullWidth 
        maxWidth="md"
        sx={{ direction: 'rtl' }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <WhatsApp sx={{ color: '#25D366', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              تأكيد اختيار الرزمة التعليمية
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          {selectedBundle && (
            <>
              {/* Bundle Details */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'primary.50', 
                borderRadius: 2, 
                mb: 3,
                border: '1px solid',
                borderColor: 'primary.200'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                  تفاصيل الرزمة المختارة:
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>العنوان:</Typography>
                    <Typography variant="body1">{selectedBundle.title}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>عدد الساعات:</Typography>
                    <Typography variant="body1">{selectedBundle.hours} ساعة</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>الفئة:</Typography>
                    <Typography variant="body1">
                      {selectedBundle.category === 'exam' ? 'محاضرات امتحانات' : 'دروس خصوصية'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>السعر:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ₪{selectedBundle.price}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Terms and Conditions */}
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  ⚠️ شروط وأحكام مهمة
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  قبل المتابعة، يرجى قراءة وفهم الشروط التالية بعناية:
                </Typography>
              </Alert>

              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 2, 
                border: '1px solid',
                borderColor: 'grey.300',
                mb: 3
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                  📋 الشروط والأحكام:
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      💰 سياسة الدفع والاسترداد:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      • الدفع مطلوب مقدماً بعد اول درس <br/>
                      • <strong>لا يمكن استرداد المبلغ  </strong><br/>
                      •  يتم حفظ الساعات للاستخدام مستقبلاً 
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      ⏰ سياسة الساعات:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      • الساعات محفوظة للطالب <br/>
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      📅 جدولة الدروس:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      •  يجب حجز الدروس قبل 24 ساعة على الأقل<br/>
                      • وحسب الضروره يمكن حجز في نفس اليوم،يرجى التواصل عبد الواتساب<br/>
                      • إلغاء الدرس قبل أقل من 4 ساعات يحسب من الساعات المحفوظة<br/>
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      📞 التواصل والدعم:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      • التواصل يتم عبر الواتساب فقط<br/>
                      • رقم التلفون : 0548010225  <br/>
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Acceptance Checkbox */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.50', 
                borderRadius: 2, 
                border: '1px solid',
                borderColor: 'success.200'
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      sx={{ 
                        '&.Mui-checked': { color: 'success.main' },
                        '& .MuiSvgIcon-root': { fontSize: 24 }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      ✅ أوافق على جميع الشروط والأحكام المذكورة أعلاه وأفهم أن:
                    </Typography>
                  }
                />
                
                <Box sx={{ mt: 1, ml: 5 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    • لا يمكن استرداد المبلغ بعد الدفع<br/>
                    • قرأت وفهمت جميع الشروط والأحكام
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => setOpenTermsDialog(false)}
            sx={{ minWidth: 120 }}
          >
            إلغاء
          </Button>
          <Button 
            variant="contained" 
            onClick={sendWhatsAppMessage}
            disabled={!termsAccepted}
            startIcon={<WhatsApp />}
            sx={{ 
              minWidth: 200,
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#128C7E' },
              '&:disabled': { bgcolor: 'grey.400' }
            }}
          >
            إرسال رسالة الواتساب
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </div>

  );
}
