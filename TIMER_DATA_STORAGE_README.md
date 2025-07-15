# Timer Data Storage System - Meditation_App Compatible

This document describes the complete data storage system for meditation timer sessions, matching the Meditation_App structure exactly.

## Collection Structure

### Main Collection: `MeditationUsers/{userId}/MeditationTimer`

This is the primary collection where all meditation session data is stored.

#### Document Structure
```javascript
{
  selectedMinutes: string,        // "10" or "infinity"
  startedAt: Timestamp,           // Session start time
  stoppedAt: Timestamp,           // Session end time
  actualDuration: number,         // Actual duration in minutes
  status: "completed" | "incomplete",
  type: string,                   // Meditation type (e.g., "Meditation", "Mindfulness")
  createdAt: Timestamp            // Document creation time for sorting
}
```

#### Example Document
```javascript
{
  selectedMinutes: "15",
  startedAt: Timestamp.fromDate(new Date("2024-01-15T10:30:00Z")),
  stoppedAt: Timestamp.fromDate(new Date("2024-01-15T10:45:00Z")),
  actualDuration: 15,
  status: "completed",
  type: "Mindfulness",
  createdAt: Timestamp.fromDate(new Date("2024-01-15T10:45:00Z"))
}
```

## TimerService Methods

### 1. `saveMeditationSession(userId, data)`
Saves a meditation session to Firestore.

**Parameters:**
- `userId`: User's Firebase UID
- `data`: Session data object
  ```javascript
  {
    selectedMinutes: string | number,
    startTime: Date,
    endTime: Date,
    actualDuration: number,
    wasCompleted: boolean,
    type: string
  }
  ```

**Returns:** Document reference

**Usage:**
```javascript
await TimerService.saveMeditationSession(user.uid, {
  selectedMinutes: "15",
  startTime: new Date(),
  endTime: new Date(),
  actualDuration: 15,
  wasCompleted: true,
  type: "Meditation"
});
```

### 2. `getMeditationHistory(userId, limitCount = 50)`
Retrieves meditation session history for a user.

**Parameters:**
- `userId`: User's Firebase UID
- `limitCount`: Maximum number of sessions to retrieve (default: 50)

**Returns:** Array of session objects

**Usage:**
```javascript
const sessions = await TimerService.getMeditationHistory(user.uid, 20);
```

### 3. `getSessionsByType(userId, meditationType, limitCount = 20)`
Retrieves meditation sessions filtered by type.

**Parameters:**
- `userId`: User's Firebase UID
- `meditationType`: Type of meditation to filter by
- `limitCount`: Maximum number of sessions to retrieve (default: 20)

**Returns:** Array of session objects

**Usage:**
```javascript
const mindfulnessSessions = await TimerService.getSessionsByType(user.uid, "Mindfulness");
```

### 4. `getUserStats(userId)`
Calculates comprehensive user statistics.

**Parameters:**
- `userId`: User's Firebase UID

**Returns:** Statistics object
```javascript
{
  totalSessions: number,
  completedSessions: number,
  totalMinutes: number,
  averageSessionLength: number,
  favoriteType: string,
  typeBreakdown: object,
  currentStreak: number,
  longestStreak: number
}
```

**Usage:**
```javascript
const stats = await TimerService.getUserStats(user.uid);
console.log(`Total sessions: ${stats.totalSessions}`);
console.log(`Current streak: ${stats.currentStreak} days`);
```

### 5. `deleteSession(userId, sessionId)`
Deletes a specific meditation session.

**Parameters:**
- `userId`: User's Firebase UID
- `sessionId`: Document ID of the session to delete

**Returns:** Boolean indicating success

**Usage:**
```javascript
await TimerService.deleteSession(user.uid, "session-doc-id");
```

## Firestore Rules

The Firestore rules ensure proper security:

```javascript
// Meditation Users - users can only read/write their own data
match /MeditationUsers/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Meditation Timer subcollection - users can read/write their own sessions
  match /MeditationTimer/{sessionId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

## Firestore Indexes

Required indexes for optimal query performance:

```json
{
  "collectionGroup": "MeditationTimer",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    {
      "fieldPath": "type",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

## Integration with Timer Screen

The timer screen automatically saves sessions when completed:

```javascript
// In timer.jsx handleFinish function
await TimerService.saveMeditationSession(user.uid, {
  selectedMinutes: totalMinutes,
  startTime: sessionStartTime,
  endTime: endTime,
  actualDuration: actualDurationMinutes,
  wasCompleted,
  type: meditationType,
});
```

## Data Flow

1. **Session Start**: User starts timer
2. **Session Progress**: Timer tracks elapsed time
3. **Session End**: User finishes or discards session
4. **Data Save**: Session data saved to `MeditationUsers/{userId}/MeditationTimer`
5. **Statistics Update**: User stats calculated from saved sessions

## Infinity Mode Handling

For infinity sessions:
- `selectedMinutes`: "infinity"
- `actualDuration`: Calculated from elapsed time
- `wasCompleted`: Always true (user manually ends infinity sessions)

## Error Handling

The service includes comprehensive error handling:
- User authentication validation
- Data validation
- Firestore error catching
- Detailed error logging

## Performance Considerations

- Sessions are ordered by `createdAt` for efficient querying
- Indexes are created for common query patterns
- Pagination support with `limit()` queries
- Efficient statistics calculation

## Security Features

- Users can only access their own data
- Authentication required for all operations
- Data validation before saving
- Secure Firestore rules

## Future Enhancements

1. **Real-time Updates**: Listen to session changes
2. **Offline Support**: Cache sessions locally
3. **Data Export**: Export session history
4. **Advanced Analytics**: Detailed session insights
5. **Social Features**: Share achievements
6. **Backup/Restore**: Session data backup

## Testing

To test the data storage:

```javascript
// Test saving a session
const testSession = {
  selectedMinutes: "10",
  startTime: new Date(),
  endTime: new Date(Date.now() + 600000), // 10 minutes later
  actualDuration: 10,
  wasCompleted: true,
  type: "Test Meditation"
};

await TimerService.saveMeditationSession(user.uid, testSession);

// Test retrieving history
const history = await TimerService.getMeditationHistory(user.uid);
console.log('Session history:', history);

// Test getting stats
const stats = await TimerService.getUserStats(user.uid);
console.log('User stats:', stats);
```

This data storage system provides a robust, secure, and scalable foundation for meditation session tracking, matching the Meditation_App architecture exactly. 