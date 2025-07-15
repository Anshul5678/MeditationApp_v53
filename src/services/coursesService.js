import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

export class CoursesService {
  static async getAllCourses() {
    try {
      const coursesCollection = collection(db, 'MeditationCourses');
      const coursesSnapshot = await getDocs(coursesCollection);
      const courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  static async getCourseById(courseId) {
    try {
      const courseDoc = doc(db, 'MeditationCourses', courseId);
      const courseSnapshot = await getDoc(courseDoc);
      
      if (courseSnapshot.exists()) {
        return {
          id: courseSnapshot.id,
          ...courseSnapshot.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  }

  static async getCourseCountByCategory(category) {
    try {
      const coursesCollection = collection(db, 'MeditationCourses');
      const q = query(
        coursesCollection,
        where('category', '==', category)
      );
      const coursesSnapshot = await getDocs(q);
      return coursesSnapshot.size;
    } catch (error) {
      console.error('Error getting course count by category:', error);
      return 0;
    }
  }

  static async getAvailableCategories() {
    try {
      console.log('Fetching available categories...');
      
      const coursesCollection = collection(db, 'MeditationCourses');
      const coursesSnapshot = await getDocs(coursesCollection);
      
      // Extract unique categories from all courses
      const categories = new Set();
      coursesSnapshot.docs.forEach(doc => {
        const courseData = doc.data();
        if (courseData.category) {
          categories.add(courseData.category.toLowerCase());
        }
      });
      
      const availableCategories = Array.from(categories).sort();
      console.log('Available categories:', availableCategories);
      
      return availableCategories;
    } catch (error) {
      console.error('Error fetching available categories:', error);
      return [];
    }
  }

  static async getCoursesByCategory(category) {
    try {
      console.log('Fetching courses for category:', category);
      
      const coursesCollection = collection(db, 'MeditationCourses');
      
      // First try with orderBy (requires composite index)
      try {
        const q = query(
          coursesCollection,
          where('category', '==', category),
          orderBy('createdAt', 'desc')
        );
        const coursesSnapshot = await getDocs(q);
        const courses = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Found ${courses.length} courses for category '${category}' with ordering`);
        return courses;
      } catch (orderByError) {
        console.log('OrderBy failed, trying without ordering:', orderByError.message);
        
        // Fallback: query without orderBy if composite index doesn't exist
        const q = query(
          coursesCollection,
          where('category', '==', category)
        );
        const coursesSnapshot = await getDocs(q);
        const courses = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in memory as fallback
        const sortedCourses = courses.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return bTime - aTime;
        });
        
        console.log(`Found ${sortedCourses.length} courses for category '${category}' without ordering`);
        return sortedCourses;
      }
    } catch (error) {
      console.error('Error fetching courses by category:', error);
      
      // If the error is about missing index, provide helpful message
      if (error.message.includes('index') || error.message.includes('orderBy')) {
        console.warn('Firestore index issue detected. Consider creating a composite index for MeditationCourses collection with fields: category (Ascending) and createdAt (Descending)');
      }
      
      return [];
    }
  }

  static async getFeaturedCourses() {
    try {
      const coursesCollection = collection(db, 'MeditationCourses');
      const q = query(
        coursesCollection,
        where('featured', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const coursesSnapshot = await getDocs(q);
      const courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return courses;
    } catch (error) {
      console.error('Error fetching featured courses:', error);
      throw error;
    }
  }

  static async getCoursesByInstructor(instructorId) {
    try {
      console.log('Fetching courses by instructor:', instructorId);
      const coursesCollection = collection(db, 'MeditationCourses');
      
      // Try multiple queries for different field names
      const queries = [
        query(coursesCollection, where('instructorId', '==', instructorId)),
        query(coursesCollection, where('instructor', '==', instructorId)),
        query(coursesCollection, where('instructors', 'array-contains', instructorId))
      ];
      
      const allCourses = [];
      const seenIds = new Set();
      
      for (const q of queries) {
        try {
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((doc) => {
            if (!seenIds.has(doc.id)) {
              const data = doc.data();
              allCourses.push({
                id: doc.id,
                ...data,
                totalLessons: data.totalLessons || data.modules?.length || 0,
                createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
              });
              seenIds.add(doc.id);
            }
          });
        } catch (err) {
          console.log('Query failed, skipping:', err.message);
          // Skip queries that fail (e.g., if field doesn't exist)
        }
      }
      
      // Sort by createdAt in descending order (most recent first)
      const sortedCourses = allCourses.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
      
      console.log(`Found ${sortedCourses.length} courses for instructor ${instructorId}`);
      return sortedCourses;
    } catch (error) {
      console.error('Error fetching courses by instructor:', error);
      return [];
    }
  }

  // Get course lessons using modules array (like Meditation_App)
  static async getCourseLessons(courseId) {
    try {
      console.log('Fetching lessons for courseId:', courseId);
      
      // Get the course first
      const course = await this.getCourseById(courseId);
      if (!course) {
        console.log('No course found for courseId:', courseId);
        return [];
      }

      console.log('Course data:', course);
      
      // Check if course has modules array (proper course-lesson linking)
      if (course.modules && course.modules.length > 0) {
        console.log(`Course has ${course.modules.length} modules, fetching lessons...`);
        
        // Fetch all lessons in parallel using module contentIds
        const lessons = await Promise.all(
          course.modules.map(async (module) => {
            const lesson = await this.getLessonById(module.contentId);
            return lesson;
          })
        );

        // Filter out null values and sort by day/order
        const validLessons = lessons
          .filter(lesson => lesson !== null)
          .sort((a, b) => (a.day || 0) - (b.day || 0));

        // Fetch instructor information for each lesson
        const lessonsWithInstructors = await Promise.all(
          validLessons.map(async (lesson) => {
            if (lesson.instructorId) {
              try {
                const instructorInfo = await this.getInstructorInfo(lesson.instructorId);
                return {
                  ...lesson,
                  instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
                };
              } catch (error) {
                console.error('Error fetching instructor info for lesson:', lesson.id, error);
                return {
                  ...lesson,
                  instructorName: 'Unknown Instructor'
                };
              }
            }
            return {
              ...lesson,
              instructorName: 'Unknown Instructor'
            };
          })
        );

        console.log(`Found ${lessonsWithInstructors.length} valid lessons with instructor info for course ${courseId}`);
        return lessonsWithInstructors;
      }

      // Fallback: Try to find lessons by instructorId
      const instructorId = course.instructorId || course.instructor || course.createdBy;
      if (instructorId) {
        console.log('No modules found, trying instructorId:', instructorId);
        
        const contentCollection = collection(db, 'MeditationContent');
        const q = query(
          contentCollection,
          where('instructorId', '==', instructorId),
          orderBy('createdAt', 'desc')
        );
        const lessonsSnapshot = await getDocs(q);
        const lessons = lessonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch instructor information for each lesson
        const lessonsWithInstructors = await Promise.all(
          lessons.map(async (lesson) => {
            if (lesson.instructorId) {
              try {
                const instructorInfo = await this.getInstructorInfo(lesson.instructorId);
                return {
                  ...lesson,
                  instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
                };
              } catch (error) {
                console.error('Error fetching instructor info for lesson:', lesson.id, error);
                return {
                  ...lesson,
                  instructorName: 'Unknown Instructor'
                };
              }
            }
            return {
              ...lesson,
              instructorName: 'Unknown Instructor'
            };
          })
        );
        
        console.log(`Found ${lessonsWithInstructors.length} lessons with instructor info for instructor ${instructorId}`);
        return lessonsWithInstructors;
      }

      // Final fallback: Try to match by title/description
      console.log('No instructorId found, trying title/description matching...');
      const allLessons = await this.getAllContent();
      
      const matchedLessons = allLessons.filter(lesson => {
        const courseTitle = course.title?.toLowerCase() || '';
        const courseDesc = course.description?.toLowerCase() || '';
        const lessonTitle = lesson.title?.toLowerCase() || '';
        const lessonDesc = lesson.description?.toLowerCase() || '';
        
        return lessonTitle.includes(courseTitle) || 
               courseTitle.includes(lessonTitle) ||
               lessonDesc.includes(courseDesc) ||
               courseDesc.includes(lessonDesc);
      });
      
      // Fetch instructor information for matched lessons
      const matchedLessonsWithInstructors = await Promise.all(
        matchedLessons.map(async (lesson) => {
          if (lesson.instructorId) {
            try {
              const instructorInfo = await this.getInstructorInfo(lesson.instructorId);
              return {
                ...lesson,
                instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
              };
            } catch (error) {
              console.error('Error fetching instructor info for lesson:', lesson.id, error);
              return {
                ...lesson,
                instructorName: 'Unknown Instructor'
              };
            }
          }
          return {
            ...lesson,
            instructorName: 'Unknown Instructor'
          };
        })
      );
      
      console.log(`Found ${matchedLessonsWithInstructors.length} lessons with instructor info by title/description matching`);
      return matchedLessonsWithInstructors;
      
    } catch (error) {
      console.error('Error fetching course lessons:', error);
      return [];
    }
  }

  // Get individual lesson by ID from MeditationContent collection
  static async getLessonById(lessonId) {
    try {
      const lessonDoc = doc(db, 'MeditationContent', lessonId);
      const lessonSnapshot = await getDoc(lessonDoc);
      
      if (lessonSnapshot.exists()) {
        const lessonData = {
          id: lessonSnapshot.id,
          ...lessonSnapshot.data()
        };
        
        // Fetch instructor information if available
        if (lessonData.instructorId) {
          try {
            const instructorInfo = await this.getInstructorInfo(lessonData.instructorId);
            lessonData.instructorName = instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor';
          } catch (error) {
            console.error('Error fetching instructor info for lesson:', lessonId, error);
            lessonData.instructorName = 'Unknown Instructor';
          }
        } else {
          lessonData.instructorName = 'Unknown Instructor';
        }
        
        return lessonData;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
      return null;
    }
  }

  // Get lessons by instructor ID
  static async getLessonsByInstructor(instructorId) {
    try {
      const contentCollection = collection(db, 'MeditationContent');
      const q = query(
        contentCollection,
        where('instructorId', '==', instructorId),
        orderBy('createdAt', 'desc')
      );
      const lessonsSnapshot = await getDocs(q);
      const lessons = lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch instructor information for each lesson
      const lessonsWithInstructors = await Promise.all(
        lessons.map(async (lesson) => {
          if (lesson.instructorId) {
            try {
              const instructorInfo = await this.getInstructorInfo(lesson.instructorId);
              return {
                ...lesson,
                instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
              };
            } catch (error) {
              console.error('Error fetching instructor info for lesson:', lesson.id, error);
              return {
                ...lesson,
                instructorName: 'Unknown Instructor'
              };
            }
          }
          return {
            ...lesson,
            instructorName: 'Unknown Instructor'
          };
        })
      );
      
      console.log(`Found ${lessonsWithInstructors.length} lessons with instructor info for instructor ${instructorId}`);
      return lessonsWithInstructors;
    } catch (error) {
      console.error('Error fetching lessons by instructor:', error);
      return [];
    }
  }

  // Get all content/lessons (like Meditation_App)
  static async getAllContent() {
    try {
      const contentCollection = collection(db, 'MeditationContent');
      const snapshot = await getDocs(contentCollection);
      
      const content = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch instructor information for each content item
      const contentWithInstructors = await Promise.all(
        content.map(async (item) => {
          if (item.instructorId) {
            try {
              const instructorInfo = await this.getInstructorInfo(item.instructorId);
              return {
                ...item,
                instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
              };
            } catch (error) {
              console.error('Error fetching instructor info for content:', item.id, error);
              return {
                ...item,
                instructorName: 'Unknown Instructor'
              };
            }
          }
          return {
            ...item,
            instructorName: 'Unknown Instructor'
          };
        })
      );
      
      console.log(`Found ${contentWithInstructors.length} total content items with instructor info in MeditationContent`);
      return contentWithInstructors;
    } catch (error) {
      console.error('Error fetching all content:', error);
      return [];
    }
  }

  // Debug method to get all lessons
  static async getAllLessons() {
    try {
      const contentCollection = collection(db, 'MeditationContent');
      const lessonsSnapshot = await getDocs(contentCollection);
      const lessons = lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${lessons.length} total lessons in MeditationContent`);
      console.log('All lessons:', lessons.map(l => ({ 
        id: l.id, 
        title: l.title, 
        instructorId: l.instructorId,
        courseId: l.courseId 
      })));
      return lessons;
    } catch (error) {
      console.error('Error fetching all lessons:', error);
      return [];
    }
  }

  static async getCourseProgress(courseId, userId) {
    try {
      if (!userId) return null;
      
      const progressDoc = doc(db, 'MeditationCourses', courseId, 'progress', userId);
      const progressSnapshot = await getDoc(progressDoc);
      
      if (progressSnapshot.exists()) {
        return {
          id: progressSnapshot.id,
          ...progressSnapshot.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching course progress:', error);
      throw error;
    }
  }

  static async canAccessCourse(courseId, userId) {
    try {
      // If user is not logged in, only allow free courses
      if (!userId) {
        const course = await this.getCourseById(courseId);
        return course && course.isFree;
      }

      // For logged-in users, check if they have access to the course
      const course = await this.getCourseById(courseId);
      if (!course) return false;

      // If course is free, allow access
      if (course.isFree) return true;

      // Check if user has enrolled in the course
      const enrollmentDoc = doc(db, 'MeditationCourses', courseId, 'enrollments', userId);
      const enrollmentSnapshot = await getDoc(enrollmentDoc);
      
      return enrollmentSnapshot.exists();
    } catch (error) {
      console.error('Error checking course access:', error);
      return false;
    }
  }

  static async getPopularCourses() {
    try {
      const coursesCollection = collection(db, 'MeditationCourses');
      const q = query(
        coursesCollection,
        orderBy('enrollmentCount', 'desc'),
        limit(10)
      );
      const coursesSnapshot = await getDocs(q);
      const courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return courses;
    } catch (error) {
      console.error('Error fetching popular courses:', error);
      throw error;
    }
  }

  static async getCourseRatings(courseId) {
    try {
      const ratingsCollection = collection(db, 'MeditationCourses', courseId, 'ratings');
      const ratingsSnapshot = await getDocs(ratingsCollection);
      const ratings = ratingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return ratings;
    } catch (error) {
      console.error('Error fetching course ratings:', error);
      throw error;
    }
  }

  static async getInstructorInfo(instructorId) {
    try {
      const instructorDoc = doc(db, 'MeditationUsers', instructorId);
      const instructorSnapshot = await getDoc(instructorDoc);
      
      if (instructorSnapshot.exists()) {
        return {
          id: instructorSnapshot.id,
          ...instructorSnapshot.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching instructor info:', error);
      throw error;
    }
  }

  // Check if user is enrolled in course using dual enrollment system
  static async isUserEnrolledInCourse(userId, courseId) {
    try {
      // Check both user-side and course-side enrollment
      const userRef = doc(db, 'MeditationUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const enrolledCourses = userData.enrolledCourses || [];
        return enrolledCourses.includes(courseId);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
  }

  // Enroll user in course using dual enrollment system (like Meditation_App)
  static async enrollInCourse(userId, courseId) {
    try {
      // Check if already enrolled
      const isAlreadyEnrolled = await this.isUserEnrolledInCourse(userId, courseId);
      if (isAlreadyEnrolled) {
        console.log('User already enrolled in course');
        return;
      }

      // Get user details
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      // 1. Add courseId to user's enrolledCourses array
      const currentEnrolledCourses = userData.enrolledCourses || [];
      const updatedEnrolledCourses = [...currentEnrolledCourses, courseId];
      
      await updateDoc(userRef, {
        enrolledCourses: updatedEnrolledCourses,
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Create course-side enrollment record
      const courseEnrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
      await setDoc(courseEnrollmentRef, {
        userEmail: userData.email,
        userName: userData.fullName,
        registeredAt: serverTimestamp(),
        lessonsSeen: [],
        allLessonView: false
      });

      // 3. Update course enrollment count
      const courseRef = doc(db, 'MeditationCourses', courseId);
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) {
        const currentCount = courseSnap.data().enrolledCount || 0;
        await updateDoc(courseRef, {
          enrolledCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      }

      console.log('User successfully enrolled in course');
    } catch (error) {
      console.error('Error enrolling user in course:', error);
      throw error;
    }
  }

  // Get enrolled users for a course
  static async getCourseEnrolledUsers(courseId) {
    try {
      const enrolledUsersCollection = collection(db, 'MeditationCourses', courseId, 'enrolledUsers');
      const enrolledUsersSnapshot = await getDocs(enrolledUsersCollection);
      const enrolledUsers = enrolledUsersSnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));
      return enrolledUsers;
    } catch (error) {
      console.error('Error fetching enrolled users:', error);
      return [];
    }
  }

  // Get user's course progress using new enrollment structure
  static async getUserCourseProgress(userId, courseId) {
    try {
      const enrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
      const enrollmentDoc = await getDoc(enrollmentRef);
      
      if (enrollmentDoc.exists()) {
        const enrollmentData = enrollmentDoc.data();
        const lessonsSeen = enrollmentData.lessonsSeen || [];
        const completedLessons = lessonsSeen.filter(lesson => lesson.contentView).length;
        const totalLessons = lessonsSeen.length;
        const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        
        return {
          userId,
          courseId,
          completedLessons,
          totalLessons,
          progress: progressPercentage,
          allLessonView: enrollmentData.allLessonView || false,
          lessonsSeen,
          registeredAt: enrollmentData.registeredAt,
          rating: enrollmentData.rating,
          review: enrollmentData.review
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user course progress:', error);
      return null;
    }
  }

  // Update lesson view status (like Meditation_App)
  static async updateLessonViewStatus(userId, courseId, contentId, viewed = true) {
    try {
      const courseEnrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
      const courseEnrollmentSnap = await getDoc(courseEnrollmentRef);
      
      if (!courseEnrollmentSnap.exists()) {
        return;
      }
      
      const enrollmentData = courseEnrollmentSnap.data();
      const lessonsSeen = enrollmentData.lessonsSeen || [];
      
      // Check if lesson is already in the array
      const existingLessonIndex = lessonsSeen.findIndex(lesson => lesson.contentId === contentId);
      
      if (existingLessonIndex >= 0) {
        // Update existing lesson
        lessonsSeen[existingLessonIndex].contentView = viewed;
      } else {
        // Add new lesson
        lessonsSeen.push({
          contentId: contentId,
          contentView: viewed
        });
      }
      
      // Check if all lessons are viewed
      const courseSnap = await getDoc(doc(db, 'MeditationCourses', courseId));
      let allLessonView = false;
      
      if (courseSnap.exists()) {
        const courseData = courseSnap.data();
        const totalLessons = courseData.totalLessons || courseData.modules?.length || 0;
        const viewedLessons = lessonsSeen.filter(lesson => lesson.contentView === true).length;
        allLessonView = viewedLessons >= totalLessons;
      }
      
      // Update the course enrollment record
      await updateDoc(courseEnrollmentRef, {
        lessonsSeen: lessonsSeen,
        allLessonView: allLessonView
      });
    } catch (error) {
      console.error('Error updating lesson view status:', error);
      throw error;
    }
  }

  // Mark lesson as completed
  static async markLessonCompleted(userId, courseId, lessonId) {
    try {
      await this.updateLessonViewStatus(userId, courseId, lessonId, true);
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
      throw error;
    }
  }


} 