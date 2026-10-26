import React, { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
} from '@mui/material';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/FirebaseService';
import { deleteAccountErrorText, deleteMyAccount } from '../../services/AccountService';
import { isOwnerAdminEmail } from '../../constants/admin';
import { useLanguage } from '../../context/LanguageContext';

/** A student removes her own account. Owner accounts are not offered this action. */
export default function DeleteMyAccount() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const email = auth.currentUser?.email || '';
  if (isOwnerAdminEmail(email)) return null;

  const confirmed = phrase.trim() === 'حذف';

  const remove = async () => {
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      await deleteMyAccount();
      await signOut(auth).catch(() => {});
      navigate('/login');
    } catch (e) {
      setError(deleteAccountErrorText(e));
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        color="error"
        variant="outlined"
        onClick={() => {
          setPhrase('');
          setError('');
          setOpen(true);
        }}
        sx={{ fontWeight: 900 }}
      >
        {t('حذف حسابي', 'מחיקת החשבון שלי')}
      </Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t('حذف الحساب نهائياً', 'מחיקת החשבון לצמיתות')}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t(
              'سيُحذف حسابك من Firebase مع حجوزاتك وإشعاراتك ودوراتك وامتحاناتك. لا يمكن التراجع.',
              'החשבון יימחק מ-Firebase יחד עם ההזמנות, ההתראות, הקורסים והמבחנים. אי אפשר לבטל.'
            )}
          </Alert>
          <TextField
            fullWidth
            label={t('اكتب حذف للتأكيد', 'כתבו حذف לאישור')}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            autoComplete="off"
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            {t('إلغاء', 'ביטול')}
          </Button>
          <Button color="error" variant="contained" disabled={!confirmed || busy} onClick={remove}>
            {t('حذف حسابي', 'מחיקת החשבון')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
