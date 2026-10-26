import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy
} from 'firebase/firestore';
import { db } from './FirebaseService';
import WhatsNewService from './WhatsNewService';

function sortLessons(list) {
  return [...list].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

/**
 * Public fields on the course doc (readable by any signed-in user):
 * - lessonsCount
 * - lessonCatalog: titles only (so students see the list)
 * - previewLesson: first video media (free watch without lessons permission)
 */
function buildPublicLessonFields(lessons) {
  const sorted = sortLessons(lessons);
  const first = sorted[0] || null;
  return {
    lessonsCount: sorted.length,
    lessonCatalog: sorted.map((l) => ({
      id: l.id,
      title: l.title || '',
      order: Number(l.order) || 0,
      durationMin: l.durationMin || null,
      thumbnailUrl: l.thumbnailUrl || '',
      learnHint: l.learnHint || '',
    })),
    previewLesson: first
      ? {
          id: first.id,
          title: first.title || '',
          driveFileId: first.driveFileId || '',
          videoUrl: first.videoUrl || '',
          provider: first.provider || '',
          durationMin: first.durationMin || null,
          order: Number(first.order) || 0,
          thumbnailUrl: first.thumbnailUrl || '',
          learnHint: first.learnHint || '',
        }
      : null,
  };
}

export class CoursesService {
  static async listCourses() {
    const qs = await getDocs(collection(db, 'courses'));
    return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  static async getCourse(courseId) {
    const snap = await getDoc(doc(db, 'courses', courseId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  static async listLessons(courseId) {
    try {
      const qs = await getDocs(
        query(collection(db, 'courses', courseId, 'lessons'), orderBy('order', 'asc'))
      );
      return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      try {
        const qs = await getDocs(collection(db, 'courses', courseId, 'lessons'));
        return sortLessons(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        return [];
      }
    }
  }

  /** Refresh public catalog + free preview on the course document */
  static async publishLessonCatalog(courseId) {
    const list = await this.listLessons(courseId);
    const fields = buildPublicLessonFields(list);
    await updateDoc(doc(db, 'courses', courseId), fields);
    return fields;
  }

  static async addCourse(data) {
    const now = new Date();
    const payload = {
      ...data,
      lessonsCount: 0,
      lessonCatalog: [],
      previewLesson: null,
      createdAt: now,
      updatedAt: now,
      contentUpdatedAt: now,
    };
    const ref = await addDoc(collection(db, 'courses'), payload);
    try {
      await WhatsNewService.pushUpdate({
        type: 'course',
        title: data.title || 'دورة جديدة',
        courseId: ref.id,
        courseTitle: data.title || '',
      });
    } catch (e) {
      console.warn('whats new course', e);
    }
    return { id: ref.id, ...payload };
  }

  static async updateCourse(courseId, data) {
    const now = new Date();
    await updateDoc(doc(db, 'courses', courseId), {
      ...data,
      updatedAt: now,
      contentUpdatedAt: now,
    });
    try {
      await WhatsNewService.pushUpdate({
        type: 'course',
        title: data.title || 'تحديث دورة',
        courseId,
        courseTitle: data.title || '',
      });
    } catch (e) {
      console.warn('whats new course update', e);
    }
  }

  static async deleteCourse(courseId) {
    await deleteDoc(doc(db, 'courses', courseId));
  }

  static async addLesson(courseId, data) {
    const now = new Date();
    const ref = await addDoc(collection(db, 'courses', courseId, 'lessons'), {
      ...data,
      createdAt: now,
    });
    try {
      await this.publishLessonCatalog(courseId);
      await updateDoc(doc(db, 'courses', courseId), {
        contentUpdatedAt: now,
        updatedAt: now,
      });
      const course = await this.getCourse(courseId);
      await WhatsNewService.pushUpdate({
        type: 'lesson',
        title: data.title || 'درس / فيديو جديد',
        courseId,
        courseTitle: course?.title || '',
      });
    } catch (e) {
      console.error('publishLessonCatalog / whats-new failed', e);
    }
    return { id: ref.id, ...data, createdAt: now };
  }

  static async updateLesson(courseId, lessonId, data) {
    await updateDoc(doc(db, 'courses', courseId, 'lessons', lessonId), data);
    try {
      await this.publishLessonCatalog(courseId);
      await updateDoc(doc(db, 'courses', courseId), {
        contentUpdatedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error('publishLessonCatalog failed', e);
    }
  }

  static async deleteLesson(courseId, lessonId) {
    await deleteDoc(doc(db, 'courses', courseId, 'lessons', lessonId));
    try {
      await this.publishLessonCatalog(courseId);
    } catch (e) {
      console.error('publishLessonCatalog failed', e);
    }
  }

  /**
   * Lessons for the student UI:
   * - Full lessons if readable (owner / enrolled)
   * - Else catalog titles + first video from course.previewLesson
   */
  static async listLessonsForViewer(courseId, courseData) {
    const fromSub = await this.listLessons(courseId);
    if (fromSub.length > 0) return fromSub;

    const catalog = Array.isArray(courseData?.lessonCatalog) ? [...courseData.lessonCatalog] : [];
    const preview = courseData?.previewLesson || null;
    if (!catalog.length && preview) {
      return [{
        id: preview.id || 'preview-0',
        title: preview.title || 'الفيديو الأول',
        order: 1,
        durationMin: preview.durationMin,
        driveFileId: preview.driveFileId || '',
        videoUrl: preview.videoUrl || '',
        provider: preview.provider || '',
        thumbnailUrl: preview.thumbnailUrl || '',
        learnHint: preview.learnHint || '',
        isPreviewOnly: true,
      }];
    }
    if (!catalog.length) return [];

    const sorted = sortLessons(catalog);
    return sorted.map((item, idx) => {
      if (idx === 0 && preview) {
        return {
          id: preview.id || item.id || 'preview-0',
          title: preview.title || item.title || 'الفيديو الأول',
          order: item.order ?? 1,
          durationMin: preview.durationMin || item.durationMin,
          driveFileId: preview.driveFileId || '',
          videoUrl: preview.videoUrl || '',
          provider: preview.provider || '',
          thumbnailUrl: preview.thumbnailUrl || item.thumbnailUrl || '',
          learnHint: preview.learnHint || item.learnHint || '',
          isPreviewOnly: true,
        };
      }
      return {
        id: item.id || `catalog-${idx}`,
        title: item.title || `فيديو ${idx + 1}`,
        order: item.order ?? idx + 1,
        durationMin: item.durationMin,
        driveFileId: '',
        videoUrl: '',
        provider: '',
        thumbnailUrl: item.thumbnailUrl || '',
        learnHint: item.learnHint || '',
        lockedPlaceholder: true,
      };
    });
  }
}

export default CoursesService;
