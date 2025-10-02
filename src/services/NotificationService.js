import emailjs from 'emailjs-com';

export class NotificationService {
  // EmailJS configuration - Update these with your actual EmailJS credentials
  static EMAILJS_SERVICE_ID = 'service_placeholder'; // Replace with your EmailJS service ID
  static EMAILJS_TEMPLATE_ID = 'template_placeholder'; // Replace with your EmailJS template ID
  static EMAILJS_USER_ID = 'user_placeholder'; // Replace with your EmailJS user ID

  // WhatsApp configuration
  static WHATSAPP_NUMBER = '+972548010225'; // Your WhatsApp number

  /**
   * Send email notification for teacher approval
   */
  static async sendTeacherApprovalEmail(userEmail, userName, status, notes = '') {
    try {
      // Check if EmailJS is properly configured
      if (this.EMAILJS_SERVICE_ID === 'service_placeholder' || 
          this.EMAILJS_TEMPLATE_ID === 'template_placeholder' || 
          this.EMAILJS_USER_ID === 'user_placeholder') {
        return { 
          success: false, 
          message: 'EmailJS not configured. Please set up EmailJS credentials in NotificationService.js' 
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
      // Check if EmailJS is properly configured
      if (this.EMAILJS_SERVICE_ID === 'service_placeholder' || 
          this.EMAILJS_TEMPLATE_ID === 'template_placeholder' || 
          this.EMAILJS_USER_ID === 'user_placeholder') {
        return { 
          success: false, 
          message: 'EmailJS not configured. Please set up EmailJS credentials in NotificationService.js' 
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
