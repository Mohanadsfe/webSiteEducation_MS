import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, Alert, Paper, IconButton
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import UsersService from '../../services/UsersService';
import AdminUtils from '../../components/AdminUtils';
import NotificationService from '../../services/NotificationService';
import { SystemError } from '../../components/common/ErrorDisplay';
import useErrorHandler from '../../hooks/useErrorHandler';

export default function TeacherApprovals() {
  const { error, clearError, executeWithErrorHandling } = useErrorHandler();
  const [approvals, setApprovals] = useState([]);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState('');
  const [notificationResults, setNotificationResults] = useState(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userData = await UsersService.getUser(user.uid);
        const userRole = userData?.role || '';
        setRole(userRole);
        
        // Debug: Current user role
        
        // Check if user is teacher or admin override
        const isAdminOverride = user.email === 'mohanadsfe@gmail.com' || user.email?.includes('admin');
        
        if (userRole === 'teacher' || isAdminOverride) {
          // Debug: Loading teacher approvals
          
          // Subscribe to teacher approvals
          const unsubscribeApprovals = onSnapshot(
            collection(db, 'teacher_approvals'),
            (snapshot) => {
              const approvalsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              // Debug: Found approvals
              setApprovals(approvalsData);
              setLoading(false);
            },
            (error) => {
              console.error('Error fetching approvals:', error);
              setLoading(false);
            }
          );
          
          return () => unsubscribeApprovals();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleApprove = (approval) => {
    setSelectedApproval(approval);
    setAction('approve');
    setNotes('');
    setOpenDialog(true);
  };

  const handleReject = (approval) => {
    setSelectedApproval(approval);
    setAction('reject');
    setNotes('');
    setOpenDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedApproval) return;

    setSendingNotifications(true);
    setNotificationResults(null);
    clearError();

    const result = await executeWithErrorHandling(async () => {
      // Update approval status
      await updateDoc(doc(db, 'teacher_approvals', selectedApproval.id), {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        notes: notes
      });

      // If approved, update user role
      if (action === 'approve') {
        await updateDoc(doc(db, 'users', selectedApproval.userId), {
          role: 'teacher',
          status: 'active',
          approvedAt: serverTimestamp(),
          approvedBy: user.uid
        });
      }

      // Send notifications
      const userData = {
        firstName: selectedApproval.firstName,
        lastName: selectedApproval.lastName,
        email: selectedApproval.email,
        phoneNumber: selectedApproval.phoneNumber
      };

      const notificationResults = await NotificationService.sendTeacherApprovalNotifications(
        userData,
        action === 'approve' ? 'approved' : 'rejected',
        notes
      );

      setNotificationResults(notificationResults);

      setOpenDialog(false);
      setSelectedApproval(null);
      setNotes('');
      
      return { success: true };
    }, 'system');

    if (!result?.success) {
      setNotificationResults({
        email: { success: false, message: error?.message || 'فشل في إرسال الإشعارات' },
        whatsapp: { success: false, message: error?.message || 'فشل في إرسال الإشعارات' }
      });
    }
    
    setSendingNotifications(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'غير محدد';
    
    let date;
    if (timestamp.toDate) {
      // Firebase Timestamp object
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Firebase Timestamp with seconds/nanoseconds
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Regular Date or timestamp
      date = new Date(timestamp);
    }
    
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'approved': return 'موافق عليه';
      case 'rejected': return 'مرفوض';
      default: return 'غير محدد';
    }
  };

  // Temporary admin override for testing
  const isAdminOverride = user?.email === 'mohanadsfe@gmail.com' || user?.email?.includes('admin');
  
  if (role !== 'teacher' && !isAdminOverride) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
        </Alert>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Debug Info:</strong> Current role: "{role}" | User ID: {user?.uid}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Note:</strong> You need to have role "teacher" to access this page.
        </Typography>
        
        {/* Admin utility for testing */}
        <AdminUtils />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>جاري التحميل...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        طلبات المعلمين
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        إدارة طلبات المعلمين الجدد ومراجعة طلباتهم
      </Typography>

      {error && (
        <Box sx={{ mb: 3 }}>
          <SystemError
            error={error}
            onDismiss={clearError}
            onRetry={() => window.location.reload()}
            actions={[
              {
                label: 'إعادة تحميل الصفحة',
                onClick: () => window.location.reload(),
                variant: 'outlined',
                color: 'primary'
              }
            ]}
          />
        </Box>
      )}

      <Paper sx={{ overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell>رقم الهاتف</TableCell>
              <TableCell>تاريخ الطلب</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    لا توجد طلبات معلمين حالياً
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    {approval.firstName} {approval.lastName}
                  </TableCell>
                  <TableCell>{approval.email}</TableCell>
                  <TableCell>{approval.phoneNumber || 'غير محدد'}</TableCell>
                  <TableCell>{formatDate(approval.requestedAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(approval.status)}
                      color={getStatusColor(approval.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {approval.status === 'pending' && (
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(approval)}
                          title="موافقة"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleReject(approval)}
                          title="رفض"
                        >
                          <Cancel />
                        </IconButton>
                      </Stack>
                    )}
                    {approval.status !== 'pending' && (
                      <Typography variant="body2" color="text.secondary">
                        {approval.notes && `ملاحظات: ${approval.notes}`}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Action Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action === 'approve' ? 'موافقة على طلب المعلم' : 'رفض طلب المعلم'}
        </DialogTitle>
        <DialogContent>
          {selectedApproval && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>الاسم:</strong> {selectedApproval.firstName} {selectedApproval.lastName}
              </Typography>
              <Typography variant="body1">
                <strong>البريد الإلكتروني:</strong> {selectedApproval.email}
              </Typography>
              <Typography variant="body1">
                <strong>رقم الهاتف:</strong> {selectedApproval.phoneNumber || 'غير محدد'}
              </Typography>
            </Box>
          )}
          
          <TextField
            label="ملاحظات"
            multiline
            rows={3}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={action === 'approve' ? 'ملاحظات إضافية للموافقة...' : 'سبب الرفض...'}
          />
        </DialogContent>
        {/* Notification Results */}
        {notificationResults && (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              نتائج الإشعارات:
            </Typography>
            
            <Stack spacing={1}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    <strong>البريد الإلكتروني:</strong>
                  </Typography>
                  <Chip 
                    label={notificationResults.email.success ? 'تم الإرسال' : 'فشل الإرسال'}
                    color={notificationResults.email.success ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                {!notificationResults.email.success && (
                  <Typography variant="caption" color="error">
                    {notificationResults.email.message}
                  </Typography>
                )}
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    <strong>واتساب:</strong>
                  </Typography>
                  <Chip 
                    label={notificationResults.whatsapp.success ? 'رابط جاهز' : 'غير متوفر'}
                    color={notificationResults.whatsapp.success ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                {notificationResults.whatsapp.link && (
                  <Button
                    size="small"
                    variant="outlined"
                    href={notificationResults.whatsapp.link}
                    target="_blank"
                    sx={{ mt: 1 }}
                  >
                    إرسال عبر واتساب
                  </Button>
                )}
              </Box>
            </Stack>
          </Box>
        )}

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
            disabled={sendingNotifications}
          >
            {sendingNotifications ? 'جاري الإرسال...' : (action === 'approve' ? 'موافقة' : 'رفض')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
