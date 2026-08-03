import { createTheme } from '@mui/material/styles';

/** MS Education — calm ocean / study palette (no purple defaults) */
const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#1a6bb5',
      dark: '#0b3d5c',
      light: '#4aa3df',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1a9b8e',
      dark: '#0f6e65',
      light: '#4db6ac',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#e8a317',
      dark: '#c8880a',
      light: '#f6c453',
    },
    error: {
      main: '#c62828',
      dark: '#8e1b1b',
    },
    background: {
      default: '#eef4f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#12263a',
      secondary: '#5a6f82',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Tahoma", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 800,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
        containedPrimary: {
          backgroundImage: 'linear-gradient(135deg, #1a6bb5 0%, #1a9b8e 100%)',
          boxShadow: '0 8px 22px rgba(26, 107, 181, 0.28)',
          '&:hover': {
            backgroundImage: 'linear-gradient(135deg, #155a9a 0%, #15887c 100%)',
            boxShadow: '0 10px 26px rgba(26, 107, 181, 0.35)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
