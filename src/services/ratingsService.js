import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export class RatingsService {
  // Submit a rating and review for a course
  static async submitCourseRating(userId, courseId, rating, review = '') {
    try {
      console.log(`Submitting rating: ${rating} for course: ${courseId} by user: ${userId}`);
      
      // Get user details
      const userDoc = await getDoc(doc(db, 'MeditationUsers', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Use Firestore transaction to ensure consistency
      await runTransaction(db, async (transaction) => {
        // 1. DO ALL READS FIRST (before any writes)
        const enrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
        const courseRef = doc(db, 'MeditationCourses', courseId);
        
        const enrollmentDoc = await transaction.get(enrollmentRef);
        const courseDoc = await transaction.get(courseRef);
        
        // 2. VALIDATE DATA
        if (!enrollmentDoc.exists()) {
          throw new Error('User enrollment not found');
        }
        
        if (!courseDoc.exists()) {
          throw new Error('Course not found');
        }
        
        // 3. PREPARE ALL DATA AND CALCULATIONS
        const enrollmentData = enrollmentDoc.data();
        const courseData = courseDoc.data();
        
        const currentTotalRatings = courseData.totalRatings || 0;
        const currentAverageRating = courseData.averageRating || 0;
        const existingRating = enrollmentData.rating;
        
        let newTotalRatings;
        let newAverageRating;
        
        if (existingRating) {
          // Update existing rating
          const totalRatingScore = currentAverageRating * currentTotalRatings;
          const updatedTotalScore = totalRatingScore - existingRating + rating;
          newTotalRatings = currentTotalRatings;
          newAverageRating = updatedTotalScore / newTotalRatings;
          console.log(`Updating existing rating from ${existingRating} to ${rating}`);
        } else {
          // Add new rating
          const totalRatingScore = currentAverageRating * currentTotalRatings;
          const updatedTotalScore = totalRatingScore + rating;
          newTotalRatings = currentTotalRatings + 1;
          newAverageRating = updatedTotalScore / newTotalRatings;
          console.log(`Adding new rating: ${rating}`);
        }
        
        // 4. DO ALL WRITES LAST
        // Update enrollment with rating data
        transaction.update(enrollmentRef, {
          rating: rating,
          review: review,
          ratedAt: serverTimestamp(),
          userName: userData.fullName || 'Anonymous',
          userEmail: userData.email || '',
        });
        
        // Update course with new ratings
        transaction.update(courseRef, {
          totalRatings: newTotalRatings,
          averageRating: parseFloat(newAverageRating.toFixed(1)),
          updatedAt: serverTimestamp(),
        });
        
        console.log(`Course ${courseId} updated: ${newTotalRatings} ratings, ${newAverageRating.toFixed(1)} average`);
      });
      
      console.log('Rating submitted successfully');
    } catch (error) {
      console.error('❌ Error submitting course rating:', error);
      throw error;
    }
  }

  // Check if user has already rated a course
  static async hasUserRatedCourse(userId, courseId) {
    try {
      const enrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
      const enrollmentDoc = await getDoc(enrollmentRef);
      
      if (!enrollmentDoc.exists()) {
        return false;
      }
      
      const enrollmentData = enrollmentDoc.data();
      return enrollmentData.rating !== undefined && enrollmentData.rating !== null;
    } catch (error) {
      console.error('Error checking user rating:', error);
      return false;
    }
  }

  // Get user's rating for a course
  static async getUserRating(userId, courseId) {
    try {
      const enrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
      const enrollmentDoc = await getDoc(enrollmentRef);
      
      if (!enrollmentDoc.exists()) {
        return null;
      }
      
      const enrollmentData = enrollmentDoc.data();
      
      if (enrollmentData.rating === undefined || enrollmentData.rating === null) {
        return null;
      }
      
      return {
        userId,
        courseId,
        rating: enrollmentData.rating,
        review: enrollmentData.review || '',
        submittedAt: enrollmentData.ratedAt?.toDate() || new Date(),
        userName: enrollmentData.userName || 'Anonymous',
        userEmail: enrollmentData.userEmail || '',
      };
    } catch (error) {
      console.error('Error getting user rating:', error);
      return null;
    }
  }

  // Get all ratings for a course
  static async getCourseRatings(courseId) {
    try {
      console.log(`Fetching ratings for course: ${courseId}`);
      
      const enrolledUsersRef = collection(db, 'MeditationCourses', courseId, 'enrolledUsers');
      const q = query(enrolledUsersRef, where('rating', '!=', null), orderBy('ratedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const ratings = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating !== undefined && data.rating !== null) {
          ratings.push({
            userId: doc.id,
            courseId,
            rating: data.rating,
            review: data.review || '',
            submittedAt: data.ratedAt?.toDate() || new Date(),
            userName: data.userName || 'Anonymous',
            userEmail: data.userEmail || '',
          });
        }
      });
      
      console.log(`Found ${ratings.length} ratings for course ${courseId}`);
      return ratings;
    } catch (error) {
      console.error('Error getting course ratings:', error);
      return [];
    }
  }

  // Get recent ratings for a course (limited number)
  static async getRecentCourseRatings(courseId, limitCount = 5) {
    try {
      console.log(`Fetching ${limitCount} recent ratings for course: ${courseId}`);
      
      const enrolledUsersRef = collection(db, 'MeditationCourses', courseId, 'enrolledUsers');
      const q = query(
        enrolledUsersRef, 
        where('rating', '!=', null), 
        orderBy('ratedAt', 'desc'), 
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      const ratings = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating !== undefined && data.rating !== null) {
          ratings.push({
            userId: doc.id,
            courseId,
            rating: data.rating,
            review: data.review || '',
            submittedAt: data.ratedAt?.toDate() || new Date(),
            userName: data.userName || 'Anonymous',
            userEmail: data.userEmail || '',
          });
        }
      });
      
      console.log(`Found ${ratings.length} recent ratings for course ${courseId}`);
      return ratings;
    } catch (error) {
      console.error('Error getting recent course ratings:', error);
      return [];
    }
  }

  // Get comprehensive rating summary for a course
  static async getCourseRatingSummary(courseId) {
    try {
      console.log(`Getting rating summary for course: ${courseId}`);
      
      // Get course basic info
      const courseDoc = await getDoc(doc(db, 'MeditationCourses', courseId));
      const courseData = courseDoc.exists() ? courseDoc.data() : {};
      
      // Get all ratings
      const allRatings = await this.getCourseRatings(courseId);
      
      // Calculate rating distribution
      const ratingDistribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      
      allRatings.forEach((rating) => {
        if (rating.rating >= 1 && rating.rating <= 5) {
          ratingDistribution[rating.rating]++;
        }
      });
      
      const summary = {
        courseId,
        totalRatings: courseData.totalRatings || allRatings.length,
        averageRating: courseData.averageRating || 0,
        ratingDistribution,
        reviews: allRatings.filter(rating => rating.review && rating.review.trim() !== ''),
      };
      
      console.log(`Rating summary for ${courseId}:`, summary);
      return summary;
    } catch (error) {
      console.error('Error getting course rating summary:', error);
      return {
        courseId,
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: [],
      };
    }
  }

  // Check if user should be prompted to rate (50% completion for multi-lesson, 100% for single lesson)
  static async shouldPromptForRating(userId, courseId) {
    try {
      const enrollmentRef = doc(db, 'MeditationCourses', courseId, 'enrolledUsers', userId);
      const enrollmentDoc = await getDoc(enrollmentRef);
      
      if (!enrollmentDoc.exists()) {
        return false;
      }
      
      const enrollmentData = enrollmentDoc.data();
      
      // Check if user has already rated
      const hasRated = enrollmentData.rating !== undefined && enrollmentData.rating !== null;
      if (hasRated) {
        return false;
      }
      
      // Get course details to check number of lessons
      const courseDoc = await getDoc(doc(db, 'MeditationCourses', courseId));
      if (!courseDoc.exists()) {
        return false;
      }
      
      const courseData = courseDoc.data();
      const totalLessons = courseData.totalLessons || courseData.modules?.length || 0;
      
      // Calculate progress
      const lessonsSeen = enrollmentData.lessonsSeen || [];
      const completedLessons = lessonsSeen.filter((lesson) => lesson.contentView === true);
      const progress = totalLessons > 0 ? (completedLessons.length / totalLessons) * 100 : 0;
      
      // For single lesson courses, require 100% completion
      if (totalLessons === 1) {
        return progress >= 100;
      }
      
      // For multi-lesson courses, require 50% completion
      return progress >= 50;
    } catch (error) {
      console.error('Error checking if should prompt for rating:', error);
      return false;
    }
  }

  // Get top-rated courses
  static async getTopRatedCourses(limitCount = 10) {
    try {
      console.log(`Fetching top ${limitCount} rated courses`);
      
      const coursesRef = collection(db, 'MeditationCourses');
      const q = query(
        coursesRef, 
        where('totalRatings', '>=', 3), // Only courses with at least 3 ratings
        orderBy('averageRating', 'desc'), 
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      const courses = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        courses.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      console.log(`Found ${courses.length} top-rated courses`);
      return courses;
    } catch (error) {
      console.error('Error getting top-rated courses:', error);
      return [];
    }
  }
} 