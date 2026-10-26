import emailjs from 'emailjs-com';
import { OWNER_ADMIN_EMAILS } from '../constants/admin';

export class NotificationService {
  // Prefer env vars; fall back to placeholders until configured
  static get EMAILJS_SERVICE_ID() {
    return process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_placeholder';
  }
  static get EMAILJS_TEMPLATE_ID() {
    return process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_placeholder';
  }
  static get EMAILJS_USER_ID() {
    return process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      || process.env.REACT_APP_EMAILJS_USER_ID
      || 'user_placeholder';
  }

  static get isEmailJsConfigured() {
    return (
      this.EMAILJS_SERVICE_ID !== 'service_placeholder'
      && this.EMAILJS_TEMPLATE_ID !== 'template_placeholder'
      && this.EMAILJS_USER_ID !== 'user_placeholder'
    );
  }

  /** Owner Gmail inboxes that receive new booking alerts */
  static OWNER_NOTIFY_EMAILS = [...OWNER_ADMIN_EMAILS];

  // WhatsApp configuration
  static WHATSAPP_NUMBER = '+972548010225'; // Your WhatsApp number

  static buildBookingEmailBody(booking = {}) {
    const lines = [
      'حجز ساعة دراسية جديد / New tutoring booking',
      '',
      `👤 الطالب / Student: ${booking.studentName || '—'}`,
      `📧 البريد / Email: ${booking.studentEmail || '—'}`,
      `📱 الهاتف / Phone: ${booking.studentPhone || '—'}`,
      '',
      `📅 التاريخ والوقت / Date & time: ${booking.date || '—'}`,
      `⏰ المدة / Duration: ${booking.duration || booking.hours || 1} ساعة / hours`,
      `📌 الحالة / Status: ${booking.status || 'confirmed'} (مؤكد تلقائياً / auto-confirmed)`,
      `🆔 رقم الحجز / Booking id: ${booking.id || '—'}`,
      '',
      'الحجز مؤكد فوراً. يمكنك حذفه من إدارة الحجوزات لإعادة الساعة للجدول.',
      'Booking is confirmed immediately. Delete it in Booking Manage to free the hour on the schedule.',
    ];
    return lines.join('\n');
  }

  /**
   * Notify owner Gmail(s) when a student books an hour.
   * Tries EmailJS first (if configured), then FormSubmit → owner Gmail.
   */
  /**
   * Email the student her confirmed lecture, from معهد المعرفة.
   * bookedBy: 'student' (she booked) or 'owner' (the owner booked for her).
   */
  static async notifyStudentBookingConfirmed(booking = {}) {
    const toEmail = (booking.studentEmail || '').trim();
    const hours = booking.duration || booking.hours || 1;
    const byOwner = booking.bookedBy === 'owner';
    const subject = `معهد المعرفة — ${byOwner ? 'تم حجز محاضرة لك' : 'تأكيد حجزك'} ${booking.date || ''}`.trim();
    const message = [
      'معهد المعرفة — MS Education',
      '',
      `مرحباً ${booking.studentName || 'طالبنا'}،`,
      '',
      byOwner
        ? 'قام معهد المعرفة بحجز محاضرة لك.'
        : 'تم تأكيد حجز محاضرتك في معهد المعرفة.',
      '',
      `📅 الموعد: ${booking.date || '—'}`,
      `⏰ المدة: ${hours} ساعة`,
      booking.note ? `📝 ملاحظة: ${booking.note}` : '',
      booking.id ? `🆔 رقم الحجز: ${booking.id}` : '',
      '',
      'راجع صفحة «مواعيدي» في الموقع.',
      'للإلغاء من الموقع: قبل أكثر من ٢٤ ساعة من بدء المحاضرة. إذا بقي أقل من ذلك، تواصل مع المالك.',
      '',
      'معهد المعرفة',
    ].filter(Boolean).join('\n');

    const results = { emailjs: null, formSubmit: null, success: false };
    if (!toEmail || !toEmail.includes('@')) return results;

    if (this.isEmailJsConfigured) {
      try {
        await emailjs.send(
          this.EMAILJS_SERVICE_ID,
          this.EMAILJS_TEMPLATE_ID,
          {
            to_email: toEmail,
            to_name: booking.studentName || 'Student',
            subject,
            message,
            appointment_date: booking.date || '',
            from_name: 'معهد المعرفة — MS Education',
            reply_to: 'mohanadsfe@gmail.com',
          },
          this.EMAILJS_USER_ID
        );
        results.emailjs = { success: true };
        results.success = true;
      } catch (e) {
        console.error('EmailJS student booking failed', e);
      }
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: subject,
          name: 'معهد المعرفة — MS Education',
          email: 'mohanadsfe@gmail.com',
          message,
          _template: 'table',
          _captcha: 'false',
        }),
      });
      results.formSubmit = { success: res.ok };
      if (res.ok) results.success = true;
    } catch (e) {
      console.error('Student booking email failed', e);
    }
    return results;
  }

  /** Notify student that the owner booked a specific hour for them */
  static async notifyStudentOwnerAssignedBooking(booking) {
    return this.notifyStudentBookingConfirmed({ ...booking, bookedBy: 'owner' });
  }

  static async notifyOwnerOfBooking(booking) {
    const subject = `حجز جديد — ${booking.studentName || 'طالب'} — ${booking.date || ''}`;
    const message = this.buildBookingEmailBody(booking);
    const results = { emailjs: null, formSubmit: [], success: false };

    if (this.isEmailJsConfigured) {
      try {
        for (const ownerEmail of this.OWNER_NOTIFY_EMAILS) {
          await emailjs.send(
            this.EMAILJS_SERVICE_ID,
            this.EMAILJS_TEMPLATE_ID,
            {
              to_email: ownerEmail,
              to_name: 'Owner',
              subject,
              message,
              student_name: booking.studentName || '',
              student_email: booking.studentEmail || '',
              student_phone: booking.studentPhone || '',
              appointment_date: booking.date || '',
              duration: booking.duration || booking.hours || 1,
              booking_id: booking.id || '',
              from_name: 'معهد المعرفة / MS Education',
              reply_to: booking.studentEmail || 'mohanadsfe@gmail.com',
            },
            this.EMAILJS_USER_ID
          );
        }
        results.emailjs = { success: true };
        results.success = true;
      } catch (e) {
        console.error('EmailJS owner booking notify failed', e);
        results.emailjs = { success: false, message: e.message };
      }
    }

    // Reliable Gmail delivery without EmailJS keys (first use: confirm the FormSubmit email)
    for (const ownerEmail of this.OWNER_NOTIFY_EMAILS) {
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(ownerEmail)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            _subject: subject,
            name: booking.studentName || 'Student',
            email: booking.studentEmail || 'noreply@ms-education.local',
            phone: booking.studentPhone || '',
            date: booking.date || '',
            duration: booking.duration || booking.hours || 1,
            booking_id: booking.id || '',
            message,
            _template: 'table',
          }),
        });
        const ok = res.ok;
        results.formSubmit.push({ email: ownerEmail, success: ok });
        if (ok) results.success = true;
      } catch (e) {
        console.error('FormSubmit owner booking notify failed', ownerEmail, e);
        results.formSubmit.push({ email: ownerEmail, success: false, message: e.message });
      }
    }

    return results;
  }

  /**
   * Email the student a lecture reminder.
   * kind: 'day_before' | 'hours3' | 'hours5' (legacy) | 'morning' (legacy)
   */
  static async notifyStudentBookingReminder(booking, kind = 'day_before') {
    const toEmail = (booking.studentEmail || '').trim();
    if (!toEmail || !toEmail.includes('@')) {
      return { success: false, message: 'no student email' };
    }

    const sameDay = kind === 'hours3' || kind === 'hours5' || kind === 'morning';
    const when = sameDay
      ? 'تذكير: محاضرتك اليوم بعد حوالي ٣ ساعات / Reminder: your lecture is in about 3 hours'
      : 'تذكير: محاضرتك غداً / Reminder: your lecture is tomorrow';

    const subject = sameDay
      ? `تذكير — محاضرتك بعد ٣ ساعات تقريباً ${booking.date || ''}`
      : `تذكير — محاضرتك غداً ${booking.date || ''}`;

    const message = [
      when,
      '',
      `👤 ${booking.studentName || 'طالب'}`,
      `📅 الموعد: ${booking.date || '—'}`,
      `⏰ المدة: ${booking.duration || booking.hours || 1} ساعة`,
      '',
      'نتمنى لكم درساً موفقاً — معهد المعرفة',
      '',
      'سياسة الإلغاء: يُرجى الإلغاء قبل ٢٤ ساعة من الموعد، وإلا يبقى الحجز محتسباً حتى لو لم تحضر.',
      'يمكنكم مراجعة المواعيد من صفحة «مواعيدي» في الموقع.',
    ].join('\n');

    const results = { emailjs: null, formSubmit: null, success: false };

    if (this.isEmailJsConfigured) {
      try {
        await emailjs.send(
          this.EMAILJS_SERVICE_ID,
          this.EMAILJS_TEMPLATE_ID,
          {
            to_email: toEmail,
            to_name: booking.studentName || 'Student',
            subject,
            message,
            appointment_date: booking.date || '',
            duration: booking.duration || booking.hours || 1,
            reminder_kind: kind,
            from_name: 'معهد المعرفة / MS Education',
            reply_to: 'mohanadsfe@gmail.com',
          },
          this.EMAILJS_USER_ID
        );
        results.emailjs = { success: true };
        results.success = true;
      } catch (e) {
        console.error('EmailJS student reminder failed', e);
        results.emailjs = { success: false, message: e.message };
      }
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: subject,
          name: 'معهد المعرفة',
          email: 'mohanadsfe@gmail.com',
          message,
          _template: 'table',
        }),
      });
      results.formSubmit = { success: res.ok };
      if (res.ok) results.success = true;
    } catch (e) {
      console.error('FormSubmit student reminder failed', e);
      results.formSubmit = { success: false, message: e.message };
    }

    return results;
  }

  /**
   * Send email notification for teacher approval
   */
  static async sendTeacherApprovalEmail(userEmail, userName, status, notes = '') {
    try {
      if (!this.isEmailJsConfigured) {
        return {
          success: false,
          message: 'EmailJS not configured. Set REACT_APP_EMAILJS_* env vars or use FormSubmit for bookings.',
        };
      }

      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        status: status === 'approved' ? 'موافق عليه' : 'مرفوض',
        notes: notes || (status === 'approved' ? 'تم قبول طلبك لتصبح معلماً. يمكنك الآن تسجيل الدخول والاستفادة من جميع الميزات.' : 'تم رفض طلبك لتصبح معلماً.'),
        from_name: 'MS Education',
        reply_to: 'mohanadsfe@gmail.com'
      };

      await emailjs.send(
        this.EMAILJS_SERVICE_ID,
        this.EMAILJS_TEMPLATE_ID,
        templateParams,
        this.EMAILJS_USER_ID
      );

      // Email sent successfully
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate WhatsApp message for teacher approval
   */
  static generateWhatsAppMessage(userName, status, notes = '') {
    const statusText = status === 'approved' ? 'موافق عليه' : 'مرفوض';
    const message = `مرحباً ${userName}،

تم ${statusText} طلبك لتصبح معلماً في MS Education.

${notes ? `ملاحظات: ${notes}` : ''}

${status === 'approved' 
  ? 'يمكنك الآن تسجيل الدخول والاستفادة من جميع ميزات المعلمين.'
  : 'إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.'
}

شكراً لك،
فريق MS Education`;

    return encodeURIComponent(message);
  }

  /**
   * Get WhatsApp link for teacher approval notification
   */
  static getWhatsAppLink(userPhone, userName, status, notes = '') {
    if (!userPhone) return null;
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = userPhone.replace(/[\s\-()]/g, '');
    
    const message = this.generateWhatsAppMessage(userName, status, notes);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  /**
   * Send both email and WhatsApp notifications
   */
  static async sendTeacherApprovalNotifications(userData, status, notes = '') {
    const { email, firstName, lastName, phoneNumber } = userData;
    const userName = `${firstName} ${lastName}`;
    
    const results = {
      email: { success: false, message: '' },
      whatsapp: { success: false, message: '', link: null }
    };

    // Send email notification
    if (email) {
      results.email = await this.sendTeacherApprovalEmail(email, userName, status, notes);
    }

    // Generate WhatsApp link
    if (phoneNumber) {
      results.whatsapp.link = this.getWhatsAppLink(phoneNumber, userName, status, notes);
      results.whatsapp.success = true;
      results.whatsapp.message = 'WhatsApp link generated';
    }

    return results;
  }

  /**
   * Send notification to admin about new teacher request
   */
  static async sendAdminNotification(userData) {
    try {
      const { firstName, lastName, email, phoneNumber } = userData;
      const userName = `${firstName} ${lastName}`;

      const templateParams = {
        to_email: 'mohanadsfe@gmail.com', // Admin email
        to_name: 'Admin',
        teacher_name: userName,
        teacher_email: email,
        teacher_phone: phoneNumber || 'غير محدد',
        from_name: 'MS Education System',
        reply_to: email
      };

      await emailjs.send(
        this.EMAILJS_SERVICE_ID,
        'admin_notification_template', // Different template for admin
        templateParams,
        this.EMAILJS_USER_ID
      );

      // Admin notification sent successfully
      return { success: true, message: 'Admin notification sent' };
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send appointment confirmation email
   */
  static async sendAppointmentConfirmation(data) {
    try {
      if (!this.isEmailJsConfigured) {
        return {
          success: false,
          message: 'EmailJS not configured. Set REACT_APP_EMAILJS_* env vars.',
        };
      }

      const templateParams = {
        to_email: data.toEmail,
        to_name: data.toName,
        appointment_date: data.appointmentDate,
        appointment_time: data.appointmentTime,
        duration: data.duration,
        meet_link: data.meetLink,
        from_name: 'MS Education',
        reply_to: 'mohanadsfe@gmail.com'
      };

      // Add contact details based on recipient
      if (data.isStudent) {
        // Student receives teacher contact details
        templateParams.contact_name = data.teacherName;
        templateParams.contact_email = data.teacherEmail;
        templateParams.contact_phone = data.teacherPhone;
        templateParams.message_type = 'student_confirmation';
      } else {
        // Teacher receives student contact details
        templateParams.contact_name = data.studentName;
        templateParams.contact_email = data.studentEmail;
        templateParams.contact_phone = data.studentPhone;
        templateParams.message_type = 'teacher_notification';
      }

      await emailjs.send(
        this.EMAILJS_SERVICE_ID,
        this.EMAILJS_TEMPLATE_ID,
        templateParams,
        this.EMAILJS_USER_ID
      );

      return { success: true, message: 'Appointment confirmation email sent' };
    } catch (error) {
      console.error('❌ Error sending appointment confirmation:', error);
      return { success: false, message: error.message };
    }
  }
}

export default NotificationService;
