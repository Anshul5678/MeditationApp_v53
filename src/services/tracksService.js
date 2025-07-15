import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

export class TracksService {
  // Get all tracks/lessons from MeditationContent collection
  static async getAllTracks(limitCount = 20) {
    try {
      console.log('Fetching all tracks...');
      
      const contentCollection = collection(db, 'MeditationContent');
      
      // Try with isActive filter first, fallback to all documents if field doesn't exist
      let q;
      try {
        q = query(
          contentCollection,
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const tracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Add instructor information to tracks
        const tracksWithInstructors = await Promise.all(
          tracks.map(async (track) => {
            if (track.instructorId) {
              try {
                const instructorInfo = await this.getInstructorInfo(track.instructorId);
                return {
                  ...track,
                  instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
                };
              } catch (error) {
                console.error('Error fetching instructor info for track:', track.id, error);
                return {
                  ...track,
                  instructorName: 'Unknown Instructor'
                };
              }
            }
            return {
              ...track,
              instructorName: 'Unknown Instructor'
            };
          })
        );
        
        console.log(`Found ${tracksWithInstructors.length} tracks with isActive filter`);
        return tracksWithInstructors;
      } catch (isActiveError) {
        console.log('isActive field not found, fetching all tracks...');
        
        // Fallback: get all documents without isActive filter
        q = query(
          contentCollection,
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const tracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Add instructor information to tracks
        const tracksWithInstructors = await Promise.all(
          tracks.map(async (track) => {
            if (track.instructorId) {
              try {
                const instructorInfo = await this.getInstructorInfo(track.instructorId);
                return {
                  ...track,
                  instructorName: instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor'
                };
              } catch (error) {
                console.error('Error fetching instructor info for track:', track.id, error);
                return {
                  ...track,
                  instructorName: 'Unknown Instructor'
                };
              }
            }
            return {
              ...track,
              instructorName: 'Unknown Instructor'
            };
          })
        );
        
        console.log(`Found ${tracksWithInstructors.length} tracks without isActive filter`);
        return tracksWithInstructors;
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      return [];
    }
  }

  // Get tracks by category/type
  static async getTracksByCategory(category, limitCount = 20) {
    try {
      console.log('Fetching tracks by category:', category);
      
      const contentCollection = collection(db, 'MeditationContent');
      
      // Try with isActive filter first, fallback to all documents if field doesn't exist
      let q;
      try {
        q = query(
          contentCollection,
          where('isActive', '==', true),
          where('tags', 'array-contains', category),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const tracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${tracks.length} tracks for category ${category} with isActive filter`);
        return tracks;
      } catch (isActiveError) {
        console.log('isActive field not found, fetching tracks without filter...');
        
        // Fallback: get documents without isActive filter
        q = query(
          contentCollection,
          where('tags', 'array-contains', category),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const tracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${tracks.length} tracks for category ${category} without isActive filter`);
        return tracks;
      }
    } catch (error) {
      console.error('Error fetching tracks by category:', error);
      return [];
    }
  }

  // Get tracks by instructor
  static async getTracksByInstructor(instructorId, limitCount = 20) {
    try {
      console.log('Fetching tracks by instructor:', instructorId);
      
      const contentCollection = collection(db, 'MeditationContent');
      
      // Try multiple queries for different field names
      const queries = [
        query(contentCollection, where('instructorId', '==', instructorId)),
        query(contentCollection, where('instructor', '==', instructorId)),
        query(contentCollection, where('instructors', 'array-contains', instructorId))
      ];
      
      const allTracks = [];
      const seenIds = new Set();
      
      for (const q of queries) {
        try {
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((doc) => {
            if (!seenIds.has(doc.id)) {
              const data = doc.data();
              allTracks.push({
                id: doc.id,
                ...data,
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
      const sortedTracks = allTracks.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      }).slice(0, limitCount);
      
      console.log(`Found ${sortedTracks.length} tracks for instructor ${instructorId}`);
      return sortedTracks;
    } catch (error) {
      console.error('Error fetching tracks by instructor:', error);
      return [];
    }
  }

  // Get tracks by course
  static async getTracksByCourse(courseId, limitCount = 20) {
    try {
      console.log('Fetching tracks by course:', courseId);
      
      const contentCollection = collection(db, 'MeditationContent');
      const q = query(
        contentCollection,
        where('isActive', '==', true),
        where('courseId', '==', courseId),
        orderBy('day', 'asc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const tracks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${tracks.length} tracks for course ${courseId}`);
      return tracks;
    } catch (error) {
      console.error('Error fetching tracks by course:', error);
      return [];
    }
  }

  // Search tracks
  static async searchTracks(query, limitCount = 20) {
    try {
      console.log('Searching tracks for:', query);
      
      // Get all tracks and filter in memory for search
      const allTracks = await this.getAllTracks(100); // Get more tracks for search
      
      // Filter by search query
      const filteredTracks = allTracks.filter(track => {
        const searchLower = query.toLowerCase();
        return (
          track.title?.toLowerCase().includes(searchLower) ||
          track.description?.toLowerCase().includes(searchLower) ||
          track.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          track.instructorName?.toLowerCase().includes(searchLower)
        );
      });
      
      // Limit results
      const limitedTracks = filteredTracks.slice(0, limitCount);
      
      console.log(`Found ${limitedTracks.length} tracks matching "${query}"`);
      return limitedTracks;
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  }

  // Get single track by ID
  static async getTrackById(trackId) {
    try {
      console.log('Fetching track by ID:', trackId);
      
      const trackDoc = doc(db, 'MeditationContent', trackId);
      const trackSnapshot = await getDoc(trackDoc);
      
      if (trackSnapshot.exists()) {
        const trackData = {
          id: trackSnapshot.id,
          ...trackSnapshot.data()
        };
        
        // Fetch instructor information if available
        if (trackData.instructorId) {
          try {
            const instructorInfo = await this.getInstructorInfo(trackData.instructorId);
            trackData.instructorName = instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor';
          } catch (error) {
            console.error('Error fetching instructor info for track:', trackId, error);
            trackData.instructorName = 'Unknown Instructor';
          }
        } else {
          trackData.instructorName = 'Unknown Instructor';
        }
        
        return trackData;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }

  // Get instructor information
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
      return null;
    }
  }

  // Check if user can access a track
  static async canAccessTrack(trackId, userId) {
    try {
      console.log('Checking track access for user:', userId, 'track:', trackId);
      
      // Get track details
      const track = await this.getTrackById(trackId);
      if (!track) {
        console.log('Track not found');
        return false;
      }
      
      console.log('Track details:', {
        id: track.id,
        title: track.title,
        isFree: track.isFree,
        courseId: track.courseId,
        instructorId: track.instructorId
      });
      
      // If track is free, user can access
      if (track.isFree === true) {
        console.log('Track is free, user can access');
        return true;
      }
      
      // If no user ID, they can't access paid content
      if (!userId) {
        console.log('No user ID, cannot access paid content');
        return false;
      }
      
      // Check if track is part of a course
      if (track.courseId) {
        // Check if user is enrolled in the course
        const { CoursesService } = await import('./coursesService');
        const isEnrolled = await CoursesService.isUserEnrolledInCourse(userId, track.courseId);
        console.log('User enrolled in course:', isEnrolled, 'for courseId:', track.courseId);
        return isEnrolled;
      }
      
      // If track has instructor, check if user follows instructor
      if (track.instructorId) {
        // For now, assume users can access instructor content if they're logged in
        // You can implement instructor following logic here
        console.log('Track has instructor, allowing access for logged in user');
        return true;
      }
      
      // If track doesn't have isFree set, assume it's free (for backward compatibility)
      if (track.isFree === undefined || track.isFree === null) {
        console.log('Track isFree not set, assuming free access');
        return true;
      }
      
      // Default: user cannot access paid content
      console.log('User cannot access paid content');
      return false;
    } catch (error) {
      console.error('Error checking track access:', error);
      return false;
    }
  }

  // Update track progress
  static async updateTrackProgress(userId, trackId, progress) {
    try {
      console.log('Updating track progress for user:', userId, 'track:', trackId);
      
      const progressRef = doc(db, 'UserTracksProgress', userId);
      const progressSnap = await getDoc(progressRef);
      
      let currentProgress;
      
      if (progressSnap.exists()) {
        currentProgress = progressSnap.data();
      } else {
        currentProgress = {
          userId,
          tracksProgress: {},
          updatedAt: serverTimestamp(),
        };
      }
      
      const trackProgress = currentProgress.tracksProgress[trackId] || {
        trackId,
        lastPlayedAt: serverTimestamp(),
        playCount: 0,
        totalPlayTime: 0,
        completedCount: 0,
        isLiked: false,
        isSaved: false,
        currentPosition: 0,
      };
      
      // Update progress
      const updatedTrackProgress = {
        ...trackProgress,
        ...progress,
        lastPlayedAt: serverTimestamp(),
      };
      
      // Update play count if not already incremented
      if (progress.completedCount && !progress.playCount) {
        updatedTrackProgress.playCount = trackProgress.playCount + 1;
      }
      
      currentProgress.tracksProgress[trackId] = updatedTrackProgress;
      currentProgress.updatedAt = serverTimestamp();
      
      await setDoc(progressRef, currentProgress);
      
      // Update track statistics
      await this.updateTrackStats(trackId, progress);
      
      console.log('Track progress updated successfully');
    } catch (error) {
      console.error('Error updating track progress:', error);
      throw error;
    }
  }

  // Update track statistics
  static async updateTrackStats(trackId, progress) {
    try {
      const trackRef = doc(db, 'MeditationContent', trackId);
      const trackSnap = await getDoc(trackRef);
      
      if (!trackSnap.exists()) return;
      
      const trackData = trackSnap.data();
      const updates = {};
      
      if (progress.completedCount) {
        updates.playCount = (trackData.playCount || 0) + 1;
      }
      
      if (progress.isLiked !== undefined) {
        updates.likeCount = (trackData.likeCount || 0) + (progress.isLiked ? 1 : -1);
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(trackRef, updates);
      }
    } catch (error) {
      console.error('Error updating track stats:', error);
    }
  }

  // Get user's track progress
  static async getUserTrackProgress(userId, trackId) {
    try {
      const progressRef = doc(db, 'UserTracksProgress', userId);
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        return null;
      }
      
      const progressData = progressSnap.data();
      return progressData.tracksProgress[trackId] || null;
    } catch (error) {
      console.error('Error getting user track progress:', error);
      return null;
    }
  }

  // Get user's recently played tracks
  static async getUserRecentlyPlayed(userId, limitCount = 10) {
    try {
      const progressRef = doc(db, 'UserTracksProgress', userId);
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        return [];
      }
      
      const progressData = progressSnap.data();
      const tracksProgress = progressData.tracksProgress;
      
      // Sort by last played
      const sortedTracks = Object.values(tracksProgress)
        .sort((a, b) => {
          const aTime = a.lastPlayedAt?.toDate?.() || a.lastPlayedAt || new Date(0);
          const bTime = b.lastPlayedAt?.toDate?.() || b.lastPlayedAt || new Date(0);
          return bTime - aTime;
        })
        .slice(0, limitCount);
      
      // Fetch track details
      const tracks = [];
      for (const trackProgress of sortedTracks) {
        const track = await this.getTrackById(trackProgress.trackId);
        if (track) {
          tracks.push(track);
        }
      }
      
      return tracks;
    } catch (error) {
      console.error('Error getting user recently played tracks:', error);
      return [];
    }
  }

  // Like a track
  static async likeTrack(userId, trackId) {
    try {
      await this.updateTrackProgress(userId, trackId, { isLiked: true });
      
      // Update user's liked tracks array
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        likedTracks: arrayUnion(trackId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error liking track:', error);
      throw error;
    }
  }

  // Unlike a track
  static async unlikeTrack(userId, trackId) {
    try {
      await this.updateTrackProgress(userId, trackId, { isLiked: false });
      
      // Update user's liked tracks array
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        likedTracks: arrayRemove(trackId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unliking track:', error);
      throw error;
    }
  }

  // Save a track
  static async saveTrack(userId, trackId) {
    try {
      await this.updateTrackProgress(userId, trackId, { isSaved: true });
      
      // Update user's saved tracks array
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        savedTracks: arrayUnion(trackId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving track:', error);
      throw error;
    }
  }

  // Unsave a track
  static async unsaveTrack(userId, trackId) {
    try {
      await this.updateTrackProgress(userId, trackId, { isSaved: false });
      
      // Update user's saved tracks array
      const userRef = doc(db, 'MeditationUsers', userId);
      await updateDoc(userRef, {
        savedTracks: arrayRemove(trackId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unsaving track:', error);
      throw error;
    }
  }

  // Get user's liked track IDs
  static async getUserLikedTrackIds(userId) {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data().likedTracks || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user liked track IDs:', error);
      return [];
    }
  }

  // Get user's saved track IDs
  static async getUserSavedTrackIds(userId) {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data().savedTracks || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user saved track IDs:', error);
      return [];
    }
  }
} 