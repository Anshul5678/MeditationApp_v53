import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingsService } from '../../services/ratingsService';

export const CourseRatingDisplay = ({ courseId, averageRating, totalRatings, theme, maxReviews = 5 }) => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadRatings();
  }, [courseId]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const recentRatings = await RatingsService.getRecentCourseRatings(courseId, maxReviews);
      setRatings(recentRatings);
    } catch (error) {
      console.error('Error loading ratings:', error);
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={size}
          color={i <= rating ? '#FFD700' : theme.border}
          style={i <= rating ? { color: '#FFD700' } : {}}
        />
      );
    }
    return stars;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const averageRatingToDisplay = averageRating || 0;
  const totalRatingsToDisplay = totalRatings || 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading ratings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Average Rating Summary */}
      {totalRatingsToDisplay > 0 ? (
        <View style={styles.ratingOverview}>
          <Text style={[styles.averageRating, { color: theme.text }]}>
            {averageRatingToDisplay > 0 ? averageRatingToDisplay.toFixed(1) : 'No ratings'}
          </Text>
          <View style={styles.starsContainer}>
            {renderStars(Math.round(averageRatingToDisplay), 20)}
          </View>
          <Text style={[styles.totalRatings, { color: theme.textSecondary }]}>
            {totalRatingsToDisplay > 0 ? `${totalRatingsToDisplay} ratings` : 'No ratings yet'}
          </Text>
        </View>
      ) : (
        <View style={styles.noRatingsContainer}>
          <Ionicons name="star-outline" size={24} color={theme.textSecondary} />
          <Text style={[styles.noRatingsText, { color: theme.textSecondary }]}>
            No ratings yet
          </Text>
          <Text style={[styles.noRatingsSubtext, { color: theme.textSecondary }]}>
            Be the first to rate this course
          </Text>
        </View>
      )}

      {/* Recent Reviews */}
      {ratings.length > 0 ? (
        <View style={styles.reviewsContainer}>
          <Text style={[styles.reviewsTitle, { color: theme.text }]}>
            Recent Reviews
          </Text>
          <ScrollView style={styles.reviewsList} showsVerticalScrollIndicator={false}>
            {ratings.slice(0, expanded ? ratings.length : 3).map((rating) => (
              <View key={rating.userId} style={[styles.reviewItem, { borderBottomColor: theme.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewerName, { color: theme.text }]}>
                    {rating.userName || 'Anonymous'}
                  </Text>
                  <Text style={[styles.reviewDate, { color: theme.textSecondary }]}>
                    {formatDate(rating.submittedAt)}
                  </Text>
                </View>
                <View style={styles.reviewStars}>
                  {renderStars(rating.rating)}
                </View>
                {rating.review && rating.review.trim() !== '' && (
                  <Text style={[styles.reviewText, { color: theme.textSecondary }]}>
                    {rating.review}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
          
          {ratings.length > 3 && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={[styles.expandButtonText, { color: theme.tint }]}>
                {expanded ? 'Show Less' : `Show ${ratings.length - 3} More Reviews`}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.tint}
              />
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalRatings: {
    fontSize: 14,
    fontWeight: '500',
  },
  noRatingsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noRatingsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  noRatingsSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  reviewsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewsList: {
    maxHeight: 300,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 