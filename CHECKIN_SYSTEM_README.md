# Check-in System Documentation

## Overview

The new check-in system provides a comprehensive daily meditation tracking feature with streak management, mood tracking, and session history. It's designed to help users build consistent meditation habits and track their progress over time.

## Features

### 🎯 Core Functionality
- **Daily Check-in/Check-out**: Users can check in to start their daily session and check out when finished
- **Session Timer**: Real-time tracking of session duration with animated display
- **Mood Tracking**: Post-session mood assessment with reflection notes
- **Streak Management**: Automatic streak calculation and motivation system
- **Session History**: Complete history of all meditation sessions
- **Firebase Integration**: Cloud storage with offline fallback

### 🔥 Streak System
- **Current Streak**: Tracks consecutive days of completed sessions
- **Longest Streak**: Records the user's best streak achievement
- **Monthly Reset**: Automatically resets streaks at the beginning of each month
- **Monthly History**: Stores streak data for each month
- **Motivational Messages**: Encouraging messages based on streak length

### 📊 Data Storage
- **Firestore Structure**: Organized under `MeditationUsers/{userId}/checkIns`
- **Streak Data**: Stored in `MeditationUsers/{userId}/streakData/current`
- **Offline Support**: AsyncStorage backup for offline functionality
- **Real-time Sync**: Automatic synchronization with Firebase

## File Structure

```
app/(tabs)/
├── new-checkin.jsx          # Main check-in screen
└── _layout.jsx              # Updated tab navigation

src/services/
├── streakService.js         # Streak calculation and management
└── firebase.js              # Firebase configuration

Firebase Collections:
├── MeditationUsers/
│   └── {userId}/
│       ├── checkIns/        # Session data
│       └── streakData/      # Streak information
```

## Implementation Details

### Check-in Screen Components

#### 1. CheckInButton
- **Animated Button**: Pulsing animation when checked in
- **State Management**: Toggles between "Check In" and "Check Out"
- **Visual Feedback**: Color changes based on state (blue → green)

#### 2. SessionInfo
- **Real-time Timer**: Updates every second showing elapsed time
- **Session Details**: Displays start time and meditation type
- **Format**: MM:SS format for elapsed time

#### 3. HistoryList
- **Session History**: FlatList of all completed sessions
- **Duration Calculation**: Shows session length for each entry
- **Mood Display**: Emoji representation of post-session mood
- **Streak Section**: Current streak with motivational messages

#### 4. MoodModal
- **Mood Selection**: 5 emoji options (😊😌😐😔😢)
- **Reflection Input**: Optional text input for session notes
- **Modal Interface**: Clean, centered modal design

### Streak Service

#### Key Methods:
- `getStreakData(userId)`: Retrieves or creates user streak data
- `calculateCurrentStreak(userId)`: Calculates current consecutive days
- `updateStreakAfterComplete(userId)`: Updates streak after session completion
- `checkAndHandleMonthlyReset(userId)`: Handles monthly streak resets
- `getStreakStats(userId)`: Returns comprehensive streak statistics

#### Streak Logic:
1. **Daily Check**: Verifies if user completed check-in/check-out for the day
2. **Consecutive Counting**: Counts backward from today to find consecutive days
3. **Monthly Reset**: Resets streak at the beginning of each month
4. **History Preservation**: Saves monthly streak data to history

### Firebase Data Structure

#### Check-in Document:
```javascript
{
  userId: string,
  date: "YYYY-MM-DD",
  checkedInAt: Timestamp,
  checkedOutAt: Timestamp | null,
  mood: {
    checkin: number,    // 1-5 scale
    checkout: number    // 1-5 scale
  },
  notes: string,
  isComplete: boolean,
  monthYear: "YYYY-MM"
}
```

#### Streak Document:
```javascript
{
  currentStreak: number,
  lastActivityDate: string | null,
  currentMonthStart: Timestamp,
  longestStreak: number,
  totalCompleteDays: number,
  monthlyHistory: {
    "YYYY-MM": {
      streak: number,
      month: string,
      completeDays: number,
      year: number,
      monthNumber: number
    }
  }
}
```

## Usage Instructions

### For Users:
1. **Start Session**: Tap the "Check In" button to begin daily session
2. **Track Progress**: View real-time session timer and information
3. **End Session**: Tap "Check Out" when session is complete
4. **Mood Assessment**: Select mood and add optional reflection
5. **View History**: Scroll through past sessions and streak information

### For Developers:
1. **Navigation**: Access via tab navigation (Check In tab)
2. **Authentication**: Requires user authentication via AuthContext
3. **Firebase Setup**: Ensure Firebase configuration is properly set up
4. **Permissions**: Verify Firestore rules allow read/write access

## Technical Features

### Error Handling
- **Network Failures**: Graceful fallback to AsyncStorage
- **Firebase Errors**: Comprehensive error logging and recovery
- **User Feedback**: Alert dialogs for important notifications

### Performance Optimizations
- **Efficient Queries**: Optimized Firestore queries with proper indexing
- **Lazy Loading**: History loaded on demand
- **Caching**: AsyncStorage backup for offline functionality

### Accessibility
- **Screen Reader Support**: Proper accessibility labels and roles
- **Touch Targets**: Adequate button sizes for mobile interaction
- **Color Contrast**: High contrast design for visibility

## Configuration

### Required Dependencies:
```json
{
  "@react-native-async-storage/async-storage": "2.1.2",
  "firebase": "^11.10.0",
  "expo-router": "~5.1.3"
}
```

### Firebase Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /MeditationUsers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /checkIns/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /streakData/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Firestore Indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "checkIns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "isComplete", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "checkIns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "monthYear", "order": "ASCENDING" },
        { "fieldPath": "isComplete", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues:
1. **Streak Not Updating**: Check Firebase permissions and network connection
2. **History Not Loading**: Verify Firestore indexes are created
3. **Check-in Fails**: Ensure user is authenticated and Firebase is configured
4. **Timer Issues**: Check for JavaScript timing accuracy on device

### Debug Information:
- Console logs provide detailed information about operations
- Firebase console shows real-time data updates
- AsyncStorage can be inspected for local data

## Future Enhancements

### Planned Features:
- **Weekly/Monthly Reports**: Detailed analytics and insights
- **Goal Setting**: Customizable meditation goals and targets
- **Social Features**: Share streaks and achievements
- **Advanced Analytics**: Detailed progress tracking and trends
- **Reminders**: Push notifications for daily check-ins
- **Export Data**: Ability to export session history

### Technical Improvements:
- **Real-time Updates**: Live synchronization across devices
- **Offline Mode**: Enhanced offline functionality
- **Performance**: Further optimization for large datasets
- **Testing**: Comprehensive unit and integration tests

## Support

For technical support or feature requests:
1. Check the console logs for error information
2. Verify Firebase configuration and permissions
3. Ensure all dependencies are properly installed
4. Test with a fresh user account to isolate issues

---

This check-in system provides a robust foundation for meditation tracking with room for future enhancements and customization. 