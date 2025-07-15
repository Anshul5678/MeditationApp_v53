import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SaveButton from '../ui/SaveButton';

const { width } = Dimensions.get('window');

export const CourseCard = ({ course, onPress, theme, fullWidth = false, compact = false }) => {
  const cardWidth = fullWidth ? width - 40 : (compact ? 200 : width * 0.8);
  const cardHeight = compact ? 120 : 180;

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

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: cardWidth },
        fullWidth && styles.fullWidthContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.card, { height: cardHeight, backgroundColor: theme.card }]}>
        {/* Course Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: course.imageUrl || getDefaultImage() }}
            style={styles.image}
            defaultSource={{ uri: getDefaultImage() }}
          />
          {/* Gradient Overlay */}
          <View style={styles.gradientOverlay} />
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(course.category) }]}>
            <Text style={styles.categoryText}>
              {(course.category || 'mindfulness').toUpperCase()}
            </Text>
          </View>
          {/* Free Badge */}
          {course.isFree && (
            <View style={[styles.freeBadge, { backgroundColor: theme.plus }]}>
              <Text style={[styles.freeText, { color: theme.background }]}>FREE</Text>
            </View>
          )}
          {/* Course Info Overlay */}
          <View style={styles.overlay}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {course.title}
            </Text>
            <View style={styles.metaInfo}>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color="white" />
                <Text style={styles.metaText}>
                  {course.courseDays || 0} days • {formatDuration(course.averageDuration)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="book-outline" size={12} color="white" />
                <Text style={styles.metaText}>
                  {course.totalLessons || course.modules?.length || 0} lessons
                </Text>
              </View>
              {course.averageRating && course.totalRatings && (
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.metaText}>
                    {course.averageRating.toFixed(1)} ({course.totalRatings})
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
      {/* Save Button at the bottom right, below the image */}
      <View style={styles.saveButtonRow}>
        <View style={{ flex: 1 }} />
        <SaveButton
          itemId={course.id}
          type="course"
          size={24}
          colorSaved={theme.tint}
          colorUnsaved={theme.text}
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 4,
            elevation: 2,
            alignSelf: 'flex-end',
            marginRight: 16,
            marginTop: -20,
            marginBottom: 4,
          }}
        />
      </View>
      {/* Course Details Below */}
      <View style={styles.details}>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
          {course.description}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.levelContainer}>
            <Text style={[styles.levelText, { color: theme.tint }]}>
              {(course.levels || 'beginner').toUpperCase()}
            </Text>
          </View>
          {course.enrolledCount && (
            <Text style={[styles.enrolledText, { color: theme.textSecondary }]}>
              {course.enrolledCount.toLocaleString()} enrolled
            </Text>
          )}
        </View>

        {course.instructorName && (
          <View style={styles.instructorContainer}>
            <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.instructorText, { color: theme.textSecondary }]}>
              by {course.instructorName}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 16,
    marginBottom: 16,
  },
  fullWidthContainer: {
    marginRight: 0,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  freeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  courseTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  details: {
    padding: 16,
    gap: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 200, 255, 0.1)',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  enrolledText: {
    fontSize: 12,
    fontWeight: '500',
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -12,
    marginBottom: 0,
  },
}); 