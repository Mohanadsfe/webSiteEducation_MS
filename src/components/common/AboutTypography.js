import React from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import '../../pages/HomePage/HomePage.css';

export default function AboutTypography() {
  return (
    <Box className="features-section">
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card className="feature-card" elevation={6}>
            <CardContent className="feature-card-content">
              <SchoolIcon className="feature-icon" />
              <Typography variant="h6">مدرسون خبراء</Typography>
              <Typography variant="body2" color="text.secondary">
                فريق مؤهل بخبرة طويلة في التدريس الفردي.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="feature-card" elevation={6}>
            <CardContent className="feature-card-content">
              <AccessTimeIcon className="feature-icon" />
              <Typography variant="h6">مواعيد مرنة</Typography>
              <Typography variant="body2" color="text.secondary">
                اختر الوقت الأنسب لك—صباحاً أو مساءً.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="feature-card" elevation={6}>
            <CardContent className="feature-card-content">
              <PersonIcon className="feature-icon" />
              <Typography variant="h6">متابعة شخصية</Typography>
              <Typography variant="body2" color="text.secondary">
                خطة تعلم مخصصة وأهداف واضحة لكل طالب.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
