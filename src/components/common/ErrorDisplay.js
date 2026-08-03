import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Button,
  Stack,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  WifiOff as NetworkIcon,
  Security as SecurityIcon,
  Description as FileIcon
} from '@mui/icons-material';

const ErrorDisplay = ({
  error,
  category = 'system',
  replacements = {},
  onRetry,
  onDismiss,
  showDetails = false,
  variant = 'error', // 'error', 'warning', 'info'
  title,
  actions = [],
  fullWidth = true,
  sx = {}
}) => {
  const getErrorIcon = () => {
    switch (category) {
      case 'auth':
        return <SecurityIcon />;
      case 'network':
        return <NetworkIcon />;
      case 'file':
        return <FileIcon />;
      default:
        return variant === 'warning' ? <WarningIcon /> : 
               variant === 'info' ? <InfoIcon /> : <ErrorIcon />;
    }
  };

  const getSeverity = () => {
    switch (variant) {
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'error';
    }
  };

  const getErrorTitle = () => {
    if (title) return title;
    
    switch (category) {
      case 'auth':
        return 'خطأ في المصادقة';
      case 'firestore':
        return 'خطأ في قاعدة البيانات';
      case 'network':
        return 'خطأ في الاتصال';
      case 'validation':
        return 'خطأ في البيانات المدخلة';
      case 'file':
        return 'خطأ في الملف';
      case 'course':
        return 'خطأ في الدورة التدريبية';
      case 'payment':
        return 'خطأ في الدفع';
      case 'notification':
        return 'خطأ في الإشعارات';
      default:
        return 'خطأ في النظام';
    }
  };

  const getErrorColor = () => {
    switch (variant) {
      case 'warning': return '#ed6c02';
      case 'info': return '#0288d1';
      default: return '#d32f2f';
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'warning': return 'rgba(237, 108, 2, 0.08)';
      case 'info': return 'rgba(2, 136, 209, 0.08)';
      default: return 'rgba(211, 47, 47, 0.08)';
    }
  };

  const errorMessage = error?.message || error || 'حدث خطأ غير متوقع';

  return (
    <Box
      sx={{
        width: fullWidth ? '100%' : 'auto',
        ...sx
      }}
    >
      <Alert
        severity={getSeverity()}
        icon={getErrorIcon()}
        sx={{
          borderRadius: 2,
          backgroundColor: getBackgroundColor(),
          border: `1px solid ${getErrorColor()}20`,
          '& .MuiAlert-icon': {
            color: getErrorColor(),
            fontSize: '1.5rem'
          },
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <Stack direction="row" spacing={1}>
            {onRetry && (
              <IconButton
                size="small"
                onClick={onRetry}
                sx={{ color: getErrorColor() }}
                title="إعادة المحاولة"
              >
                <RefreshIcon />
              </IconButton>
            )}
            {onDismiss && (
              <IconButton
                size="small"
                onClick={onDismiss}
                sx={{ color: getErrorColor() }}
                title="إغلاق"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Stack>
        }
      >
        <AlertTitle sx={{ color: getErrorColor(), fontWeight: 'bold' }}>
          {getErrorTitle()}
        </AlertTitle>
        
        <Typography
          variant="body2"
          sx={{
            color: getErrorColor(),
            lineHeight: 1.6,
            mb: showDetails ? 2 : 0
          }}
        >
          {errorMessage}
        </Typography>

        {showDetails && error?.details && (
          <Collapse in={showDetails}>
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: 1,
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                <strong>تفاصيل الخطأ:</strong>
              </Typography>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  display: 'block',
                  mt: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {JSON.stringify(error.details, null, 2)}
              </Typography>
            </Box>
          </Collapse>
        )}

        {actions.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {actions.map((action, index) => (
              <Button
                key={index}
                size="small"
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                onClick={action.onClick}
                startIcon={action.icon}
                sx={{
                  fontSize: '0.75rem',
                  minWidth: 'auto'
                }}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        )}
      </Alert>
    </Box>
  );
};

// Specialized error components for different categories
export const AuthError = (props) => (
  <ErrorDisplay {...props} category="auth" />
);

export const NetworkError = (props) => (
  <ErrorDisplay {...props} category="network" />
);

export const ValidationError = (props) => (
  <ErrorDisplay {...props} category="validation" variant="warning" />
);

export const FileError = (props) => (
  <ErrorDisplay {...props} category="file" />
);

export const CourseError = (props) => (
  <ErrorDisplay {...props} category="course" />
);

export const PaymentError = (props) => (
  <ErrorDisplay {...props} category="payment" />
);

export const NotificationError = (props) => (
  <ErrorDisplay {...props} category="notification" />
);

export const SystemError = (props) => (
  <ErrorDisplay {...props} category="system" />
);

export default ErrorDisplay;
