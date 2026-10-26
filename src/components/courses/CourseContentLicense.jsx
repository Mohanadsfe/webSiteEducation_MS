import React from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';
import MsEducationIcon from '../common/MsEducationIcon';

/**
 * Copyright and limited study license for course materials.
 * Israeli Copyright Law, 5768-2007. No invented ministry or company number.
 */
export default function CourseContentLicense({ embedded = false }) {
  return (
    <Paper
      elevation={0}
      component="section"
      aria-label="ترخيص المحتوى التعليمي"
      sx={{
        mt: embedded ? 0 : 4,
        p: embedded ? 1.5 : { xs: 2, md: 2.5 },
        borderRadius: 3,
        direction: 'rtl',
        textAlign: 'right',
        border: '1px solid rgba(11,61,92,0.16)',
        background:
          'linear-gradient(180deg, rgba(11,61,92,0.04), rgba(255,255,255,0.9))',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <MsEducationIcon size={embedded ? 32 : 40} />
        <Typography fontWeight={900} sx={{ fontSize: '1.15rem', color: '#0b3d5c' }}>
          ترخيص المحتوى التعليمي
        </Typography>
      </Stack>

      <Typography fontWeight={800} sx={{ lineHeight: 1.8, mb: 1 }}>
        المعهد: معهد المعرفة
        <br />
        المالك وصاحب الحق: مهند صفي
      </Typography>

      <Typography sx={{ fontWeight: 700, lineHeight: 1.9, mb: 1.25 }}>
        بموجب قانون حق المؤلف الإسرائيلي، תשס״ח-2007
        {' '}
        (חוק זכות יוצרים, התשס״ח-2007)،
        جميع الدورات والدروس والفيديوهات والملخصات والملفات في هذه الصفحة مصنّف محمي.
        حقوق المؤلف والملكية الفكرية محفوظة لمعهد المعرفة وللمالك مهند صفي، ولا تنتقل إلى الطالب.
      </Typography>

      <Typography sx={{ fontWeight: 700, lineHeight: 1.9, mb: 1.25 }}>
        يُمنح الطالب ترخيصاً شخصياً، محدوداً، غير حصري، وغير قابل للبيع أو التحويل،
        لمشاهدة المحتوى والدراسة منه فقط داخل حسابه وطوال مدة السماح له بالدخول.
        هذا الترخيص حق استخدام للدراسة، وليس بيعاً للمحتوى.
      </Typography>

      <Typography sx={{ fontWeight: 800, lineHeight: 1.9, mb: 0.5 }}>
        ممنوع بغير إذن كتابي من المالك مهند صفي:
      </Typography>
      <Box component="ul" sx={{ m: 0, pr: 2.5, pl: 0, mb: 1.25 }}>
        {[
          'نسخ المحتوى أو تنزيله بغرض التوزيع',
          'إعادة النشر أو البيع أو الإعارة أو مشاركة رابط الدخول أو كود الدورة',
          'تصوير الشاشة أو تسجيل الدرس',
          'حذف اسم معهد المعرفة أو اسم المالك مهند صفي',
        ].map((item) => (
          <Typography component="li" key={item} sx={{ fontWeight: 700, lineHeight: 1.85 }}>
            {item}
          </Typography>
        ))}
      </Box>

      <Typography sx={{ fontWeight: 700, lineHeight: 1.9 }}>
        يبقى للمالك الحق في نسبة العمل إليه. أي استخدام خارج هذا الترخيص مخالفة لقانون حق المؤلف،
        وتُطبَّق عليه أحكام قانون دولة إسرائيل.
      </Typography>

      <Typography
        variant="body2"
        sx={{ mt: 1.5, fontWeight: 900, color: '#0b3d5c' }}
      >
        © {new Date().getFullYear()} معهد المعرفة — مهند صفي. جميع الحقوق محفوظة.
      </Typography>
    </Paper>
  );
}
