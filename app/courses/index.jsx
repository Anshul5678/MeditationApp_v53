import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../src/constants/Colors';
import { CoursesService } from '../../src/services/coursesService';
import { CourseCard } from '../../src/components/courses/CourseCard';

const CourseCategories = ({ selectedCategory, onCategorySelect, theme, availableCategories, categoryCounts }) => {
  // Define category metadata with icons and display names
  const categoryMetadata = {
    'mindfulness': { name: 'Mindfulness', icon: 'leaf' },
    'sleep': { name: 'Sleep', icon: 'moon' },
    'stress': { name: 'Stress Relief', icon: 'heart' },
    'focus': { name: 'Focus', icon: 'eye' },
    'anxiety': { name: 'Anxiety', icon: 'shield' },
    'beginner': { name: 'Beginner', icon: 'star' },
    'healing': { name: 'Healing', icon: 'medical' },
    'meditation': { name: 'Meditation', icon: 'leaf' },
    'breathing': { name: 'Breathing', icon: 'air' },
    'relaxation': { name: 'Relaxation', icon: 'cloud' },
    'wellness': { name: 'Wellness', icon: 'fitness' },
    'spiritual': { name: 'Spiritual', icon: 'sparkles' }
  };

  // Create categories array with available categories
  const categories = [
    { id: null, name: 'All', icon: 'apps' },
    ...availableCategories.map(cat => ({
      id: cat,
      name: categoryMetadata[cat]?.name || cat.charAt(0).toUpperCase() + cat.slice(1),
      icon: categoryMetadata[cat]?.icon || 'book',
      count: categoryCounts[cat] || 0
    }))
  ];

  return (
    <View style={styles.categoriesContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id || 'all'}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === category.id ? theme.tint : theme.card,
                borderColor: selectedCategory === category.id ? theme.tint : theme.border
              }
            ]}
            onPress={() => onCategorySelect(category.id)}
          >
            <Ionicons 
              name={category.icon} 
              size={16} 
              color={selectedCategory === category.id ? '#fff' : theme.text} 
            />
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === category.id ? '#fff' : theme.text }
            ]}>
              {category.name}
            </Text>
            {category.count > 0 && (
              <View style={[
                styles.categoryCount,
                { backgroundColor: selectedCategory === category.id ? '#fff' : theme.tint + '20' }
              ]}>
                <Text style={[
                  styles.categoryCountText,
                  { color: selectedCategory === category.id ? theme.tint : theme.tint }
                ]}>
                  {category.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default function CoursesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (availableCategories.length > 0) {
      fetchCategoryCounts();
    }
  }, [availableCategories]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      let fetchedCourses = [];
      
      if (selectedCategory) {
        console.log('Fetching courses for category:', selectedCategory);
        fetchedCourses = await CoursesService.getCoursesByCategory(selectedCategory);
        console.log(`Found ${fetchedCourses.length} courses for category '${selectedCategory}'`);
      } else {
        console.log('Fetching all courses');
        fetchedCourses = await CoursesService.getAllCourses();
        console.log(`Found ${fetchedCourses.length} total courses`);
      }
      
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const categories = await CoursesService.getAvailableCategories();
      setAvailableCategories(categories);
      console.log('Available categories:', categories);
    } catch (error) {
      console.error('Error fetching available categories:', error);
      setAvailableCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchCategoryCounts = async () => {
    try {
      const counts = {};
      for (const category of availableCategories) {
        counts[category] = await CoursesService.getCourseCountByCategory(category);
      }
      setCategoryCounts(counts);
      console.log('Category counts:', counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  const handleCoursePress = (course) => {
    router.push(`/courses/${course.id}`);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {selectedCategory 
            ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Courses`
            : 'All Courses'
          }
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Categories */}
      {categoriesLoading ? (
        <View style={styles.categoriesLoadingContainer}>
          <ActivityIndicator size="small" color={theme.tint} />
          <Text style={[styles.categoriesLoadingText, { color: theme.textSecondary }]}>
            Loading categories...
          </Text>
        </View>
      ) : (
        <CourseCategories 
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          theme={theme}
          availableCategories={availableCategories}
          categoryCounts={categoryCounts}
        />
      )}

      {/* Courses Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading courses...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {courses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={60} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No courses found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {selectedCategory 
                  ? `No courses available in "${selectedCategory}" category. Try selecting a different category or check back later.`
                  : 'No courses available at the moment. Please check back later.'
                }
              </Text>
              {selectedCategory && (
                <TouchableOpacity 
                  style={[styles.resetButton, { backgroundColor: theme.tint }]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={styles.resetButtonText}>Show All Courses</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.coursesContainer}>
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onPress={() => handleCoursePress(course)}
                  theme={theme}
                  fullWidth={true}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  headerRight: {
    width: 40,
    height: 40,
  },
  categoriesContainer: {
    paddingVertical: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  coursesContainer: {
    padding: 20,
    gap: 16,
  },
  resetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  categoriesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  categoriesLoadingText: {
    fontSize: 14,
  },
  categoryCount: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 