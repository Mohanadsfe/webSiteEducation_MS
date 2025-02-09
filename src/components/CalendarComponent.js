import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';  // Ensure getDoc is imported
import { db, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import './CalendarComponent.css';

function CalendarComponent() {
  const [events, setEvents] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUserData = async (user) => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserEmail(user.email);
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
    if (userRole === 'student') {
      const selectedDate = dayjs(info.dateStr);
      const currentDate = dayjs();
      const limitDate = currentDate.add(7, 'day');

      if (!selectedDate.isAfter(currentDate) || selectedDate.isAfter(limitDate)) {
        alert('You can only choose dates between tomorrow and the next 7 days.');
        return;
      }

      alert('You cannot book new appointments as a student.');
      return;
    }

    const studentName = prompt('Enter your name:');
    if (!studentName) return;

    const time = prompt('Enter the start time for your lecture (HH:MM format):');
    if (!time) return;

    const duration = prompt('Enter the duration (1-3 hours):');
    if (!duration) return;

    const uniqueId = `${info.dateStr}-${time}`;
    const newEvent = {
      id: uniqueId,
      studentName,
      email: userEmail,
      title: 'Lecture Appointment',
      date: `${info.dateStr}T${time}:00`,
      duration,
    };

    await setDoc(doc(db, 'appointments', uniqueId), newEvent);
    setEvents([...events, newEvent]);
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
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      dateClick={handleDateClick}
      eventClick={handleEventClick}
      validRange={{
        start: dayjs().add(1, 'day').format('YYYY-MM-DD'),  // Start from tomorrow
        end: dayjs().add(7, 'day').format('YYYY-MM-DD'),     // Limit to 7 days from now
      }}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      height="auto"
    />
  );
}

export default CalendarComponent;
