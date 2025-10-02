import React from 'react';
import { Container, Typography, Grid, TextField, Button, Paper, InputAdornment } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import MessageIcon from '@mui/icons-material/Message';
import Instagram from '@mui/icons-material/Instagram';
import './ContactUs.css';

const ContactUs = () => {
  return (
    <div className="contact-us" dir="rtl">
      <Container maxWidth="md" className="contact-us-container">
        <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 800 }}>
          تواصل معنا
        </Typography>

        <Typography variant="body1" align="center" paragraph>
          يسعدنا تواصلك دائماً. اكتب لنا سؤالك أو اقتراحك وسنرد عليك في أقرب وقت.
        </Typography>

        <Paper elevation={3} className="contact-form-paper">
          <form noValidate autoComplete="off">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="الاسم الكامل"
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="البريد الإلكتروني"
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="الرسالة"
                  fullWidth
                  multiline
                  rows={4}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MessageIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} style={{ textAlign: 'center' }}>
                <Button variant="contained" color="primary" size="large" type="submit">
                  إرسال الرسالة
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        <Grid container spacing={3} style={{ marginTop: '2rem' }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} className="contact-info-paper">
              <Typography variant="h6" gutterBottom>معلومات التواصل</Typography>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <HomeIcon color="primary" />
                </Grid>
                <Grid item>
                  <Typography variant="body1">العنوان: شارع مدرسة البصلية 1، شفاعمرو، إسرائيل</Typography>
                </Grid>
              </Grid>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <PhoneIcon color="primary" />
                </Grid>
                <Grid item>
                  <Typography variant="body1">טלפון: 054-8010-225</Typography>
                </Grid>
              </Grid>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <EmailIcon color="primary" />
                </Grid>
                <Grid item>
                  <Typography variant="body1">البريد: mohanadsfe@gmail.com</Typography>
                </Grid>
              </Grid>
              <Grid container alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                <Grid item>
                  <PhoneIcon color="success" />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    color="success"
                    href={`https://wa.me/972548010225?text=${encodeURIComponent('مرحباً، أود الاستفسار عن الدروس/الدورات.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    تواصل عبر واتساب
                  </Button>
                </Grid>
              </Grid>
              
              {/* Instagram Link */}
              <Grid container alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                <Grid item>
                  <Instagram color="secondary" />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => window.open('https://www.instagram.com/allinone_mm?igsh=enV2aGs4YnJzdzIy&utm_source=qr', '_blank')}
                    sx={{
                      background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                      color: 'white',
                      border: 'none',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                        opacity: 0.9,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(225, 48, 108, 0.3)',
                      }
                    }}
                  >
                    تابعنا على إنستغرام
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={3} className="contact-info-paper">
              <Typography variant="h6" gutterBottom>خريطة موقعنا</Typography>
              <iframe
                title="Google Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.2930393898437!2d144.96315761592334!3d-37.81362774202167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad642af0f11fd81%3A0xf577a103d2d0000!2sFederation%20Square!5e0!3m2!1sen!2sau!4v1618216768247!5m2!1sen!2sau"
                width="100%"
                height="250"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default ContactUs;


