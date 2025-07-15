import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../src/services/firebase';
import { useAuth } from '../../../src/context/AuthContext';
import { CoursesService } from '../../../src/services/coursesService';
import { TracksService } from '../../../src/services/tracksService';
import Colors from '../../../src/constants/Colors';

export default function PlayScreen() {
  const router = useRouter();
  const { id, courseId, lessonId } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // Audio player setup
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  
  // Debug audio player status
  useEffect(() => {
    console.log('Audio player status changed:', status);
  }, [status]);

  // Track lesson completion when audio finishes
  useEffect(() => {
    if (status.didJustFinish && user && courseId && lessonId && isEnrolled) {
      console.log('Audio finished, marking lesson as completed');
      CoursesService.updateLessonViewStatus(user.uid, courseId, lessonId, true)
        .then(() => {
          console.log('Lesson marked as completed');
        })
        .catch(error => {
          console.error('Error marking lesson as completed:', error);
        });
    }
  }, [status.didJustFinish, user, courseId, lessonId, isEnrolled]);

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('No lesson ID provided');
        return;
      }

      // Fetch lesson from MeditationContent collection
      const lessonDoc = doc(db, 'MeditationContent', id);
      const lessonSnapshot = await getDoc(lessonDoc);

      if (!lessonSnapshot.exists()) {
        setError('Lesson not found');
        return;
      }

      const lessonData = {
        id: lessonSnapshot.id,
        ...lessonSnapshot.data()
      };

      // Fetch instructor information if available
      if (lessonData.instructorId) {
        try {
          const instructorInfo = await CoursesService.getInstructorInfo(lessonData.instructorId);
          lessonData.instructorName = instructorInfo?.fullName || instructorInfo?.name || 'Unknown Instructor';
        } catch (error) {
          console.error('Error fetching instructor info for lesson:', id, error);
          lessonData.instructorName = 'Unknown Instructor';
        }
      } else {
        lessonData.instructorName = 'Unknown Instructor';
      }

      setLesson(lessonData);

      // Check if user can access this content using the same logic as TracksService
      const canAccess = await TracksService.canAccessTrack(lessonData.id, user?.uid);
      setIsEnrolled(canAccess);

      // Load audio if lesson has audio URL and user can access
      if (lessonData.audioUrl && canAccess) {
        try {
          console.log('Loading audio URL:', lessonData.audioUrl);
          await player.replace({ uri: lessonData.audioUrl });
          console.log('Audio loaded successfully');
        } catch (audioError) {
          console.error('Error loading audio:', audioError);
          setError('Failed to load audio: ' + audioError.message);
        }
      } else {
        console.log('No audio URL or not enrolled. Audio URL:', lessonData.audioUrl, 'Can Access:', canAccess, 'Free:', lessonData.isFree);
      }

    } catch (error) {
      console.error('Error loading lesson:', error);
      setError('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const loadAudio = async () => {
    if (!lesson?.audioUrl) {
      console.log('No audio URL available');
      return false;
    }

    try {
      console.log('Loading audio URL:', lesson.audioUrl);
      await player.replace({ uri: lesson.audioUrl });
      console.log('Audio loaded successfully');
      return true;
    } catch (audioError) {
      console.error('Error loading audio:', audioError);
      setError('Failed to load audio: ' + audioError.message);
      return false;
    }
  };

  const handlePlayPause = async () => {
    if (!lesson?.audioUrl) {
      Alert.alert('Error', 'No audio available for this lesson');
      return;
    }

    if (!isEnrolled) {
      Alert.alert(
        'Access Required',
        'You need to be enrolled in the course or have proper access to play this lesson.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go Back', onPress: () => router.back() }
        ]
      );
      return;
    }

    try {
      console.log('Current status:', status);
      console.log('Lesson audio URL:', lesson.audioUrl);
      console.log('Attempting to play/pause audio');
      
      // If audio is not loaded, load it first
      if (!status.isLoaded && !status.isBuffering) {
        console.log('Audio not loaded, loading now...');
        try {
          await player.replace({ uri: lesson.audioUrl });
          console.log('Audio loaded successfully');
        } catch (loadError) {
          console.error('Error loading audio:', loadError);
          Alert.alert('Error', 'Failed to load audio: ' + loadError.message);
          return;
        }
      }
      
      if (status.playing) {
        console.log('Pausing audio...');
        await player.pause();
        console.log('Audio paused');
      } else {
        console.log('Playing audio...');
        await player.play();
        console.log('Audio started playing');
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      Alert.alert('Error', 'Failed to control audio playback: ' + error.message);
    }
  };

  const handleSeek = async (position) => {
    if (!status.duration) return;
    
    try {
      setIsSeeking(true);
      const seekTime = (position / 100) * status.duration;
      await player.seekTo(seekTime);
      console.log('Seeked to:', seekTime, 'seconds');
    } catch (error) {
      console.error('Error seeking:', error);
    } finally {
      setIsSeeking(false);
    }
  };

  const handleSkipForward = async () => {
    if (!status.duration || !status.currentTime) return;
    
    try {
      const newTime = Math.min(status.currentTime + 30, status.duration);
      await player.seekTo(newTime);
      console.log('Skipped forward to:', newTime, 'seconds');
    } catch (error) {
      console.error('Error skipping forward:', error);
    }
  };

  const handleSkipBackward = async () => {
    if (!status.duration || !status.currentTime) return;
    
    try {
      const newTime = Math.max(status.currentTime - 30, 0);
      await player.seekTo(newTime);
      console.log('Skipped backward to:', newTime, 'seconds');
    } catch (error) {
      console.error('Error skipping backward:', error);
    }
  };

  const handlePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    
    setPlaybackSpeed(newSpeed);
    player.setRate(newSpeed);
    console.log('Playback speed changed to:', newSpeed);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlaybackProgress = () => {
    if (!status.duration || !status.currentTime) return 0;
    return (status.currentTime / status.duration) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Lesson</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.tint }]}
            onPress={loadLesson}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Lesson</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>Lesson not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Now Playing</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lesson Cover - Full Width */}
        <View style={styles.coverContainer}>
          {lesson.lessonImageUrl ? (
            <Image 
              source={{ uri: lesson.lessonImageUrl }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: theme.tint + '20' }]}>
              <Ionicons name="musical-notes" size={80} color={theme.tint} />
            </View>
          )}
        </View>

        {/* Lesson Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.lessonTitle, { color: theme.text }]}>{lesson.title}</Text>
          
          {lesson.instructorName && (
            <Text style={[styles.instructorName, { color: theme.tint }]}>
              by {lesson.instructorName}
            </Text>
          )}
          
          <Text style={[styles.lessonDescription, { color: theme.textSecondary }]}>
            {lesson.description || 'A guided meditation session'}
          </Text>
          
          {lesson.duration && (
            <Text style={[styles.duration, { color: theme.textSecondary }]}>
              {Math.ceil(lesson.duration / 60)} min meditation
            </Text>
          )}
        </View>

        {/* Audio Controls */}
        <View style={styles.controlsContainer}>
          {/* Debug Info */}
          <View style={[styles.debugContainer, { backgroundColor: theme.cardSecondary }]}>
            <Text style={[styles.debugText, { color: theme.textSecondary }]}>
              Status: {status.isLoaded ? 'Loaded' : 'Not Loaded'} | 
              Playing: {status.playing ? 'Yes' : 'No'} | 
              Buffering: {status.isBuffering ? 'Yes' : 'No'}
            </Text>
            <Text style={[styles.debugText, { color: theme.textSecondary }]}>
              Audio URL: {lesson.audioUrl ? 'Available' : 'Not Available'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {formatTime(status.currentTime)}
            </Text>
            
            <TouchableOpacity 
              style={styles.progressBarContainer}
              onPress={(event) => {
                const { locationX } = event.nativeEvent;
                // Estimate width based on container - this is a simplified approach
                const estimatedWidth = 300; // Approximate width of progress bar
                const percentage = Math.max(0, Math.min(100, (locationX / estimatedWidth) * 100));
                handleSeek(percentage);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: isSeeking ? theme.tint + '80' : theme.tint,
                      width: `${getPlaybackProgress()}%`
                    }
                  ]} 
                />
                {isSeeking && (
                  <View style={[styles.seekingIndicator, { backgroundColor: theme.tint }]} />
                )}
              </View>
            </TouchableOpacity>
            
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {formatTime(status.duration)}
            </Text>
          </View>

          {/* Seeking Status */}
          {isSeeking && (
            <View style={styles.seekingStatus}>
              <ActivityIndicator size="small" color={theme.tint} />
              <Text style={[styles.seekingText, { color: theme.textSecondary }]}>
                Seeking...
              </Text>
            </View>
          )}

          {/* Control Buttons */}
          <View style={styles.controlButtons}>
            <TouchableOpacity style={styles.controlButton} onPress={handleSkipBackward}>
              <Ionicons name="play-skip-back" size={32} color={theme.tabIconDefault} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.playButton, { backgroundColor: theme.tint }]}
              onPress={handlePlayPause}
              disabled={status.isBuffering}
            >
              {status.isBuffering ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={status.playing ? "pause" : "play"} 
                  size={32} 
                  color="white" 
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleSkipForward}>
              <Ionicons name="play-skip-forward" size={32} color={theme.tabIconDefault} />
            </TouchableOpacity>
          </View>

          {/* Additional Controls */}
          <View style={styles.additionalControls}>
            <TouchableOpacity style={styles.additionalButton} onPress={handlePlaybackSpeed}>
              <MaterialIcons name="speed" size={24} color={theme.tabIconDefault} />
              <Text style={[styles.additionalButtonText, { color: theme.tabIconDefault }]}>
                {playbackSpeed}x
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.additionalButton}>
              <Ionicons name="timer-outline" size={24} color={theme.tabIconDefault} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.additionalButton}>
              <Ionicons name="bookmark-outline" size={24} color={theme.tabIconDefault} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Access Info */}
        {!isEnrolled && !lesson.isFree && (
          <View style={[styles.accessInfo, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
            <Ionicons name="lock-closed-outline" size={24} color={theme.warning} />
            <Text style={[styles.accessInfoText, { color: theme.warning }]}>
              Enroll in the course to access this lesson
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  coverContainer: {
    marginVertical: 16,
  },
  coverImage: {
    width: '100%',
    height: 300,
    borderRadius: 0,
  },
  coverPlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    marginBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  lessonDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  duration: {
    fontSize: 14,
    marginTop: 4,
  },
  controlsContainer: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  timeText: {
    fontSize: 14,
    minWidth: 40,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  seekingIndicator: {
    position: 'absolute',
    right: 0,
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  seekingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  seekingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  controlButton: {
    padding: 16,
    marginHorizontal: 24,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  additionalButton: {
    alignItems: 'center',
    padding: 12,
  },
  additionalButtonText: {
    fontSize: 12,
    marginTop: 4,
  },
  accessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 24,
  },
  accessInfoText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  debugContainer: {
    padding: 8,
    marginBottom: 16,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
  },
}); 