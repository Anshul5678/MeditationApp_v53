import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

const TeacherCard = ({ teacher, theme, onFollow, onPress, isFollowing, followLoading }) => (
  <TouchableOpacity 
    style={[styles.teacherCard, { backgroundColor: theme.card }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.teacherCardContent}>
      <View style={styles.teacherAvatarContainer}>
        {teacher.profileImageUrl || teacher.avatar ? (
          <Image source={{ uri: teacher.profileImageUrl || teacher.avatar }} style={styles.teacherAvatar} />
        ) : (
          <View style={[styles.teacherAvatar, { backgroundColor: theme.tint }]}> 
            <Text style={styles.teacherAvatarText}>
              {(teacher.fullName || teacher.name || '').split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.teacherInfo}>
        <Text style={[styles.teacherName, { color: theme.text }]}> {teacher.fullName || teacher.name} </Text>
        <Text style={[styles.teacherLocation, { color: theme.textSecondary }]}> {teacher.location || 'Unknown Location'} </Text>
        <Text style={[styles.teacherFollowers, { color: theme.textSecondary }]}> {(teacher.followers?.length || teacher.followers || 0)} followers </Text>
      </View>
    </View>
    <View style={styles.teacherActions}>
      <TouchableOpacity
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowing ? theme.cardSecondary : theme.tint,
            borderColor: theme.tint,
            borderWidth: 1,
          }
        ]}
        onPress={onFollow}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? theme.tint : '#fff'} />
        ) : (
          <Text style={[
            styles.followButtonText,
            { color: isFollowing ? theme.tint : '#fff' }
          ]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  teacherCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  teacherCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  teacherAvatarContainer: {
    marginRight: 16,
  },
  teacherAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  teacherLocation: {
    fontSize: 16,
    marginBottom: 8,
  },
  specializationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specializationTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  specializationText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  teacherFollowers: {
    fontSize: 14,
  },
  teacherActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  followButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TeacherCard; 