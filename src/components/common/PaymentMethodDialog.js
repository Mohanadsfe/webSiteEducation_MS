import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box, Avatar, IconButton
} from '@mui/material';
import { CreditCard, WhatsApp, Close } from '@mui/icons-material';
import { doc, updateDoc } from 'firebase/firestore';
import {
  OWNER_PHONE_DISPLAY,
  VISA_PAYMENT_PAGE_URL,
  buildWhatsAppUrl,
  buildPurchaseContextMessage,
} from '../../constants/payment';
import { auth, db } from '../../services/FirebaseService';
import ownerPics from '../../assets/Images/Ownerpic';

const ACTIONS = [
  {
    id: 'visa',
    labelAr: 'ادفع بفيزا',
    labelHe: 'ויזה',
    icon: CreditCard,
    bg: 'linear-gradient(135deg, #1565c0, #1a6bb5)',
  },
  {
    id: 'owner',
    labelAr: 'واتساب المالك',
    labelHe: 'וואטסאפ',
    icon: WhatsApp,
    bg: 'linear-gradient(135deg, #128C7E, #25D366)',
  },
];

function ChoiceChip({ action, selected, onSelect, ownerImg }) {
  const Icon = action.icon;
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(action.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(action.id);
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        cursor: 'pointer',
        borderRadius: 2,
        px: 1.1,
        py: 0.85,
        color: '#fff',
        background: action.bg,
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
        outline: selected ? '2px solid rgba(11,61,92,0.4)' : '2px solid transparent',
        outlineOffset: 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': { transform: 'translateY(-1px)' },
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
        {action.id === 'owner' && ownerImg ? (
          <Avatar src={ownerImg} sx={{ width: 28, height: 28, border: '1.5px solid #fff' }} />
        ) : (
          <Icon sx={{ fontSize: 20 }} />
        )}
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.15 }}>
            {action.labelAr}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', opacity: 0.95 }}>
            {action.labelHe}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function PaymentMethodDialog({
  open,
  onClose,
  item,
  bookingId = null,
}) {
  const [method, setMethod] = useState(null);
  const ownerImg = ownerPics[0]?.src;

  useEffect(() => {
    if (!open) setMethod(null);
  }, [open]);

  const context = buildPurchaseContextMessage(item);
  const userEmail = auth.currentUser?.email || '';
  const userName = auth.currentUser?.displayName || 'طالب / תלמיד';
  const talkOwner = method === 'owner';

  const openWhatsApp = (message) => {
    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
  };

  const markPaymentChosen = async (paymentMethod) => {
    if (!bookingId) return;
    try {
      await updateDoc(doc(db, 'appointments', bookingId), {
        paymentMethod,
        paymentStatus: 'awaiting_owner',
        status: 'pending_owner',
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error('Failed to update booking payment method', e);
    }
  };

  const handleVisa = async () => {
    await markPaymentChosen('visa');
    if (VISA_PAYMENT_PAGE_URL) {
      window.open(VISA_PAYMENT_PAGE_URL, '_blank', 'noopener,noreferrer');
      onClose?.();
      return;
    }
    openWhatsApp(`مرحباً 👋 / שלום 👋

أريد الدفع ببطاقة Visa / כרטיס אשראי עבור:
${context || 'طلب شراء / בקשת רכישה'}

👤 ${userName}
📧 ${userEmail}

أرجو إرسال رابط دفع آمن.
נא לשלוח לי קישור תשלום מאובטח.

شكراً / תודה 🙏`);
    onClose?.();
  };

  const handleOwnerWhatsApp = async () => {
    await markPaymentChosen('whatsapp_owner');
    openWhatsApp(`مرحباً 👋 / שלום 👋

أريد التواصل لتأكيد الحجز والدفع.
אני רוצה ליצור קשר לאישור הזמנה ותשלום.

${context || 'طلب حجز / בקשת הזמנה'}

👤 ${userName}
📧 ${userEmail}
📱 ${OWNER_PHONE_DISPLAY}

شكراً / תודה 🙏`);
    onClose?.();
  };

  const continueAction = () => {
    if (method === 'visa') handleVisa();
    else if (method === 'owner') handleOwnerWhatsApp();
  };

  const handleClose = () => {
    setMethod(null);
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          m: 1.5,
          maxWidth: 380,
          background: '#fff',
          boxShadow: '0 18px 40px rgba(11,61,92,0.18)',
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          pt: 2,
          pb: 0.5,
          px: 2,
          position: 'relative',
        }}
      >
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{ position: 'absolute', top: 8, left: 8 }}
        >
          <Close fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 900, fontSize: '1.45rem' }}>
          ادفع أو تواصل
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.secondary' }}>
          שלמו או פנו לבעלים
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ direction: 'rtl', px: 2, pt: 1.25, pb: 0.75 }}>
        {item?.title && (
          <Typography
            sx={{
              mb: 1.25,
              px: 1,
              py: 0.6,
              borderRadius: 1.5,
              bgcolor: 'rgba(26,107,181,0.07)',
              fontWeight: 800,
              fontSize: '1rem',
              textAlign: 'center',
            }}
          >
            {item.title}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mb: 1.25 }}>
          {ACTIONS.map((action) => (
            <ChoiceChip
              key={action.id}
              action={action}
              selected={method === action.id}
              onSelect={setMethod}
              ownerImg={ownerImg}
            />
          ))}
        </Stack>

        {talkOwner && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{
              py: 0.75,
              px: 1,
              mb: 0.25,
              borderRadius: 1.5,
              bgcolor: 'rgba(37,211,102,0.1)',
              border: '1px solid rgba(37,211,102,0.35)',
            }}
          >
            <Avatar src={ownerImg} sx={{ width: 32, height: 32 }} />
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>مهند صفي</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', direction: 'ltr' }}>
                {OWNER_PHONE_DISPLAY}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 1.75, pt: 0.25, flexDirection: 'column', gap: 0.5 }}>
        <Button
          fullWidth
          variant="contained"
          size="medium"
          disabled={!method}
          startIcon={talkOwner || (method === 'visa' && !VISA_PAYMENT_PAGE_URL) ? <WhatsApp /> : <CreditCard />}
          onClick={continueAction}
          sx={{
            py: 0.85,
            minHeight: 40,
            fontWeight: 900,
            fontSize: '1.05rem',
            borderRadius: 2,
            color: '#fff',
            background: !method
              ? undefined
              : talkOwner
                ? 'linear-gradient(135deg, #128C7E, #25D366)'
                : 'linear-gradient(135deg, #1565c0, #1a6bb5)',
            boxShadow: method ? '0 4px 12px rgba(11,61,92,0.18)' : 'none',
            '&:hover': { filter: 'brightness(1.05)' },
          }}
        >
          {!method
            ? 'اختر طريقة أولاً'
            : talkOwner
              ? 'فتح واتساب'
              : VISA_PAYMENT_PAGE_URL
                ? 'متابعة للدفع'
                : 'طلب رابط فيزا'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
