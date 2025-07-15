import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, useColorScheme, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../src/constants/Colors';
import { QuotesService } from '../../src/services/quotesService';

const CategoryItem = ({ icon, label, count, onPress, theme }) => (
  <TouchableOpacity style={styles.categoryItem} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
      {icon}
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: theme.plus }]}>
          <Text style={[styles.countText, { color: theme.text }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
    <Text style={[styles.categoryLabel, { color: theme.text }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [dailyQuote, setDailyQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const handleProfileOpen = () => {
    console.log('Profile opened');
    // router.push('/profile');
  };

  // Fetch random quote on component mount
  useEffect(() => {
    const fetchDailyQuote = async () => {
      setQuoteLoading(true);
      try {
        const quote = await QuotesService.getRandomQuote();
        setDailyQuote(quote);
      } catch (error) {
        console.error('Error fetching daily quote:', error);
        setDailyQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchDailyQuote();
  }, []);

  const categories = [
    {
      icon: <Ionicons name="headset-outline" size={28} color={theme.icon} />,
      label: "Meditate",
      onPress: () => router.push('/meditation')
    },
    {
      icon: <Ionicons name="moon-outline" size={28} color={theme.icon} />,
      label: "Events",
      onPress: () => router.push('/events')
    },
    {
      icon: <Ionicons name="school-outline" size={28} color={theme.icon} />,
      label: "Courses",
      count: 9,
      onPress: () => router.push('/courses')
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={handleProfileOpen}>
          <Feather name="menu" size={22} color={theme.icon} />
        </TouchableOpacity>
        <View style={styles.menuButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <CategoryItem
              key={index}
              icon={category.icon}
              label={category.label}
              count={category.count}
              onPress={category.onPress}
              theme={theme}
            />
          ))}
        </View>

        {/* Daily Quote Section */}
        <View style={styles.quoteSection}>
          <View style={styles.quoteSectionHeader}>
            <View style={styles.quoteHeaderIcon}>
              <Feather name="heart" size={20} color="#FF6B6B" />
            </View>
            <Text style={[styles.quoteSectionTitle, { color: theme.text }]}>
              Daily Inspiration
            </Text>
          </View>
          
          {quoteLoading ? (
            <View style={[styles.quoteCard, { backgroundColor: theme.card }]}>
              <View style={styles.quoteLoadingContainer}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={[styles.quoteLoadingText, { color: theme.textSecondary }]}>
                  Finding your inspiration...
                </Text>
              </View>
            </View>
          ) : dailyQuote ? (
            <View style={[styles.quoteCard, { backgroundColor: theme.card }]}>
              {/* Decorative top border */}
              <View style={[styles.quoteTopBorder, { backgroundColor: theme.tint }]} />
              
              {/* Quote icon */}
              <View style={[styles.quoteIconWrapper, { backgroundColor: theme.tint + '15' }]}>
                <Text style={[styles.quoteIconText, { color: theme.tint }]}>
                  "
                </Text>
              </View>
              
              {/* Quote content */}
              <View style={styles.quoteContent}>
                <Text style={[styles.quoteText, { color: theme.text }]}>
                  {dailyQuote.text}
                </Text>
                
                <View style={styles.quoteAuthorSection}>
                  <View style={[styles.quoteAuthorLine, { backgroundColor: theme.textSecondary }]} />
                  <Text style={[styles.quoteAuthor, { color: theme.textSecondary }]}>
                    {dailyQuote.author}
                  </Text>
                </View>
                
                {/* Category section */}
                {dailyQuote.category && (
                  <View style={styles.quoteCategoryContainer}>
                    <View style={[styles.quoteCategoryTag, { backgroundColor: theme.tint + '20' }]}>
                      <Feather name="tag" size={12} color={theme.tint} />
                      <Text style={[styles.quoteCategoryText, { color: theme.tint }]}>
                        {dailyQuote.category}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={[styles.quoteCard, { backgroundColor: theme.card }]}>
              <View style={styles.quoteErrorContainer}>
                <Feather name="cloud-off" size={40} color={theme.textSecondary} />
                <Text style={[styles.quoteErrorText, { color: theme.textSecondary }]}>
                  No quotes available at the moment
                </Text>
                <Text style={[styles.quoteErrorSubtext, { color: theme.textSecondary }]}>
                  Check your connection and try again
                </Text>
              </View>
            </View>
          )}
    </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  categoryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quoteSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 24,
  },
  quoteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quoteSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  quoteCard: {
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  quoteTopBorder: {
    height: 4,
    width: '100%',
  },
  quoteIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  quoteIconText: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  quoteContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  quoteText: {
    fontSize: 20,
    fontStyle: 'italic',
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'serif',
  },
  quoteAuthorSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  quoteAuthorLine: {
    width: 40,
    height: 2,
    marginBottom: 12,
    opacity: 0.3,
  },
  quoteAuthor: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  quoteCategoryContainer: {
    alignItems: 'center',
  },
  quoteCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quoteCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  quoteLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  quoteLoadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  quoteErrorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  quoteErrorText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  quoteErrorSubtext: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
  },
});

export default HomeScreen; 