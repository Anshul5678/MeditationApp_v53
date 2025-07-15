# Firebase Setup Instructions

## Environment Variables

Create a `.env` file in your project root with the following variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Setup Steps

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Create a new project or use existing one

2. **Add Web App**
   - Click "Add app" and select Web (</> icon)
   - Register your app with a name

3. **Get Configuration**
   - Copy the config values from Firebase Console
   - Replace the placeholders in your `.env` file

4. **Install Firebase**
   ```bash
   npm install firebase
   ```

5. **Setup Firestore Database**
   - Enable Firestore in Firebase Console
   - Create these collections:
     - `MeditationContent` - for meditation tracks
     - `MeditationCourses` - for meditation courses  
     - `MeditationUsers` - for teachers/instructors and users
     - `MeditationEvents` - for meditation events
     - `MeditationQuotes` - for daily inspiration quotes

## Firebase Database Structure

### MeditationContent Collection
```javascript
{
  id: "content-1",
  title: "Morning Meditation",
  duration: 10, // in minutes
  instructorId: "user-1",
  imageUrl: "https://...",
  lessonImageUrl: "https://...",
  isFree: true,
  category: "meditation",
  featured: false,
  createdAt: "2024-01-01T00:00:00Z"
}
```

### MeditationCourses Collection
```javascript
{
  id: "course-1",
  title: "Mindfulness Mastery",
  instructorId: "user-1",
  imageUrl: "https://...",
  isFree: false,
  category: "mindfulness",
  courseDays: 7,
  rating: 4.8,
  averageRating: 4.8,
  points: 100,
  featured: true,
  enrollmentCount: 1250,
  createdAt: "2024-01-01T00:00:00Z"
}
```

### MeditationUsers Collection
```javascript
{
  id: "user-1",
  name: "Sarah Johnson",
  fullName: "Sarah Johnson",
  profileImageUrl: "https://...",
  avatar: "https://...",
  location: "California, USA",
  followers: 1200,
  bio: "Experienced meditation teacher...",
  specialties: ["meditation", "mindfulness", "stress-relief"],
  featured: true,
  rating: 4.9,
  reviewsCount: 150,
  isInstructor: true
}
```

### MeditationQuotes Collection
```javascript
{
  id: "quote-1",
  text: "The mind is everything. What you think you become.",
  author: "Buddha",
  category: "mindfulness",
  createdAt: "2024-01-01T00:00:00Z"
}
```

### MeditationEvents Collection
```javascript
{
  id: "event-1",
  title: "Mindfulness Workshop",
  description: "Learn the basics of mindfulness...",
  instructorId: "user-1",
  imageUrl: "https://...",
  startDate: "2024-01-15T10:00:00Z",
  endDate: "2024-01-15T12:00:00Z",
  location: "Online",
  maxParticipants: 50,
  registeredCount: 35,
  isFree: false,
  price: 25,
  createdAt: "2024-01-01T00:00:00Z"
}
```

## Usage

Once Firebase is set up, the meditation screen will automatically fetch data from your Firebase collections. The app now uses only dynamic data from Firebase - no mock data is included.

## Next Steps

- Set up authentication for user login
- Add proper user management
- Implement subscription/payment system
- Add more detailed progress tracking 