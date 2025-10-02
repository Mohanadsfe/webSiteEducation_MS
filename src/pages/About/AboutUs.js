// AboutUs.js - Beautiful About Us Page
import React, { useEffect, useState } from 'react';
import './AboutUs.css';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../services/FirebaseService';

const AboutUs = () => {
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    students: 0,
    teachers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Get total users count
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        const totalUsers = usersSnapshot.data().count;

        // Get students count (where role == 'student')
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getCountFromServer(studentsQuery);
        const students = studentsSnapshot.data().count;

        // Get teachers count (where role == 'teacher')
        const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
        const teachersSnapshot = await getCountFromServer(teachersQuery);
        const teachers = teachersSnapshot.data().count;

        setUserStats({
          totalUsers,
          students,
          teachers
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
        // Fallback to default values
        setUserStats({
          totalUsers: 0,
          students: 0,
          teachers: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className="aboutus-container">
      <div className="aboutus-content">
        <section className="aboutus-hero">
          <h1>من نحن</h1>
          <p>
            نحن في MS Education نؤمن بأن تعلم الرياضيات والبرمجة حق للجميع، وأن إتاحة المحتوى
            التعليمي عالي الجودة باللغة العربية يفتح آفاقاً أوسع للطلاب في جميع الأعمار.
            نسعى لبناء جسر بين المعرفة الأكاديمية والتطبيق العملي في عالم التكنولوجيا.
          </p>
        </section>

        <div className="aboutus-grid">
          <section className="aboutus-card">
            <h2>🎯 رسالتنا</h2>
            <p>
              تمكين الطلاب من جميع الأعمار من تعلم الرياضيات والبرمجة بأدوات ومناهج رقمية حديثة
              تساعدهم على بناء مهارات عملية ومعرفية قابلة للتطبيق في المجال الأكاديمي والمهني.
            </p>
          </section>

          <section className="aboutus-card">
            <h2>🚀 رؤيتنا</h2>
            <p>
              أن نكون الوجهة العربية الأولى لتعلم الرياضيات والبرمجة، حيث يجتمع المحتوى الموثوق،
              والتجربة التعليمية السلسة، والمجتمع الداعم في مكان واحد لجميع الطلاب.
            </p>
          </section>

          <section className="aboutus-card">
            <h2>💎 قيمنا</h2>
            <ul className="aboutus-list">
              <li>الجودة: محتوى دقيق وحديث يعتمد أفضل الممارسات في الرياضيات والبرمجة</li>
              <li>الوصول: تعلّم متاح للجميع أينما كانوا وعلى أي جهاز</li>
              <li>الأثر: مهارات حقيقية وفرص نمو ملموسة للطلاب في جميع الأعمار</li>
              <li>المجتمع: مشاركة الخبرات وبناء شبكة دعم معرفية بين الطلاب</li>
            </ul>
          </section>

          <section className="aboutus-card">
            <h2>📚 ماذا نقدم؟</h2>
            <ul className="aboutus-list">
              <li>دورات الرياضيات من المستوى الأساسي إلى المتقدم لجميع الأعمار</li>
              <li>تعلم لغات البرمجة: Python، Java، Android Development</li>
              <li>مشاريع تطبيقية وتكليفات عملية مع مراجعات دورية</li>
              <li>واجبات منزلية مخصصة ومتابعة شخصية لكل طالب</li>
              <li>شهادات إتمام ومعايير تقييم واضحة للتقدم والإنجاز</li>
            </ul>
          </section>

          <section className="aboutus-card">
            <h2>⭐ لماذا MS Education؟</h2>
            <ul className="aboutus-list">
              <li>منهجيات تعليمية تركز على التطبيق العملي وليس الحفظ</li>
              <li>تحديث مستمر للمحتوى وفق احتياجات سوق العمل والتكنولوجيا</li>
              <li>واجهة عربية بسيطة وتجربة مستخدم سلسة لجميع الأعمار</li>
              <li>دعم فني ومجتمعي نشط لمرافقتك في رحلة التعلم</li>
              <li>تقييمات وآراء الطلاب مدمجة في النظام لضمان الجودة</li>
            </ul>
          </section>

          <section className="aboutus-card">
            <h2>📊 أرقام سريعة</h2>
            <div className="aboutus-stats">
              <div className="aboutus-stat">
                <strong>{loading ? '...' : `+${userStats.totalUsers}`}</strong>
                <span>مستخدم مسجل</span>
              </div>
              <div className="aboutus-stat">
                <strong>{loading ? '...' : `+${userStats.students}`}</strong>
                <span>طالب نشط</span>
              </div>
              <div className="aboutus-stat">
                <strong>{loading ? '...' : `+${userStats.teachers}`}</strong>
                <span>مدرس متخصص</span>
              </div>
              <div className="aboutus-stat">
                <strong>+200</strong>
                <span>ساعة محتوى</span>
              </div>
              <div className="aboutus-stat">
                <strong>+100</strong>
                <span>مشروعاً عملياً</span>
              </div>
              <div className="aboutus-stat">
                <strong>24/7</strong>
                <span>دعم ومجتمع</span>
              </div>
            </div>
          </section>
        </div>

        <section className="aboutus-card" style={{ marginTop: 18 }}>
          <h2 className="aboutus-section-title">👥 فريقنا</h2>
          <p>
            يقود فريقنا خبراء في الرياضيات والبرمجة والتقنية ملتزمون بتقديم تجربة تعلم عربية عصرية.
            نحن مجموعة من المختصين الذين يجمعون بين الخبرة الأكاديمية والخبرة العملية في مجال التكنولوجيا.
          </p>
          <ul className="aboutus-list">
            <li>فريق الرياضيات: خبراء في تدريس الرياضيات لجميع المستويات والأعمار</li>
            <li>فريق البرمجة: مطورون محترفون في Python، Java، و Android</li>
            <li>فريق التقنية: بناء منصة سريعة وسهلة الاستخدام</li>
            <li>الدعم والمجتمع: مساعدة فورية ومتابعة مستمرة للطلاب</li>
          </ul>
        </section>

        <section className="aboutus-card" style={{ marginTop: 12 }}>
          <h2 className="aboutus-section-title">🤝 شركاؤنا</h2>
          <p>
            نتعاون مع مؤسسات تعليمية وخبراء مستقلين في الرياضيات والبرمجة لضمان جودة المحتوى وارتباطه بسوق العمل.
            شراكاتنا الاستراتيجية تساعدنا على تقديم أفضل تجربة تعليمية ممكنة في مجال التكنولوجيا.
          </p>
        </section>

        <div className="aboutus-cta">
          <h2 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: '700', color: '#2d3748' }}>
            🌟 ابدأ رحلتك في تعلم الرياضيات والبرمجة الآن
          </h2>
          <p style={{ marginBottom: '32px', fontSize: '1.1rem', color: '#4a5568' }}>
            انضم إلى آلاف الطلاب الذين طوروا مهاراتهم في الرياضيات والبرمجة معنا
          </p>
          <button className="aboutus-button" type="button">
            ابدأ الآن مجاناً
          </button>
        </div>

        <div className="aboutus-footer">
          <small>© {new Date().getFullYear()} MS Education — كل الحقوق محفوظة.</small>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;


