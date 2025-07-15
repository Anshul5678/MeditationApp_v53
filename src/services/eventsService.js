import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  startOfDay,
  endOfDay
} from 'firebase/firestore';
import { db } from './firebase';

export class EventsService {
  static collectionName = 'MeditationEvents';

  /**
   * Get event participants count
   */
  static async getEventParticipantsCount(eventId) {
    try {
      const attendeesRef = collection(db, this.collectionName, eventId, 'attendees');
      const snapshot = await getDocs(attendeesRef);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting event participants count:', error);
      return 0;
    }
  }

  /**
   * Get all events with participant counts
   */
  static async getAllEvents() {
    try {
      const eventsRef = collection(db, this.collectionName);
      const q = query(eventsRef);
      const querySnapshot = await getDocs(q);
      
      const events = [];
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const participantsCount = await this.getEventParticipantsCount(doc.id);
        
        events.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          type: data.type,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          maxParticipants: data.maxParticipants,
          price: data.price,
          locationType: data.locationType,
          link: data.link || '',
          physicalLocation: data.physicalLocation || '',
          coverImage: data.coverImage,
          isRecurring: data.isRecurring || false,
          status: data.status || 'upcoming',
          participants: participantsCount,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          instructors: data.instructors || [],
        });
      }

      // Fetch instructor names for each event
      const eventsWithInstructors = await this.fetchInstructorNames(events);
      return eventsWithInstructors;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  /**
   * Fetch instructor names for events
   */
  static async fetchInstructorNames(events) {
    try {
      const allInstructorIds = [...new Set(events.flatMap(event => event.instructors || []))];
      
      if (allInstructorIds.length === 0) {
        return events;
      }

      const instructorNameMap = {};
      for (const instructorId of allInstructorIds) {
        try {
          const instructorDoc = await getDoc(doc(db, 'MeditationUsers', instructorId));
          if (instructorDoc.exists()) {
            const instructorData = instructorDoc.data();
            instructorNameMap[instructorId] = instructorData.fullName || instructorData.name || 'Unknown Instructor';
          }
        } catch (error) {
          console.error(`Error fetching instructor ${instructorId}:`, error);
          instructorNameMap[instructorId] = 'Unknown Instructor';
        }
      }

      return events.map(event => ({
        ...event,
        instructorNames: (event.instructors || []).map(id => instructorNameMap[id] || 'Unknown Instructor')
      }));
    } catch (error) {
      console.error('Error fetching instructor names:', error);
      return events.map(event => ({
        ...event,
        instructorNames: (event.instructors || []).map(() => 'Unknown Instructor')
      }));
    }
  }

  /**
   * Check if an event is live
   */
  static isEventLive(dateString, startTime, endTime) {
    try {
      if (!dateString || !startTime || !endTime) {
        return false;
      }

      const now = new Date();
      const [year, month, day] = dateString.split('-').map(Number);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const eventStart = new Date(year, month - 1, day, startHour, startMinute);
      const eventEnd = new Date(year, month - 1, day, endHour, endMinute);
      
      return now >= eventStart && now <= eventEnd;
    } catch (error) {
      console.error('Error checking if event is live:', error);
      return false;
    }
  }

  /**
   * Get events by type
   */
  static async getEventsByType(type) {
    try {
      const eventsCollection = collection(db, 'MeditationEvents');
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Simple query to get events by type
      const q = query(
        eventsCollection,
        where('type', '==', type)
      );
      
      const eventsSnapshot = await getDocs(q);
      return eventsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(event => event.date >= todayStr) // Filter future events only
        .sort((a, b) => {
          // Sort by date first
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          // If same date, sort by start time
          return a.startTime.localeCompare(b.startTime);
        })
        .slice(0, 10); // Limit to 10 events
    } catch (error) {
      console.error('Error fetching events by type:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get live events
   */
  static async getLiveEvents() {
    try {
      const eventsCollection = collection(db, 'MeditationEvents');
      
      // Get all live events for today, then filter in memory
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const q = query(
        eventsCollection,
        where('type', '==', 'live'),
        where('date', '==', todayStr)
      );
      
      const eventsSnapshot = await getDocs(q);
      const currentTime = today.toTimeString().slice(0, 5);
      
      // Filter live events in memory
      return eventsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(event => 
          event.startTime <= currentTime && 
          event.endTime >= currentTime
        );
    } catch (error) {
      console.error('Error fetching live events:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(limit = 10) {
    try {
      const eventsRef = collection(db, this.collectionName);
      const now = new Date();
      const q = query(
        eventsRef,
        where('scheduledAt', '>=', now),
        orderBy('scheduledAt', 'asc'),
        limit(limit)
      );
      const querySnapshot = await getDocs(q);
      
      const events = [];
      for (const doc of querySnapshot.docs) {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          scheduledAt: eventData.scheduledAt?.toDate(),
          createdAt: eventData.createdAt?.toDate(),
          updatedAt: eventData.updatedAt?.toDate()
        });
      }
      
      return events;
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get events by instructor
   */
  static async getEventsByInstructor(instructorId) {
    try {
      const eventsRef = collection(db, this.collectionName);
      
      // Query for events where instructorId matches or instructor is in instructors array
      const q1 = query(
        eventsRef,
        where('instructorId', '==', instructorId)
      );
      
      const q2 = query(
        eventsRef,
        where('instructors', 'array-contains', instructorId)
      );
      
      const q3 = query(
        eventsRef,
        where('instructorIds', 'array-contains', instructorId)
      );
      
      const [snapshot1, snapshot2, snapshot3] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
        getDocs(q3)
      ]);
      
      const events = [];
      const seenEventIds = new Set();
      
      // Combine results from all queries
      [snapshot1, snapshot2, snapshot3].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          if (!seenEventIds.has(doc.id)) {
            seenEventIds.add(doc.id);
            const eventData = doc.data();
            events.push({
              id: doc.id,
              ...eventData,
              scheduledAt: eventData.scheduledAt?.toDate(),
              createdAt: eventData.createdAt?.toDate(),
              updatedAt: eventData.updatedAt?.toDate()
            });
          }
        });
      });
      
      // Sort by date (newest first)
      return events.sort((a, b) => {
        const dateA = a.scheduledAt || a.date || a.createdAt;
        const dateB = b.scheduledAt || b.date || b.createdAt;
        return new Date(dateB) - new Date(dateA);
      });
    } catch (error) {
      console.error('Error fetching events by instructor:', error);
      throw error;
    }
  }

  /**
   * Get a single event by ID
   */
  static async getEventById(eventId) {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data();
      return {
        id: eventDoc.id,
        ...eventData,
        createdAt: eventData.createdAt?.toDate(),
        date: eventData.date,
        startTime: eventData.startTime,
        endTime: eventData.endTime
      };
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new event
   */
  static async createEvent(eventData) {
    try {
      const eventsRef = collection(db, this.collectionName);
      const newEvent = {
        ...eventData,
        currentParticipants: 0,
        attendees: [],
        createdAt: Timestamp.fromDate(new Date(eventData.scheduledAt)),
        updatedAt: Timestamp.fromDate(new Date(eventData.scheduledAt)),
        scheduledAt: Timestamp.fromDate(new Date(eventData.scheduledAt))
      };
      
      const docRef = await addDoc(eventsRef, newEvent);
      return {
        id: docRef.id,
        ...newEvent
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an event
   */
  static async updateEvent(eventId, updateData) {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      const update = {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      await updateDoc(eventRef, update);
      return this.getEventById(eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId) {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      await deleteDoc(eventRef);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Join an event
   */
  static async joinEvent(eventId, userId, userData) {
    try {
      // Get user data if not provided
      if (!userData) {
        const userRef = doc(db, 'MeditationUsers', userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        userData = userDoc.data();
      }

      // Add to attendees subcollection
      const attendeeRef = doc(db, this.collectionName, eventId, 'attendees', userId);
      await setDoc(attendeeRef, {
        paymentStatus: 'paid',
        registeredAt: Timestamp.fromDate(new Date()),
        status: 'confirmed',
        userEmail: userData.email || '',
        userName: userData.displayName || userData.fullName || 'Anonymous',
        role: userData.role || 'user'
      });

      // Add to user's enrolledEvents
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        enrolledEvents: arrayUnion(eventId),
        updatedAt: Timestamp.fromDate(new Date())
      });

      return true;
    } catch (error) {
      console.error('Error joining event:', error);
      throw error;
    }
  }

  /**
   * Leave an event
   */
  static async leaveEvent(eventId, userId) {
    try {
      // Remove from attendees subcollection
      const attendeeRef = doc(db, this.collectionName, eventId, 'attendees', userId);
      await deleteDoc(attendeeRef);

      // Remove from user's enrolledEvents
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        enrolledEvents: arrayRemove(eventId),
        updatedAt: Timestamp.fromDate(new Date())
      });

      return true;
    } catch (error) {
      console.error('Error leaving event:', error);
      throw error;
    }
  }

  /**
   * Check if user is participating in an event
   */
  static async isUserParticipating(eventId, userId) {
    try {
      // Check attendees subcollection
      const attendeeRef = doc(db, this.collectionName, eventId, 'attendees', userId);
      const attendeeDoc = await getDoc(attendeeRef);
      
      if (attendeeDoc.exists()) {
        return true;
      }

      // Check user's enrolledEvents
      const userRef = doc(db, 'MeditationUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return (userData.enrolledEvents || []).includes(eventId);
      }

      return false;
    } catch (error) {
      console.error('Error checking event participation:', error);
      return false;
    }
  }

  /**
   * Get event attendee details
   */
  static async getEventAttendee(eventId, userId) {
    try {
      const attendeeRef = doc(db, this.collectionName, eventId, 'attendees', userId);
      const attendeeDoc = await getDoc(attendeeRef);
      
      if (!attendeeDoc.exists()) {
        return null;
      }

      const data = attendeeDoc.data();
      return {
        paymentStatus: data.paymentStatus,
        registeredAt: data.registeredAt?.toDate?.() || null,
        status: data.status,
        userEmail: data.userEmail,
        userName: data.userName
      };
    } catch (error) {
      console.error('Error getting event attendee:', error);
      return null;
    }
  }

  /**
   * Get event attendees with user details
   */
  static async getEventAttendees(eventId) {
    try {
      const attendeesRef = collection(db, this.collectionName, eventId, 'attendees');
      const querySnapshot = await getDocs(attendeesRef);
      
      const attendees = [];
      for (const doc of querySnapshot.docs) {
        const attendeeData = doc.data();
        
        // Get user details from MeditationUsers
        const userRef = doc(db, 'MeditationUsers', doc.id);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        attendees.push({
          userId: doc.id,
          paymentStatus: attendeeData.paymentStatus,
          registeredAt: attendeeData.registeredAt?.toDate?.() || null,
          status: attendeeData.status,
          userEmail: attendeeData.userEmail,
          userName: attendeeData.userName,
          role: userData?.role || 'user',
          profileImage: userData?.profileImage || null
        });
      }
      
      return attendees;
    } catch (error) {
      console.error('Error getting event attendees:', error);
      throw error;
    }
  }

  /**
   * Get all event attendees
   */
  static async getEventAttendees(eventId) {
    try {
      const attendeesRef = collection(db, this.collectionName, eventId, 'attendees');
      const querySnapshot = await getDocs(attendeesRef);
      
      const attendees = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        attendees.push({
          userId: doc.id,
          paymentStatus: data.paymentStatus,
          registeredAt: data.registeredAt?.toDate?.() || null,
          status: data.status,
          userEmail: data.userEmail,
          userName: data.userName
        });
      });
      
      return attendees;
    } catch (error) {
      console.error('Error getting event attendees:', error);
      throw error;
    }
  }

  /**
   * Get featured events
   */
  static async getFeaturedEvents(limitCount = 5) {
    try {
      const eventsCollection = collection(db, 'MeditationEvents');
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // First try with featured flag
      try {
        const q = query(
          eventsCollection,
          where('featured', '==', true),
          where('date', '>=', todayStr)
        );
        
        const eventsSnapshot = await getDocs(q);
        const events = eventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            // Sort by date first
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            // If same date, sort by start time
            return a.startTime.localeCompare(b.startTime);
          })
          .slice(0, limitCount);
        
        if (events.length > 0) {
          return events;
        }
      } catch (indexError) {
        console.warn('Featured events index not found, falling back to regular query');
      }

      // Fallback: just get upcoming events if no featured ones found
      const fallbackQuery = query(
        eventsCollection,
        where('date', '>=', todayStr)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      return fallbackSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        })
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching featured events:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get events by category
   */
  static async getEventsByCategory(category, limit = 10) {
    try {
      const eventsRef = collection(db, this.collectionName);
      const q = query(
        eventsRef,
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      const querySnapshot = await getDocs(q);
      
      const events = [];
      for (const doc of querySnapshot.docs) {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate(),
          date: eventData.date,
          startTime: eventData.startTime,
          endTime: eventData.endTime
        });
      }
      
      return events;
    } catch (error) {
      console.error('Error fetching events by category:', error);
      throw error;
    }
  }

  /**
   * Search events
   */
  static async searchEvents(searchTerm, limit = 20) {
    try {
      const eventsRef = collection(db, this.collectionName);
      const q = query(
        eventsRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      const querySnapshot = await getDocs(q);
      
      const events = [];
      for (const doc of querySnapshot.docs) {
        const eventData = doc.data();
        const event = {
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate(),
          date: eventData.date,
          startTime: eventData.startTime,
          endTime: eventData.endTime
        };
        
        // Filter by search term
        if (
          event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.instructorNames?.some(name => 
            name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        ) {
          events.push(event);
        }
      }
      
      return events;
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  /**
   * Enroll user in event
   */
  static async enrollUser(eventId, userId) {
    try {
      // Get user data
      const userRef = doc(db, 'MeditationUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();

      // Add to attendees subcollection
      const attendeeRef = doc(db, this.collectionName, eventId, 'attendees', userId);
      await setDoc(attendeeRef, {
        paymentStatus: 'paid',
        registeredAt: Timestamp.fromDate(new Date()),
        status: 'confirmed',
        userEmail: userData.email,
        userName: userData.displayName || userData.fullName || 'Anonymous',
        role: userData.role || 'user'
      });

      // Add to user's enrolledEvents
      await updateDoc(userRef, {
        enrolledEvents: arrayUnion(eventId),
        updatedAt: Timestamp.fromDate(new Date())
      });

      return true;
    } catch (error) {
      console.error('Error enrolling user in event:', error);
      throw error;
    }
  }

  /**
   * Cancel event enrollment
   */
  static async cancelEvent(eventId, userId) {
    try {
      // Remove from attendees subcollection
      const attendeeRef = doc(db, this.collectionName, eventId, 'attendees', userId);
      await deleteDoc(attendeeRef);

      // Remove from user's enrolledEvents
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        enrolledEvents: arrayRemove(eventId),
        updatedAt: Timestamp.fromDate(new Date())
      });

      return true;
    } catch (error) {
      console.error('Error canceling event enrollment:', error);
      throw error;
    }
  }

  /**
   * Check if user is enrolled in event
   */
  static async isUserEnrolledInEvent(userId, eventId) {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return false;
      }
      
      const userData = userSnap.data();
      const enrolledEvents = userData.enrolledEvents || [];
      
      return enrolledEvents.includes(eventId);
    } catch (error) {
      console.error('Error checking event enrollment:', error);
      return false;
    }
  }

  /**
   * Get user's enrolled events
   */
  static async getUserEnrolledEvents(userId) {
    try {
      // Get user's enrolledEvents
      const userRef = doc(db, 'MeditationUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const enrolledEventIds = userData.enrolledEvents || [];

      // Get event details for each enrolled event
      const enrolledEvents = await Promise.all(
        enrolledEventIds.map(async (eventId) => {
          try {
            const eventDoc = await getDoc(doc(db, this.collectionName, eventId));
            if (!eventDoc.exists()) {
              return null;
            }

            const eventData = eventDoc.data();
            const attendeeDoc = await getDoc(doc(db, this.collectionName, eventId, 'attendees', userId));
            const attendeeData = attendeeDoc.exists() ? attendeeDoc.data() : null;

            return {
              id: eventDoc.id,
              ...eventData,
              attendeeStatus: attendeeData?.status || 'unknown',
              registeredAt: attendeeData?.registeredAt?.toDate() || null,
              createdAt: eventData.createdAt?.toDate(),
              updatedAt: eventData.updatedAt?.toDate()
            };
          } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error);
            return null;
          }
        })
      );

      return enrolledEvents.filter(Boolean);
    } catch (error) {
      console.error('Error getting user enrolled events:', error);
      return [];
    }
  }
}

// Export default instance
export default EventsService; 