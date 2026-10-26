import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import NotificationService from '../services/NotificationService';
import PaymentMethodDialog from './common/PaymentMethodDialog';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import './CalendarComponent.css';

function CalendarComponent() {
  const [events, setEvents] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  
  // Booking dialog state
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingForm, setBookingForm] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    time: '',
    duration: '1'
  });
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentItem, setPaymentItem] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const fetchUserData = async (user) => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserEmail(user.email);
          setUserName(`${userData.firstName || ''} ${userData.lastName || ''}`.trim());
          setUserPhone(userData.phoneNumber || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (userRole) {
      const fetchEvents = async () => {
        const querySnapshot = await getDocs(collection(db, 'appointments'));
        const fetchedEvents = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          title: userRole === 'teacher' ? `${doc.data().title} - ${doc.data().studentName}` : 'Reserved',
          date: doc.data().date,
          color: userRole === 'student' ? '#FF6F61' : '#64B5F6',
        }));

        setEvents(fetchedEvents);
      };

      fetchEvents();
    }
  }, [userRole]);

  const handleDateClick = async (info) => {
    const selectedDate = dayjs(info.dateStr);
    const currentDate = dayjs();
    const limitDate = currentDate.add(7, 'day');

    if (!selectedDate.isAfter(currentDate) || selectedDate.isAfter(limitDate)) {
      alert('يمكنك فقط اختيار تواريخ بين غد والـ 7 أيام القادمة.');
      return;
    }

    // Check if slot is already booked
    const existingAppointment = events.find(event => 
      dayjs(event.date).format('YYYY-MM-DD') === info.dateStr
    );
    
    if (existingAppointment) {
      alert('هذا الموعد محجوز بالفعل.');
      return;
    }

    setSelectedDate(info.dateStr);
    setBookingForm({
      studentName: userName || '',
      studentEmail: userEmail || '',
      studentPhone: userPhone || '',
      time: '',
      duration: '1',
    });
    setShowBookingDialog(true);
  };

  // Generate a random Google Meet code
  const generateMeetCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setBookingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle booking confirmation → then ask how to pay
  const handleConfirmBooking = async () => {
    const { time, duration } = bookingForm;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('يجب تسجيل الدخول');
      return;
    }
    if (!time || !duration) {
      alert('اختر الوقت ومدة الدرس.');
      return;
    }

    // Fresh student profile from Firestore (never owner data)
    let studentName = bookingForm.studentName || userName;
    let studentEmailAddr = bookingForm.studentEmail || userEmail;
    let studentPhone = bookingForm.studentPhone || userPhone || '';
    try {
      const { resolveStudentBookingIdentity } = await import('../utils/studentIdentity');
      const idn = await resolveStudentBookingIdentity(uid);
      studentName = idn.studentName || studentName;
      studentEmailAddr = idn.studentEmail || studentEmailAddr;
      studentPhone = idn.studentPhone || studentPhone;
    } catch {
      /* keep form values */
    }

    if (!studentName || !studentEmailAddr) {
      alert('بيانات الحساب ناقصة. أكمل الاسم والبريد في ملفك ثم احجز.');
      return;
    }

    // Generate Google Meet link
    const meetLink = `https://meet.google.com/${generateMeetCode()}`;

    const uniqueId = `${selectedDate}-${time}-${Date.now()}`;
    const hours = Number(duration) || 1;
    const newEvent = {
      id: uniqueId,
      studentId: uid,
      studentName,
      studentEmail: studentEmailAddr,
      studentPhone,
      teacherEmail: 'mohanadsfe@gmail.com', // Always send to owner email
      teacherName: 'مهند صفي', // Owner name
      teacherPhone: '0548010225', // Owner phone
      title: 'محاضرة تعليمية',
      date: `${selectedDate}T${time}:00`,
      duration,
      meetLink,
      createdAt: new Date(),
      bookedBy: userRole,
      status: 'confirmed',
      paymentStatus: 'awaiting',
      confirmedAt: new Date(),
    };

    try {
      // Save appointment to Firestore
      await setDoc(doc(db, 'appointments', uniqueId), newEvent);
      setEvents([...events, newEvent]);

      // Send notifications to both student and teacher
      await sendAppointmentNotifications(newEvent);

      // Close booking form, then open payment method chooser
      setShowBookingDialog(false);
      setBookingForm({
        studentName: '',
        studentEmail: '',
        studentPhone: '',
        time: '',
        duration: '1'
      });

      setBookingId(uniqueId);
      setPaymentItem({
        title: `حجز موعد — ${selectedDate} ${time}`,
        hours,
        category: 'tutoring',
        bookingId: uniqueId,
        studentName,
        studentEmail: studentEmailAddr,
        studentPhone,
      });
      setShowPaymentDialog(true);
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('حدث خطأ في حجز الموعد. حاول مرة أخرى.');
    }
  };

  // Send notifications to both student and teacher
  const sendAppointmentNotifications = async (appointment) => {
    try {
      // Send notification to student
      await NotificationService.sendAppointmentConfirmation({
        toEmail: appointment.studentEmail,
        toName: appointment.studentName,
        appointmentDate: dayjs(appointment.date).format('YYYY-MM-DD'),
        appointmentTime: dayjs(appointment.date).format('HH:mm'),
        duration: appointment.duration,
        meetLink: appointment.meetLink,
        teacherName: appointment.teacherName,
        teacherEmail: appointment.teacherEmail,
        teacherPhone: appointment.teacherPhone,
        isStudent: true
      });

      // Send notification to teacher
      await NotificationService.sendAppointmentConfirmation({
        toEmail: appointment.teacherEmail,
        toName: appointment.teacherName,
        appointmentDate: dayjs(appointment.date).format('YYYY-MM-DD'),
        appointmentTime: dayjs(appointment.date).format('HH:mm'),
        duration: appointment.duration,
        meetLink: appointment.meetLink,
        studentName: appointment.studentName,
        studentEmail: appointment.studentEmail,
        studentPhone: appointment.studentPhone,
        isStudent: false
      });

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const handleEventClick = async (info) => {
    if (userRole !== 'teacher') {
      alert('Only teachers can delete appointments.');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this appointment?');
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'appointments', info.event.id));
        setEvents(events.filter((event) => event.id !== info.event.id));
        alert('Appointment deleted successfully.');
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete the appointment.');
      }
    }
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        validRange={{
          start: dayjs().add(1, 'day').format('YYYY-MM-DD'),
          end: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        height="auto"
      />

      {/* Booking Dialog */}
      <Dialog 
        open={showBookingDialog} 
        onClose={() => setShowBookingDialog(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
          حجز موعد محاضرة
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body1" sx={{ textAlign: 'center', mb: 1 }}>
              التاريخ المحدد: {dayjs(selectedDate).format('YYYY-MM-DD')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
              بياناتك من الحساب تُستخدم تلقائياً — اختر الوقت فقط، ثم الدفع
            </Typography>

            <TextField
              label="الاسم (من حسابك)"
              value={bookingForm.studentName}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="البريد (من حسابك)"
              value={bookingForm.studentEmail}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="الهاتف (من حسابك)"
              value={bookingForm.studentPhone || '—'}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="وقت بداية المحاضرة"
              placeholder="HH:MM (مثال: 14:00)"
              value={bookingForm.time}
              onChange={(e) => handleFormChange('time', e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>مدة المحاضرة</InputLabel>
              <Select
                value={bookingForm.duration}
                onChange={(e) => handleFormChange('duration', e.target.value)}
                label="مدة المحاضرة"
              >
                <MenuItem value="1">ساعة واحدة</MenuItem>
                <MenuItem value="2">ساعتان</MenuItem>
                <MenuItem value="3">ثلاث ساعات</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button 
            onClick={() => setShowBookingDialog(false)}
            color="secondary"
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleConfirmBooking}
            variant="contained"
            color="primary"
          >
            تأكيد الحجز ومتابعة للدفع
          </Button>
        </DialogActions>
      </Dialog>

      <PaymentMethodDialog
        open={showPaymentDialog}
        onClose={() => {
          setShowPaymentDialog(false);
          setPaymentItem(null);
          setBookingId(null);
        }}
        item={paymentItem}
        bookingId={bookingId}
      />
    </>
  );
}

export default CalendarComponent;
