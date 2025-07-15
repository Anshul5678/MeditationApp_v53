import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Colors from '../../src/constants/Colors';
import { CoursesService } from '../../src/services/coursesService';
import { RatingsService } from '../../src/services/ratingsService';
import { useAuth } from '../../src/context/AuthContext';
import { CourseRatingDisplay } from '../../src/components/courses/CourseRatingDisplay';
import { CourseRatingModal } from '../../src/components/courses/CourseRatingModal';

const { width, height } = Dimensions.get('window');

const LessonItem = ({ lesson, index, isLocked, isCompleted, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.lessonItem,
      {
        backgroundColor: theme.card,
        borderColor: theme.border,
        opacity: isLocked ? 0.6 : 1,
      },
    ]}
    onPress={onPress}
    disabled={isLocked}
  >
    <View style={styles.lessonIcon}>
      <View style={[styles.lessonNumber, { backgroundColor: isLocked ? theme.textSecondary : (isCompleted ? '#4CAF50' : theme.tint) }]}>
        {isLocked ? (
          <Ionicons name="lock-closed" size={16} color={theme.background} />
        ) : isCompleted ? (
          <Ionicons name="checkmark" size={16} color={theme.background} />
        ) : (
          <Text style={[styles.lessonNumberText, { color: theme.background }]}>{index + 1}</Text>
        )}
      </View>
    </View>
    <View style={styles.lessonContent}>
      <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={1}>
        {lesson.title}
      </Text>
      <Text style={[styles.lessonDuration, { color: theme.textSecondary }]}>
        {lesson.duration || 0} min{lesson.type ? ` • ${lesson.type}` : ''}
      </Text>
      {lesson.instructorName && (
        <Text style={[styles.lessonInstructor, { color: theme.textSecondary }]} numberOfLines={1}>
          by {lesson.instructorName}
        </Text>
      )}
      {isCompleted && (
        <Text style={[styles.completedText, { color: '#4CAF50' }]}>Completed</Text>
      )}
    </View>
    <View style={styles.lessonAction}>
      <Ionicons 
        name={isCompleted ? "checkmark-circle" : "play"} 
        size={20} 
        color={isLocked ? theme.textSecondary : (isCompleted ? '#4CAF50' : theme.tint)} 
      />
    </View>
  </TouchableOpacity>
);

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [course, setCourse] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [courseProgress, setCourseProgress] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);

  useEffect(() => {
    if (id) {
      loadCourseDetails();
    }
  }, [id]);

  useEffect(() => {
    if (user && course) {
      checkEnrollmentStatus();
    }
  }, [user, course]);

  useEffect(() => {
    if (course?.id) {
      loadRatingSummary();
    }
  }, [course?.id]);

  useEffect(() => {
    if (user && course?.id) {
      loadUserRating();
      checkRatingEligibility();
    }
  }, [user, course?.id]);

  const loadCourseDetails = async () => {
    try {
      setIsLoading(true);
      const courseData = await CoursesService.getCourseById(id);
      if (courseData) {
        setCourse(courseData);
        
        // Load course lessons/contents - get lessons specific to this course
        const lessons = await CoursesService.getCourseLessons(id);
        console.log(`Loaded ${lessons.length} lessons for course ${id}`);
        setCourseLessons(lessons);
      } else {
        Alert.alert('Error', 'Course not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading course details:', error);
      Alert.alert('Error', 'Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRatingSummary = async () => {
    try {
      const summary = await RatingsService.getCourseRatingSummary(course.id);
      setRatingSummary(summary);
    } catch (error) {
      console.error('Error loading rating summary:', error);
    }
  };

  const loadUserRating = async () => {
    try {
      const rating = await RatingsService.getUserRating(user.uid, course.id);
      setUserRating(rating);
    } catch (error) {
      console.error('Error loading user rating:', error);
    }
  };

  const checkRatingEligibility = async () => {
    try {
      const shouldPrompt = await RatingsService.shouldPromptForRating(user.uid, course.id);
      if (shouldPrompt) {
        // Show rating prompt after a delay
        setTimeout(() => {
          setShowRatingModal(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking rating eligibility:', error);
    }
  };

  const handleRatingSubmit = async (rating, review) => {
    try {
      await RatingsService.submitCourseRating(user.uid, course.id, rating, review);
      
      // Reload rating data
      await loadRatingSummary();
      await loadUserRating();
      
      Alert.alert('Thank You!', 'Your rating has been submitted successfully.');
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const checkEnrollmentStatus = async () => {
    if (!user || !course?.id) return;
    
    try {
      const enrolled = await CoursesService.isUserEnrolledInCourse(user.uid, course.id);
      setIsEnrolled(enrolled);
      
      if (enrolled) {
        // Load progress if enrolled using new enrollment structure
        const progress = await CoursesService.getUserCourseProgress(user.uid, course.id);
        setCourseProgress(progress);
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to enroll in courses');
      return;
    }

    if (!course) return;

    try {
      await CoursesService.enrollInCourse(user.uid, course.id);
      setIsEnrolled(true);
      Alert.alert('Success', 'Successfully enrolled in the course!');
    } catch (error) {
      console.error('Error enrolling:', error);
      Alert.alert('Error', 'Failed to enroll in course');
    }
  };

  const handleLessonPress = async (lesson, index) => {
    // First lesson is always free to preview for all courses
    if (index === 0) {
      // Track lesson completion if user is enrolled
      if (user && isEnrolled && course?.id && lesson.id) {
        try {
          await CoursesService.updateLessonViewStatus(user.uid, course.id, lesson.id, true);
        } catch (error) {
          console.error('Error tracking lesson completion:', error);
        }
      }
      
      router.push(`/meditation/play/${lesson.id}?courseId=${course?.id}&lessonId=${lesson.id}`);
      return;
    }

    // For FREE courses: All lessons are accessible
    if (course?.isFree) {
      // Track lesson completion
      if (user && course?.id && lesson.id) {
        try {
          await CoursesService.updateLessonViewStatus(user.uid, course.id, lesson.id, true);
        } catch (error) {
          console.error('Error tracking lesson completion:', error);
        }
      }
      
      router.push(`/meditation/play/${lesson.id}?courseId=${course?.id}&lessonId=${lesson.id}`);
      return;
    }

    // For PREMIUM courses: Need enrollment for lessons beyond first
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to log in to access premium lessons',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => router.push('/auth')
          }
        ]
      );
      return;
    }

    // Check if user is enrolled in premium course
    if (isEnrolled) {
      // Track lesson completion
      if (course?.id && lesson.id) {
        try {
          await CoursesService.updateLessonViewStatus(user.uid, course.id, lesson.id, true);
        } catch (error) {
          console.error('Error tracking lesson completion:', error);
        }
      }
      
      router.push(`/meditation/play/${lesson.id}?courseId=${course?.id}&lessonId=${lesson.id}`);
    } else {
      Alert.alert(
        'Premium Lesson',
        'This lesson is part of a premium course. Enroll to unlock all lessons.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start Course', 
            onPress: handleEnroll
          }
        ]
      );
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      mindfulness: '#667eea',
      sleep: '#4c63d2',
      stress: '#f093fb',
      focus: '#4facfe',
      anxiety: '#a8edea',
      beginner: '#ffecd2',
      healing: '#87ceeb',
      advanced: '#667eea',
    };
    return colors[category] || '#667eea';
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getDefaultImage = () => {
    return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.text }]}>Course not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Course Details</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Course Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: course.imageUrl || getDefaultImage() }}
            style={styles.heroImage}
            defaultSource={{ uri: getDefaultImage() }}
          />
          <View style={styles.heroOverlay}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(course.category) }]}>
              <Text style={styles.categoryText}>
                {(course.category || 'mindfulness').toUpperCase()}
              </Text>
            </View>
            {course.isFree && (
              <View style={[styles.freeBadge, { backgroundColor: theme.plus }]}>
                <Text style={[styles.freeText, { color: theme.background }]}>FREE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Course Info */}
        <View style={styles.courseInfo}>
          <Text style={[styles.courseTitle, { color: theme.text }]}>{course.title}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {course.courseDays || 0} days • {formatDuration(course.averageDuration)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="book-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {course.totalLessons || courseLessons.length} lessons
              </Text>
            </View>
            {course.rating && (
              <View style={styles.metaRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  {course.rating.toFixed(1)} ({course.ratingsCount || 0} reviews)
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.courseDescription, { color: theme.textSecondary }]}>
            {course.description}
          </Text>

          {course.instructorName && (
            <View style={styles.instructorContainer}>
              <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.instructorText, { color: theme.text }]}>
                Instructor: {course.instructorName}
              </Text>
            </View>
          )}
        </View>

        {/* Enrollment Section */}
        <View style={styles.enrollmentSection}>
          {isEnrolled ? (
            <View style={styles.enrolledContainer}>
              <View style={styles.enrolledBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.enrolledText, { color: '#4CAF50' }]}>Enrolled</Text>
              </View>
                             {courseProgress && (
                 <View style={styles.progressContainer}>
                   <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                     Progress: {courseProgress.completedLessons || 0} of {courseProgress.totalLessons || courseLessons.length} lessons
                   </Text>
                   <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                     <View 
                       style={[
                         styles.progressFill, 
                         { 
                           backgroundColor: theme.tint,
                           width: `${courseProgress.progress || 0}%`
                         }
                       ]} 
                     />
                   </View>
                   {courseProgress.allLessonView && (
                     <Text style={[styles.courseCompletedText, { color: '#4CAF50' }]}>
                       🎉 Course Completed!
                     </Text>
                   )}
                 </View>
               )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.enrollButton, { backgroundColor: theme.tint }]}
              onPress={handleEnroll}
            >
              <Text style={styles.enrollButtonText}>
                {course.isFree ? 'Enroll for Free' : 'Enroll Now'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ratings Section */}
        {ratingSummary && (
          <View style={styles.ratingsSection}>
            <View style={styles.ratingsHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Ratings & Reviews</Text>
              {user && isEnrolled && !userRating && (
                <TouchableOpacity
                  style={[styles.rateButton, { backgroundColor: theme.tint }]}
                  onPress={() => setShowRatingModal(true)}
                >
                  <Ionicons name="star" size={16} color="white" />
                  <Text style={styles.rateButtonText}>Rate Course</Text>
                </TouchableOpacity>
              )}
            </View>
            <CourseRatingDisplay
              courseId={course.id}
              averageRating={ratingSummary.averageRating}
              totalRatings={ratingSummary.totalRatings}
              theme={theme}
              maxReviews={5}
            />
          </View>
        )}

        {/* Lessons Section */}
        <View style={styles.lessonsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Course Lessons</Text>
          {courseLessons.length === 0 ? (
            <View style={styles.noLessonsContainer}>
              <Text style={[styles.noLessonsText, { color: theme.textSecondary }]}>
                No lessons available yet
              </Text>
            </View>
          ) : (
            courseLessons.map((lesson, index) => {
              // Check if this lesson is completed based on lessonsSeen
              const isCompleted = courseProgress?.lessonsSeen?.find(
                seenLesson => seenLesson.contentId === lesson.id
              )?.contentView || false;

              // Determine if lesson should be locked based on freemium model
              let isLocked = false;
              
              if (index === 0) {
                // First lesson is always free (preview)
                isLocked = false;
              } else if (course?.isFree) {
                // Free courses: All lessons accessible
                isLocked = false;
              } else {
                // Premium courses: Lock lessons unless enrolled
                isLocked = !isEnrolled;
              }

              return (
                <LessonItem
                  key={lesson.id || index}
                  lesson={lesson}
                  index={index}
                  isLocked={isLocked}
                  isCompleted={isCompleted}
                  onPress={() => handleLessonPress(lesson, index)}
                  theme={theme}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <CourseRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
        courseTitle={course?.title}
        theme={theme}
        userRating={userRating?.rating || 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  freeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  freeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  courseInfo: {
    padding: 20,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  courseDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enrollmentSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  enrolledContainer: {
    alignItems: 'center',
    gap: 12,
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrolledText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  courseCompletedText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  enrollButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  ratingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  lessonsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  noLessonsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noLessonsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  lessonIcon: {
    marginRight: 12,
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lessonDuration: {
    fontSize: 14,
    marginBottom: 2,
  },
  lessonInstructor: {
    fontSize: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  lessonAction: {
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
}); 