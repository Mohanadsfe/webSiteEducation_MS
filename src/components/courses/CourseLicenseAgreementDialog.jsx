import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, FormControlLabel, Stack, Typography,
} from '@mui/material';
import CourseContentLicense from './CourseContentLicense';
import MsEducationIcon from '../common/MsEducationIcon';

const AGREEMENTS = [
  'المحتوى ملك معهد المعرفة والمالك مهند صفي، ولا أنقل ملكيته إليّ.',
  'الترخيص شخصي للدراسة فقط داخل حسابي، وغير قابل للبيع أو التحويل.',
  'لا أنسخ المحتوى ولا أعيد نشره ولا أشاركه ولا أبيعه ولا أعطي كود الدخول.',
  'لا أصوّر الشاشة ولا أسجّل الدرس.',
  'لا أحذف اسم معهد المعرفة أو اسم المالك مهند صفي.',
];

/**
 * Blocks course purchase until every license point is accepted.
 */
export default function CourseLicenseAgreementDialog({ open, courseTitle, onClose, onAgree }) {
  const [checked, setChecked] = useState(() => AGREEMENTS.map(() => false));
  const allChecked = checked.every(Boolean);

  useEffect(() => {
    if (open) setChecked(AGREEMENTS.map(() => false));
  }, [open]);

  const toggle = (index) => {
    setChecked((prev) => prev.map((on, i) => (i === index ? !on : on)));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <MsEducationIcon size={36} />
        موافقة على الترخيص قبل الشراء
      </DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontWeight: 800, lineHeight: 1.8, mb: 1.5 }}>
          قبل شراء
          {courseTitle ? ` «${courseTitle}»` : ' الدورة'}
          {' '}
          اقرأ ترخيص معهد المعرفة ووافق على كل البنود. لن يُفتح الشراء قبل ذلك.
        </Typography>
        <CourseContentLicense embedded />
        <Stack sx={{ mt: 1 }}>
          {AGREEMENTS.map((label, index) => (
            <FormControlLabel
              key={label}
              sx={{ alignItems: 'flex-start', mr: 0, ml: 0 }}
              control={(
                <Checkbox
                  checked={checked[index]}
                  onChange={() => toggle(index)}
                  sx={{ pt: 0.4 }}
                />
              )}
              label={(
                <Typography sx={{ fontWeight: 700, lineHeight: 1.7, pt: 0.6 }}>
                  {label}
                </Typography>
              )}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ fontWeight: 800 }}>
          رجوع
        </Button>
        <Button
          variant="contained"
          disabled={!allChecked}
          onClick={onAgree}
          sx={{ fontWeight: 900 }}
        >
          أوافق على الكل وأتابع للشراء
        </Button>
      </DialogActions>
    </Dialog>
  );
}
