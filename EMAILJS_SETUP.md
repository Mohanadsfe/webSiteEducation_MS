# 📧 EmailJS Setup Guide for Teacher Notifications

## 🎯 Overview
This guide will help you set up EmailJS to send automatic email notifications when teachers are approved or rejected.

## 🚀 Step 1: Create EmailJS Account

1. **Go to** [EmailJS.com](https://www.emailjs.com/)
2. **Sign up** for a free account
3. **Verify your email** address

## 📧 Step 2: Create Email Service

1. **Go to** Email Services in your dashboard
2. **Click "Add New Service"**
3. **Choose your email provider** (Gmail, Outlook, etc.)
4. **Follow the setup instructions** for your provider
5. **Copy the Service ID** (you'll need this)

## 📝 Step 3: Create Email Templates

### Template 1: Teacher Approval Notification
1. **Go to** Email Templates
2. **Click "Create New Template"**
3. **Use this template**:

```html
Subject: طلبك لتصبح معلماً {{status}} - MS Education

مرحباً {{to_name}}،

{{notes}}

{{#if (eq status "موافق عليه")}}
تهانينا! تم قبول طلبك لتصبح معلماً في MS Education.
يمكنك الآن تسجيل الدخول والاستفادة من جميع ميزات المعلمين.
{{else}}
نأسف لإبلاغك أن طلبك لتصبح معلماً لم يتم قبوله في هذا الوقت.
{{/if}}

إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.

شكراً لك،
فريق MS Education

---
MS Education
البريد الإلكتروني: {{reply_to}}
```

4. **Save the template** and copy the Template ID

### Template 2: Admin Notification (New Teacher Request)
1. **Create another template**:

```html
Subject: طلب معلم جديد - {{teacher_name}}

مرحباً {{to_name}}،

تم تقديم طلب جديد لتصبح معلماً:

الاسم: {{teacher_name}}
البريد الإلكتروني: {{teacher_email}}
رقم الهاتف: {{teacher_phone}}

يرجى مراجعة الطلب في لوحة الإدارة.

---
MS Education System
```

## ⚙️ Step 4: Configure the Application

1. **Open** `src/services/NotificationService.js`
2. **Replace the configuration**:

```javascript
// EmailJS configuration
static EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Replace with your service ID
static EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // Replace with your template ID
static EMAILJS_USER_ID = 'YOUR_USER_ID'; // Replace with your user ID
```

3. **Get your User ID** from EmailJS dashboard → Account → API Keys

## 🧪 Step 5: Test the Setup

1. **Go to** `/teacher-approvals` page
2. **Approve or reject** a teacher request
3. **Check the notification results** in the dialog
4. **Verify emails** are being sent

## 📱 WhatsApp Integration

The WhatsApp integration is already configured with your number: **+972548010225**

When you approve/reject a teacher, you'll get:
- **Email notification** (if EmailJS is configured)
- **WhatsApp link** to send message directly

## 🔧 Troubleshooting

### Email Not Sending
1. **Check EmailJS configuration** in NotificationService.js
2. **Verify service and template IDs**
3. **Check EmailJS dashboard** for error logs
4. **Ensure email service** is properly connected

### WhatsApp Link Not Working
1. **Check phone number format** in Firebase
2. **Ensure phone number** includes country code
3. **Test the generated link** manually

## 📊 Features Included

### ✅ Email Notifications
- **Teacher approval/rejection** emails
- **Admin notifications** for new requests
- **Custom messages** with notes

### ✅ WhatsApp Integration
- **Automatic message generation**
- **Direct WhatsApp links**
- **Customized messages** per status

### ✅ Admin Dashboard
- **Real-time notification results**
- **Email and WhatsApp status**
- **Direct WhatsApp send button**

## 🎯 Usage

### For Admins:
1. **Go to** `/teacher-approvals`
2. **Approve/reject** teacher requests
3. **Add notes** for the teacher
4. **Check notification results**
5. **Click WhatsApp button** to send message

### For Teachers:
1. **Sign up** as teacher
2. **Wait for approval**
3. **Receive email** notification
4. **Get WhatsApp message** (if phone provided)

---

## 📞 Support

If you need help with EmailJS setup:
- **EmailJS Documentation**: https://www.emailjs.com/docs/
- **Contact**: mohanadsfe@gmail.com
