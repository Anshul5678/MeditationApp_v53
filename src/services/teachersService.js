import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export class TeachersService {
  // Get all instructors (teachers)
  static async getInstructors() {
    try {
      const usersRef = collection(db, 'MeditationUsers');
      const q = query(
        usersRef,
        where('role', '==', 'instructor')
      );
      const snapshot = await getDocs(q);
      
      const instructors = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        instructors.push({
          uid: doc.id,
          fullName: data.fullName || data.name || 'Unknown Teacher',
          email: data.email || '',
          profileImageUrl: data.profileImageUrl || data.profileImage || '',
          location: data.location || '',
          language: data.language || 'english',
          bio: data.bio || '',
          experienceLevel: data.experienceLevel || 'beginner',
          followers: data.followers || [],
          tags: data.tags || data.specialties || [],
          status: data.status || 'active',
          role: 'instructor',
          joinedAt: data.joinedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || data.updatedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          socialMedia: data.socialMedia || {},
          meditationPreferences: data.meditationPreferences || {
            duration: 15,
            style: 'mindfulness',
            music: false,
          }
        });
      });
      
      // Sort by joinedAt (newest first)
      instructors.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
      
      return instructors;
    } catch (error) {
      console.error('Error fetching instructors:', error);
      throw error;
    }
  }

  // Get instructor by ID
  static async getInstructorById(instructorId) {
    try {
      if (!instructorId || typeof instructorId !== 'string' || instructorId.trim() === '') {
        console.warn('Invalid instructorId provided to getInstructorById:', instructorId);
        return null;
      }

      const instructorRef = doc(db, 'MeditationUsers', instructorId.trim());
      const snapshot = await getDoc(instructorRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Check if it's actually an instructor
        if (data.role !== 'instructor') {
          return null;
        }
        
        return {
          uid: snapshot.id,
          fullName: data.fullName || data.name || 'Unknown Teacher',
          email: data.email || '',
          profileImageUrl: data.profileImageUrl || data.profileImage || '',
          location: data.location || '',
          language: data.language || 'english',
          bio: data.bio || '',
          experienceLevel: data.experienceLevel || 'beginner',
          followers: data.followers || [],
          tags: data.tags || data.specialties || [],
          status: data.status || 'active',
          role: 'instructor',
          joinedAt: data.joinedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || data.updatedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          socialMedia: data.socialMedia || {},
          meditationPreferences: data.meditationPreferences || {
            duration: 15,
            style: 'mindfulness',
            music: false,
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching instructor:', error);
      throw error;
    }
  }

  // Get popular instructors (by follower count)
  static async getPopularInstructors(limitCount = 10) {
    try {
      const usersRef = collection(db, 'MeditationUsers');
      const q = query(
        usersRef,
        where('role', '==', 'instructor')
      );
      const snapshot = await getDocs(q);
      
      const instructors = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        instructors.push({
          uid: doc.id,
          fullName: data.fullName || data.name || 'Unknown Teacher',
          email: data.email || '',
          profileImageUrl: data.profileImageUrl || data.profileImage || '',
          location: data.location || '',
          language: data.language || 'english',
          bio: data.bio || '',
          experienceLevel: data.experienceLevel || 'beginner',
          followers: data.followers || [],
          tags: data.tags || data.specialties || [],
          status: data.status || 'active',
          role: 'instructor',
          joinedAt: data.joinedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || data.updatedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          socialMedia: data.socialMedia || {},
          meditationPreferences: data.meditationPreferences || {
            duration: 15,
            style: 'mindfulness',
            music: false,
          }
        });
      });
      
      // Sort by follower count (highest first)
      instructors.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));
      
      return instructors.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching popular instructors:', error);
      throw error;
    }
  }

  // Search instructors by name or tags
  static async searchInstructors(searchTerm) {
    try {
      const usersRef = collection(db, 'MeditationUsers');
      const q = query(
        usersRef,
        where('role', '==', 'instructor')
      );
      const snapshot = await getDocs(q);
      
      const instructors = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const fullName = data.fullName || data.name || '';
        const tags = data.tags || data.specialties || [];
        const bio = data.bio || '';
        
        // Check if search term matches name, tags, or bio
        const searchLower = searchTerm.toLowerCase();
        const matchesName = fullName.toLowerCase().includes(searchLower);
        const matchesTags = tags.some(tag => tag.toLowerCase().includes(searchLower));
        const matchesBio = bio.toLowerCase().includes(searchLower);
        
        if (matchesName || matchesTags || matchesBio) {
          instructors.push({
            uid: doc.id,
            fullName: fullName,
            email: data.email || '',
            profileImageUrl: data.profileImageUrl || data.profileImage || '',
            location: data.location || '',
            language: data.language || 'english',
            bio: bio,
            experienceLevel: data.experienceLevel || 'beginner',
            followers: data.followers || [],
            tags: tags,
            status: data.status || 'active',
            role: 'instructor',
            joinedAt: data.joinedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            lastActive: data.lastActive?.toDate() || data.updatedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            socialMedia: data.socialMedia || {},
            meditationPreferences: data.meditationPreferences || {
              duration: 15,
              style: 'mindfulness',
              music: false,
            }
          });
        }
      });
      
      return instructors;
    } catch (error) {
      console.error('Error searching instructors:', error);
      throw error;
    }
  }

  // Follow teacher
  static async followTeacher(userId, teacherId) {
    try {
      if (!userId) {
        throw new Error('User must be logged in to follow teachers');
      }

      // Add teacher to user's followingTeachers array
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        followingTeachers: arrayUnion(teacherId),
        updatedAt: serverTimestamp(),
      });

      // Add user to teacher's followers array
      const teacherRef = doc(db, 'MeditationUsers', teacherId);
      await updateDoc(teacherRef, {
        followers: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error following teacher:', error);
      throw error;
    }
  }

  // Unfollow teacher
  static async unfollowTeacher(userId, teacherId) {
    try {
      if (!userId) {
        throw new Error('User must be logged in to unfollow teachers');
      }

      // Remove teacher from user's followingTeachers array
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        followingTeachers: arrayRemove(teacherId),
        updatedAt: serverTimestamp(),
      });

      // Remove user from teacher's followers array
      const teacherRef = doc(db, 'MeditationUsers', teacherId);
      await updateDoc(teacherRef, {
        followers: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error unfollowing teacher:', error);
      throw error;
    }
  }

  // Check if user is following teacher
  static async isUserFollowingTeacher(userId, teacherId) {
    try {
      const teacherRef = doc(db, 'MeditationUsers', teacherId);
      const teacherSnap = await getDoc(teacherRef);
      
      if (!teacherSnap.exists()) {
        return false;
      }
      
      const teacherData = teacherSnap.data();
      const followers = teacherData.followers || [];
      
      return followers.includes(userId);
    } catch (error) {
      console.error('Error checking teacher follow status:', error);
      return false;
    }
  }

  // Get user's following teachers
  static async getUserFollowingTeachers(userId) {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return [];
      }
      
      const userData = userSnap.data();
      const teacherIds = userData.followingTeachers || [];
      
      if (teacherIds.length === 0) {
        return [];
      }

      // Fetch teacher details for followed teachers
      const teachers = [];
      
      for (const teacherId of teacherIds) {
        const teacherDoc = await getDoc(doc(db, 'MeditationUsers', teacherId));
        if (teacherDoc.exists()) {
          const data = teacherDoc.data();
          teachers.push({
            uid: teacherDoc.id,
            fullName: data.fullName || data.name || 'Unknown Teacher',
            email: data.email || '',
            profileImageUrl: data.profileImageUrl || data.profileImage || '',
            location: data.location || '',
            language: data.language || 'english',
            bio: data.bio || '',
            experienceLevel: data.experienceLevel || 'beginner',
            followers: data.followers || [],
            tags: data.tags || data.specialties || [],
            status: data.status || 'active',
            role: 'instructor',
            joinedAt: data.joinedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            lastActive: data.lastActive?.toDate() || data.updatedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            socialMedia: data.socialMedia || {},
            meditationPreferences: data.meditationPreferences || {
              duration: 15,
              style: 'mindfulness',
              music: false,
            }
          });
        }
      }
      
      return teachers;
    } catch (error) {
      console.error('Error getting user following teachers:', error);
      return [];
    }
  }

  // Get user's following teacher IDs
  static async getUserFollowingTeacherIds(userId) {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return [];
      }
      
      const userData = userSnap.data();
      return userData.followingTeachers || [];
    } catch (error) {
      console.error('Error getting user following teacher IDs:', error);
      return [];
    }
  }

  // Get teacher courses
  static async getTeacherCourses(teacherId) {
    try {
      const coursesCollection = collection(db, 'MeditationCourses');
      const q = query(
        coursesCollection,
        where('instructorId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const coursesSnapshot = await getDocs(q);
      const courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return courses;
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      throw error;
    }
  }

  // Get teacher tracks
  static async getTeacherTracks(teacherId) {
    try {
      const tracksCollection = collection(db, 'MeditationContent');
      const q = query(
        tracksCollection,
        where('instructorId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const tracksSnapshot = await getDocs(q);
      const tracks = tracksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return tracks;
    } catch (error) {
      console.error('Error fetching teacher tracks:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility
  static async getAllTeachers() {
    return this.getInstructors();
  }

  static async getTeacherById(teacherId) {
    return this.getInstructorById(teacherId);
  }

  static async getTeachersByCategory(category) {
    try {
      const instructors = await this.getInstructors();
      return instructors.filter(instructor => 
        instructor.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      );
    } catch (error) {
      console.error('Error fetching teachers by category:', error);
      throw error;
    }
  }

  static async getFeaturedTeachers() {
    try {
      const usersRef = collection(db, 'MeditationUsers');
      const q = query(
        usersRef,
        where('role', '==', 'instructor'),
        where('featured', '==', true),
        orderBy('followers', 'desc'),
        limit(10)
      );
      const teachersSnapshot = await getDocs(q);
      const teachers = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return teachers;
    } catch (error) {
      console.error('Error fetching featured teachers:', error);
      throw error;
    }
  }

  static async getPopularTeachers() {
    return this.getPopularInstructors(20);
  }

  static async getFollowedTeachers(userId) {
    return this.getUserFollowingTeachers(userId);
  }

  static async getTeacherStats(teacherId) {
    try {
      const [courses, tracks] = await Promise.all([
        this.getTeacherCourses(teacherId),
        this.getTeacherTracks(teacherId)
      ]);

      return {
        totalCourses: courses.length,
        totalTracks: tracks.length,
        totalStudents: 0, // This would need to be calculated from enrollments
        averageRating: 0, // This would need to be calculated from ratings
      };
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      throw error;
    }
  }

  static async searchTeachers(searchTerm) {
    return this.searchInstructors(searchTerm);
  }
} 