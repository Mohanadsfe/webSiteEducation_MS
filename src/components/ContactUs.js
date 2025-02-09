import React from 'react';
import { Container, Typography, Grid, TextField, Button, Paper, InputAdornment } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import MessageIcon from '@mui/icons-material/Message';
import './ContactUs.css';  // Importing the CSS file

const ContactUs = () => {
  return (
    <div className="contact-us">
      <Container maxWidth="md" className="contact-us-container">
        {/* Contact Us Title */}
        <Typography variant="h3" align="center" gutterBottom>
          צור קשר
        </Typography>

        <Typography variant="body1" align="center" paragraph>
          נשמח לשמוע מכם! מלאו את הטופס למטה או צרו איתנו קשר ישירות דרך המידע הבא.
        </Typography>

        {/* Contact Form */}
        <Paper elevation={3} className="contact-form-paper">
          <form noValidate autoComplete="off">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="שם מלא"
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
                  label="אימייל"
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
                  label="הודעה"
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
                  שלח הודעה
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        {/* Contact Information Section */}
        <Grid container spacing={3} style={{ marginTop: '2rem' }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} className="contact-info-paper">
              <Typography variant="h6" gutterBottom>פרטי קשר</Typography>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <HomeIcon color="primary" />
                </Grid>
                <Grid item>
                  <Typography variant="body1">כתובת: רחוב מדרסת אלבסליה 1, שפרעם, ישראל</Typography>
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
                  <Typography variant="body1">אימייל: mohanadsfe@gmail.com</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Google Map Embed */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} className="contact-info-paper">
              <Typography variant="h6" gutterBottom>מפת המיקום שלנו</Typography>
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
