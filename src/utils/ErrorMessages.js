// Centralized Arabic error messages for all failure cases
export const ErrorMessages = {
  // Authentication Errors
  auth: {
    'auth/invalid-email': 'البريد الإلكتروني غير صالح. يرجى التحقق من صحة البريد الإلكتروني.',
    'auth/user-not-found': 'لا يوجد مستخدم بهذا البريد الإلكتروني. يرجى التحقق من البريد أو إنشاء حساب جديد.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل. إذا كان لديك حساب، يمكنك تسجيل الدخول بدلاً من ذلك.',
    'auth/weak-password': 'كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف على الأقل.',
    'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموح. يرجى المحاولة لاحقاً بعد بضع دقائق.',
    'auth/network-request-failed': 'فشل في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
    'auth/user-disabled': 'تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة.',
    'auth/operation-not-allowed': 'هذه العملية غير مسموحة حالياً. يرجى المحاولة لاحقاً.',
    'auth/invalid-credential': 'بيانات الدخول غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.',
    'auth/requires-recent-login': 'يجب تسجيل الدخول مرة أخرى لإكمال هذه العملية.',
    'auth/account-exists-with-different-credential': 'يوجد حساب آخر بنفس البريد الإلكتروني. يرجى استخدام طريقة تسجيل الدخول الصحيحة.'
  },

  // Firestore Errors
  firestore: {
    'permission-denied': 'ليس لديك صلاحية للوصول إلى هذه البيانات. يرجى التواصل مع الإدارة.',
    'unavailable': 'خدمة قاعدة البيانات غير متاحة حالياً. يرجى المحاولة لاحقاً.',
    'deadline-exceeded': 'انتهت مهلة العملية. يرجى المحاولة مرة أخرى.',
    'resource-exhausted': 'تم استنفاد الموارد. يرجى المحاولة لاحقاً.',
    'unauthenticated': 'يجب تسجيل الدخول أولاً للوصول إلى هذه البيانات.',
    'not-found': 'البيانات المطلوبة غير موجودة.',
    'already-exists': 'هذه البيانات موجودة بالفعل.',
    'failed-precondition': 'الشروط المطلوبة غير متوفرة.',
    'aborted': 'تم إلغاء العملية.',
    'out-of-range': 'القيمة خارج النطاق المسموح.',
    'unimplemented': 'هذه الميزة غير متوفرة حالياً.',
    'internal': 'خطأ داخلي في النظام. يرجى المحاولة لاحقاً.',
    'data-loss': 'فقدان البيانات. يرجى المحاولة مرة أخرى.',
    'unknown': 'خطأ غير معروف. يرجى المحاولة لاحقاً.'
  },

  // Network Errors
  network: {
    'NETWORK_ERROR': 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.',
    'TIMEOUT': 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.',
    'CONNECTION_LOST': 'فقدان الاتصال بالشبكة. يرجى إعادة المحاولة.',
    'SERVER_ERROR': 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
    'SERVICE_UNAVAILABLE': 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.'
  },

  // Form Validation Errors
  validation: {
    'required': 'هذا الحقل مطلوب.',
    'email': 'يرجى إدخال بريد إلكتروني صالح.',
    'password': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
    'password-mismatch': 'كلمات المرور غير متطابقة.',
    'phone': 'يرجى إدخال رقم هاتف صالح.',
    'min-length': 'يجب أن يكون النص أطول من {{min}} أحرف.',
    'max-length': 'يجب أن يكون النص أقصر من {{max}} أحرف.',
    'numeric': 'يجب أن يحتوي على أرقام فقط.',
    'alphabetic': 'يجب أن يحتوي على أحرف فقط.'
  },

  // File Upload Errors
  file: {
    'FILE_TOO_LARGE': 'الملف كبير جداً. الحد الأقصى المسموح هو {{maxSize}} ميجابايت.',
    'INVALID_FILE_TYPE': 'نوع الملف غير مدعوم. الأنواع المسموحة: {{allowedTypes}}.',
    'UPLOAD_FAILED': 'فشل في رفع الملف. يرجى المحاولة مرة أخرى.',
    'FILE_NOT_FOUND': 'الملف غير موجود.',
    'PERMISSION_DENIED': 'ليس لديك صلاحية لرفع هذا الملف.'
  },

  // Course & Lesson Errors
  course: {
    'COURSE_NOT_FOUND': 'الدورة التدريبية غير موجودة.',
    'LESSON_NOT_FOUND': 'الدرس غير موجود.',
    'ACCESS_DENIED': 'ليس لديك صلاحية للوصول إلى هذه الدورة.',
    'ENROLLMENT_REQUIRED': 'يجب التسجيل في الدورة أولاً.',
    'VIDEO_NOT_AVAILABLE': 'الفيديو غير متاح حالياً.',
    'SYLLABUS_NOT_FOUND': 'المنهج الدراسي غير متوفر.'
  },

  // Payment Errors
  payment: {
    'PAYMENT_FAILED': 'فشل في عملية الدفع. يرجى المحاولة مرة أخرى.',
    'INSUFFICIENT_FUNDS': 'الرصيد غير كافي.',
    'CARD_DECLINED': 'تم رفض البطاقة. يرجى التحقق من البيانات.',
    'PAYMENT_CANCELLED': 'تم إلغاء عملية الدفع.',
    'REFUND_FAILED': 'فشل في استرداد المبلغ.'
  },

  // General System Errors
  system: {
    'UNEXPECTED_ERROR': 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.',
    'MAINTENANCE_MODE': 'النظام في وضع الصيانة. يرجى المحاولة لاحقاً.',
    'FEATURE_UNAVAILABLE': 'هذه الميزة غير متوفرة حالياً.',
    'RATE_LIMIT_EXCEEDED': 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
    'CONFIGURATION_ERROR': 'خطأ في إعدادات النظام. يرجى التواصل مع الإدارة.'
  },

  // Notification Errors
  notification: {
    'EMAIL_SEND_FAILED': 'فشل في إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.',
    'SMS_SEND_FAILED': 'فشل في إرسال الرسالة النصية. يرجى المحاولة لاحقاً.',
    'WHATSAPP_SEND_FAILED': 'فشل في إرسال رسالة الواتساب. يرجى المحاولة لاحقاً.',
    'NOTIFICATION_SERVICE_UNAVAILABLE': 'خدمة الإشعارات غير متاحة حالياً.'
  }
};

// Helper function to get error message with fallback
export const getErrorMessage = (error, category = 'system') => {
  if (!error) return ErrorMessages.system.UNEXPECTED_ERROR;
  
  const errorCode = error.code || error.message || error;
  const categoryMessages = ErrorMessages[category] || ErrorMessages.system;
  
  // Try to find exact match
  if (categoryMessages[errorCode]) {
    return categoryMessages[errorCode];
  }
  
  // Try to find partial match
  const partialMatch = Object.keys(categoryMessages).find(key => 
    errorCode.includes(key) || key.includes(errorCode)
  );
  
  if (partialMatch) {
    return categoryMessages[partialMatch];
  }
  
  // Fallback to general error
  return ErrorMessages.system.UNEXPECTED_ERROR;
};

// Helper function to replace placeholders in error messages
export const formatErrorMessage = (message, replacements = {}) => {
  let formattedMessage = message;
  
  Object.keys(replacements).forEach(key => {
    const placeholder = `{{${key}}}`;
    formattedMessage = formattedMessage.replace(new RegExp(placeholder, 'g'), replacements[key]);
  });
  
  return formattedMessage;
};

// Get user-friendly error message for any error
export const getUserFriendlyError = (error, category = 'system', replacements = {}) => {
  const message = getErrorMessage(error, category);
  return formatErrorMessage(message, replacements);
};

export default ErrorMessages;
