/**
 * @typedef {Object} User
 * @property {string} uid - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} avatarUrl - User avatar URL
 * @property {string} bio - User bio
 * @property {string} location - User location
 * @property {Date} createdAt - User creation date
 * @property {number} meditationStreak - Current meditation streak
 * @property {number} totalSessions - Total meditation sessions
 * @property {number} totalMinutes - Total meditation minutes
 * @property {string[]} followingTeachers - Array of followed teacher IDs
 * @property {string[]} savedCourses - Array of saved course IDs
 */

/**
 * @typedef {Object} CheckIn
 * @property {string} id - Check-in ID
 * @property {string} userId - User ID
 * @property {string} date - Date in YYYY-MM-DD format
 * @property {*} checkedInAt - Firestore timestamp
 * @property {*} [checkedOutAt] - Firestore timestamp
 * @property {boolean} isComplete - Whether check-in is complete
 * @property {Object} [mood] - Mood data
 * @property {number} [mood.checkin] - Check-in mood (1-5)
 * @property {number} [mood.checkout] - Check-out mood (1-5)
 * @property {string} [notes] - Check-in notes
 * @property {string[]} [gratitude] - Gratitude entries
 * @property {string} monthYear - Month-year for querying
 */

/**
 * @typedef {Object} StreakData
 * @property {number} currentStreak - Current month's streak
 * @property {*} lastActivityDate - Last activity timestamp
 * @property {*} currentMonthStart - Current month start timestamp
 * @property {number} longestStreak - Longest streak ever
 * @property {number} totalCompleteDays - Total complete days
 * @property {Object} monthlyHistory - Monthly streak history
 */

/**
 * @typedef {Object} Course
 * @property {string} id - Course ID
 * @property {string} title - Course title
 * @property {string} description - Course description
 * @property {string} imageUrl - Course image URL
 * @property {string} category - Course category
 * @property {string} level - Course level
 * @property {boolean} isFree - Whether course is free
 * @property {string} instructorId - Instructor ID
 * @property {string} instructorName - Instructor name
 * @property {number} courseDays - Number of days
 * @property {number} totalLessons - Total lessons
 * @property {number} averageDuration - Average duration
 * @property {Date} createdAt - Creation date
 * @property {number} [rating] - Course rating
 * @property {number} [enrolledCount] - Enrolled count
 */

/**
 * @typedef {Object} Teacher
 * @property {string} id - Teacher ID
 * @property {string} name - Teacher name
 * @property {string} bio - Teacher bio
 * @property {string} avatarUrl - Teacher avatar URL
 * @property {string} location - Teacher location
 * @property {string[]} specialties - Teacher specialties
 * @property {number} rating - Teacher rating
 * @property {number} totalCourses - Total courses
 * @property {number} totalStudents - Total students
 * @property {string[]} followers - Follower IDs
 * @property {Date} createdAt - Creation date
 */

/**
 * @typedef {Object} Event
 * @property {string} id - Event ID
 * @property {string} title - Event title
 * @property {string} description - Event description
 * @property {string} hostId - Host teacher ID
 * @property {Date} startTime - Event start time
 * @property {number} duration - Duration in minutes
 * @property {string} coverImageUrl - Cover image URL
 * @property {string} type - Event type
 * @property {boolean} isLive - Whether event is live
 * @property {number} maxParticipants - Maximum participants
 * @property {number} currentParticipants - Current participants
 */

/**
 * @typedef {Object} MeditationContent
 * @property {string} id - Content ID
 * @property {string} title - Content title
 * @property {string} description - Content description
 * @property {number} duration - Duration in minutes
 * @property {string[]} tags - Content tags
 * @property {string} audioUrl - Audio file URL
 * @property {string} [videoUrl] - Video file URL
 * @property {string} instructorId - Instructor ID
 * @property {string} instructorName - Instructor name
 * @property {string} type - Content type
 * @property {Date} createdAt - Creation date
 */

/**
 * @typedef {Object} Quote
 * @property {string} id - Quote ID
 * @property {string} text - Quote text
 * @property {string} author - Quote author
 * @property {string} category - Quote category
 */

export {}; 