import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Avatar, 
  Chip, 
  Rating, 
  IconButton,
  Stack,
  Fade
} from '@mui/material';
import { keyframes } from '@mui/system';
import { 
  NavigateBefore, 
  NavigateNext, 
  FormatQuote, 
  School, 
  Star,
  StarBorder
} from '@mui/icons-material';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/FirebaseService';

// Define animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 0.9; }
`;

function StudentOpinions() {
  const [opinions, setOpinions] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOpinions = async () => {
      try {
        const q = query(collection(db, 'opinions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedOpinions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setOpinions(fetchedOpinions);
      } catch (error) {
        console.error('Error fetching opinions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpinions();
  }, []);

  useEffect(() => {
    if (opinions.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % opinions.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [opinions.length]);

  const handlePrevious = () => {
    setCurrentSlide((prevSlide) =>
      prevSlide === 0 ? opinions.length - 1 : prevSlide - 1
    );
  };

  const handleNext = () => {
    setCurrentSlide((prevSlide) => (prevSlide + 1) % opinions.length);
  };

  const getRandomColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          جاري تحميل آراء الطلاب...
        </Typography>
      </Box>
    );
  }

  if (opinions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          لا توجد آراء متاحة حالياً
        </Typography>
      </Box>
    );
  }

  const currentOpinion = opinions[currentSlide];

  return (
           <Box sx={{
             py: 4,
             px: 2,
             background: 'linear-gradient(135deg, rgba(0,100,0,0.75), rgba(25,118,210,0.75))',
             borderRadius: 4,
             position: 'relative',
             overflow: 'hidden',
             boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
             '&::before': {
               content: '""',
               position: 'absolute',
               top: 0,
               left: 0,
               right: 0,
               bottom: 0,
               background: 'rgba(255, 255, 255, 0.15)',
               backdropFilter: 'blur(15px)',
               zIndex: 1
             },
             '&::after': {
               content: '""',
               position: 'absolute',
               top: '-50%',
               left: '-50%',
               width: '200%',
               height: '200%',
               background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
               animation: `${float} 20s ease-in-out infinite`,
               zIndex: 1
             }
           }}>
      <Box sx={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
        zIndex: 1,
        animation: `${pulse} 4s ease-in-out infinite`
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        zIndex: 1,
        animation: `${pulse} 6s ease-in-out infinite reverse`
      }} />
      <Box sx={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        zIndex: 1,
        animation: `${float} 8s ease-in-out infinite`
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '30%',
        right: '15%',
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        zIndex: 1,
        animation: `${float} 10s ease-in-out infinite reverse`
      }} />

      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'white',
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.4)',
              background: 'linear-gradient(45deg, #fff 30%, #f0f0f0 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '1.8rem', md: '2.2rem' },
              letterSpacing: '0.05em'
            }}
          >
            آراء طلابنا
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.6,
              fontWeight: 400,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              fontSize: { xs: '0.9rem', md: '1rem' }
            }}
          >
            اكتشف ما يقوله طلابنا عن تجربتهم التعليمية معنا
          </Typography>
          <Box sx={{
            width: 60,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
            mx: 'auto',
            mt: 2,
            borderRadius: 1
          }} />
        </Box>

        <Fade in={true} timeout={1000}>
          <Paper sx={{
            maxWidth: 600,
            mx: 'auto',
            borderRadius: 4,
            boxShadow: '0 15px 30px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(25px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            transform: 'perspective(1000px) rotateX(1deg)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'perspective(1000px) rotateX(0deg) scale(1.01)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.2)'
            }
          }}>
            <Box sx={{
              position: 'absolute',
              top: 15,
              right: 15,
              color: 'primary.main',
              opacity: 0.4,
              zIndex: 1
            }}>
              <FormatQuote sx={{ 
                fontSize: 40,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }} />
            </Box>

            <Box sx={{ 
              p: 3, 
              pt: 5,
              position: 'relative',
              zIndex: 2
            }}>
              <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                <Avatar sx={{
                  width: 50,
                  height: 50,
                  bgcolor: getRandomColor(currentOpinion.studentName || 'Student'),
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.3)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05) rotate(3deg)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.4)'
                  }
                }}>
                  {getInitials(currentOpinion.studentName || 'Student')}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    mb: 0.5,
                    color: 'text.primary',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    fontSize: '1.1rem'
                  }}>
                    {currentOpinion.studentName || 'طالب'}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <School sx={{ 
                      fontSize: 16, 
                      color: 'primary.main',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                    }} />
                    <Chip
                      label={currentOpinion.subject || 'مادة'}
                      size="small"
                      sx={{
                        bgcolor: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </Stack>
                </Box>

                <Box sx={{ 
                  textAlign: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,193,7,0.1) 100%)',
                  border: '1px solid rgba(255,215,0,0.3)'
                }}>
                  <Rating
                    value={5}
                    readOnly
                    size="small"
                    icon={<Star sx={{ 
                      color: '#FFD700',
                      filter: 'drop-shadow(0 1px 2px rgba(255,215,0,0.3))',
                      fontSize: '1.2rem'
                    }} />}
                    emptyIcon={<StarBorder sx={{ 
                      color: '#FFD700',
                      fontSize: '1.2rem'
                    }} />}
                  />
                  <Typography variant="caption" sx={{ 
                    display: 'block', 
                    mt: 0.5,
                    fontWeight: 600,
                    color: 'text.primary',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    fontSize: '0.7rem'
                  }}>
                    تقييم ممتاز
                  </Typography>
                </Box>
              </Stack>

              <Typography
                variant="body1"
                sx={{
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  color: 'text.primary',
                  fontStyle: 'italic',
                  textAlign: 'right',
                  direction: 'rtl',
                  position: 'relative',
                  fontWeight: 400,
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                  '&::before': {
                    content: '""',
                    fontSize: '3rem',
                    color: 'primary.main',
                    opacity: 0.2,
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    fontFamily: 'serif',
                    fontWeight: 'bold'
                  },
                  '&::after': {
                    content: '""',
                    fontSize: '3rem',
                    color: 'primary.main',
                    opacity: 0.2,
                    position: 'absolute',
                    bottom: -10,
                    left: -10,
                    fontFamily: 'serif',
                    fontWeight: 'bold',
                    transform: 'rotate(180deg)'
                  }
                }}
              >
                {currentOpinion.opinion || 'لا يوجد رأي متاح'}
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {opinions.length > 1 && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 3,
            gap: 2
          }}>
                   <IconButton
                     onClick={handlePrevious}
                     sx={{
                       bgcolor: 'rgba(255, 255, 255, 0.25)',
                       color: 'white',
                       width: 40,
                       height: 40,
                       border: '1px solid rgba(255, 255, 255, 0.3)',
                       backdropFilter: 'blur(10px)',
                       '&:hover': {
                         bgcolor: 'rgba(255, 255, 255, 0.4)',
                         transform: 'scale(1.1) rotate(-3deg)',
                         boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                       },
                       transition: 'all 0.3s ease',
                       boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                     }}
                   >
                     <NavigateBefore sx={{ fontSize: '1.5rem' }} />
                   </IconButton>

            <Stack direction="row" spacing={1}>
              {opinions.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: index === currentSlide
                      ? 'white'
                      : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      transform: 'scale(1.2)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }
                  }}
                />
              ))}
            </Stack>

                   <IconButton
                     onClick={handleNext}
                     sx={{
                       bgcolor: 'rgba(255, 255, 255, 0.25)',
                       color: 'white',
                       width: 40,
                       height: 40,
                       border: '1px solid rgba(255, 255, 255, 0.3)',
                       backdropFilter: 'blur(10px)',
                       '&:hover': {
                         bgcolor: 'rgba(255, 255, 255, 0.4)',
                         transform: 'scale(1.1) rotate(3deg)',
                         boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                       },
                       transition: 'all 0.3s ease',
                       boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                     }}
                   >
                     <NavigateNext sx={{ fontSize: '1.5rem' }} />
                   </IconButton>
          </Box>
        )}

        {opinions.length > 1 && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 2,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 600,
              fontSize: '0.8rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              p: 1,
              borderRadius: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: 80,
              mx: 'auto'
            }}
          >
            {currentSlide + 1} من {opinions.length}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default StudentOpinions;
