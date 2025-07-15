import { db } from './firebase';
import { CoursesService } from './coursesService';
import { EventsService } from './eventsService';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Service for handling saved courses and events for a user
 */
export const SavedService = {
  // -------- COURSES --------
  saveCourse: async (userId, courseId) => {
    const userRef = doc(db, 'MeditationUsers', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User not found');

    await updateDoc(userRef, {
      savedCourses: arrayUnion(courseId),
      updatedAt: serverTimestamp(),
    });
  },

  unsaveCourse: async (userId, courseId) => {
    const userRef = doc(db, 'MeditationUsers', userId);
    await updateDoc(userRef, {
      savedCourses: arrayRemove(courseId),
      updatedAt: serverTimestamp(),
    });
  },

  isCourseSaved: async (userId, courseId) => {
    const userRef = doc(db, 'MeditationUsers', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    const data = userSnap.data();
    const saved = data.savedCourses || [];
    return saved.includes(courseId);
  },

  toggleCourseSave: async (userId, courseId) => {
    const isSaved = await SavedService.isCourseSaved(userId, courseId);
    if (isSaved) {
      await SavedService.unsaveCourse(userId, courseId);
      return false;
    }
    await SavedService.saveCourse(userId, courseId);
    return true;
  },

  // -------- EVENTS --------
  saveEvent: async (userId, eventId) => {
    const userRef = doc(db, 'MeditationUsers', userId);
    await updateDoc(userRef, {
      savedEvents: arrayUnion(eventId),
      updatedAt: serverTimestamp(),
    });
  },

  unsaveEvent: async (userId, eventId) => {
    const userRef = doc(db, 'MeditationUsers', userId);
    await updateDoc(userRef, {
      savedEvents: arrayRemove(eventId),
      updatedAt: serverTimestamp(),
    });
  },

  isEventSaved: async (userId, eventId) => {
    const userRef = doc(db, 'MeditationUsers', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    const data = userSnap.data();
    const saved = data.savedEvents || [];
    return saved.includes(eventId);
  },

  toggleEventSave: async (userId, eventId) => {
    const isSaved = await SavedService.isEventSaved(userId, eventId);
    if (isSaved) {
      await SavedService.unsaveEvent(userId, eventId);
      return false;
    }
    await SavedService.saveEvent(userId, eventId);
    return true;
  },

  getSavedCourses: async (userId) => {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return [];
      const savedIds = userSnap.data().savedCourses || [];
      if (savedIds.length === 0) return [];
      const result = [];
      for (const id of savedIds) {
        try {
          const course = await CoursesService.getCourseById(id);
          if (course) result.push(course);
        } catch (e) {
          console.error('Error fetching course', id, e);
        }
      }
      return result;
    } catch (e) {
      console.error('Error getSavedCourses', e);
      return [];
    }
  },

  getSavedEvents: async (userId) => {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return [];
      const savedIds = userSnap.data().savedEvents || [];
      if (savedIds.length === 0) return [];
      const events = [];
      for (const id of savedIds) {
        try {
          const evt = await EventsService.getEventById(id);
          if (evt) events.push(evt);
        } catch (e) {
          console.error('Error fetching event', id, e);
        }
      }
      return events;
    } catch (e) {
      console.error('Error getSavedEvents', e);
      return [];
    }
  },

  getSavedEventIds: async (userId) => {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return [];
      const data = userSnap.data();
      return data.savedEvents || [];
    } catch (e) {
      console.error('Error getSavedEventIds', e);
      return [];
    }
  },
}; 