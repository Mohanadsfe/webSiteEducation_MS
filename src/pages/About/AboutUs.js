import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../services/FirebaseService';
import ownerPics from '../../assets/Images/Ownerpic';
import { useLanguage } from '../../context/LanguageContext';
import './AboutUs.css';

const AboutUs = () => {
  const navigate = useNavigate();
  const { t, isHe } = useLanguage();
  const [userStats, setUserStats] = useState({ totalUsers: 0, students: 0, teachers: 0 });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        const studentsSnapshot = await getCountFromServer(
          query(collection(db, 'users'), where('role', '==', 'student'))
        );
        const teachersSnapshot = await getCountFromServer(
          query(collection(db, 'users'), where('role', '==', 'teacher'))
        );
        setUserStats({
          totalUsers: usersSnapshot.data().count,
          students: studentsSnapshot.data().count,
          teachers: teachersSnapshot.data().count,
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
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
          <h1>{t('من نحن', 'מי אנחנו')}</h1>
          <p>
            {t(
              'MS Education — دروس رياضيات وبرمجة ببساطة وجودة، بالعربية والعبرية.',
              'MS Education — שיעורי מתמטיקה ותכנות בפשטות ובאיכות, בערבית ובעברית.'
            )}
          </p>
        </section>

        {/* Owner / teacher personal photos */}
        <section className="aboutus-owner">
          <h2>{t('المعلّم وصاحب المنصة', 'המורה ובעל הפלטפורמה')}</h2>
          <p className="aboutus-owner-sub">
            {t(
              'أنا معلّم الرياضيات والبرمجة وصاحب MS Education',
              'אני מורה למתמטיקה ותכנות ובעל MS Education'
            )}
          </p>
          <div className="aboutus-photos">
            {ownerPics.map((pic) => (
              <button
                key={pic.id}
                type="button"
                className="aboutus-photo-card"
                onClick={() => setPreview(pic)}
              >
                <img src={pic.src} alt={isHe ? pic.titleHe : pic.titleAr} loading="lazy" />
                <span>{t(pic.titleAr, pic.titleHe)}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="aboutus-grid aboutus-grid-short">
          <section className="aboutus-card">
            <h2>{t('ماذا نقدّم؟', 'מה אנחנו מציעים?')}</h2>
            <ul className="aboutus-list">
              <li>{t('دروس خصوصية وبجروت', 'שיעורים פרטיים ובגרות')}</li>
              <li>{t('برمجة وأكاديميا', 'תכנות ואקדמיה')}</li>
              <li>{t('متابعة شخصية لكل طالب', 'ליווי אישי לכל תלמיד')}</li>
            </ul>
          </section>

          <section className="aboutus-card">
            <h2>{t('لماذا نحن؟', 'למה אנחנו?')}</h2>
            <ul className="aboutus-list">
              <li>{t('شرح واضح وعملي', 'הסבר ברור ומעשי')}</li>
              <li>{t('دعم عبر واتساب', 'תמיכה בוואטסאפ')}</li>
              <li>{t('نتائج حقيقية للطلاب', 'תוצאות אמיתיות לתלמידים')}</li>
            </ul>
          </section>

          <section className="aboutus-card">
            <h2>{t('أرقام', 'מספרים')}</h2>
            <div className="aboutus-stats aboutus-stats-compact">
              <div className="aboutus-stat">
                <strong>{loading ? '...' : `+${userStats.students}`}</strong>
                <span>{t('طالب', 'תלמידים')}</span>
              </div>
              <div className="aboutus-stat">
                <strong>{loading ? '...' : `+${userStats.totalUsers}`}</strong>
                <span>{t('مستخدم', 'משתמשים')}</span>
              </div>
              <div className="aboutus-stat">
                <strong>24/7</strong>
                <span>{t('تواصل', 'זמינות')}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="aboutus-cta">
          <h2>{t('جاهز تبدأ؟', 'מוכנים להתחיל?')}</h2>
          <p>{t('اختر رزمة أو تواصل معنا عبر واتساب.', 'בחרו חבילה או פנו אלינו בוואטסאפ.')}</p>
          <button className="aboutus-button" type="button" onClick={() => navigate('/bundles')}>
            {t('عرض الرزمات', 'צפייה בחבילות')}
          </button>
        </div>

        <div className="aboutus-footer">
          <small>© {new Date().getFullYear()} MS Education</small>
        </div>
      </div>

      {preview && (
        <div className="aboutus-lightbox" onClick={() => setPreview(null)} role="presentation">
          <button type="button" className="aboutus-lightbox-close" onClick={() => setPreview(null)}>
            ✕
          </button>
          <img
            src={preview.src}
            alt={isHe ? preview.titleHe : preview.titleAr}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default AboutUs;
