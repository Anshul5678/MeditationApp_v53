/**
 * Quotes Service for daily inspiration
 * Provides meditation and mindfulness quotes
 * Now includes Firebase integration with fallback to local quotes
 */

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';

export class QuotesService {
  static quotes = [
    {
      id: 1,
      text: "The mind is everything. What you think you become.",
      author: "Buddha",
      category: "Mindfulness"
    },
    {
      id: 2,
      text: "Peace comes from within. Do not seek it without.",
      author: "Buddha",
      category: "Inner Peace"
    },
    {
      id: 3,
      text: "Wherever you are, be there totally.",
      author: "Eckhart Tolle",
      category: "Presence"
    },
    {
      id: 4,
      text: "The present moment is the only time over which we have dominion.",
      author: "Thich Nhat Hanh",
      category: "Mindfulness"
    },
    {
      id: 5,
      text: "Meditation is not about stopping thoughts, but recognizing that we are more than our thoughts and our feelings.",
      author: "Arianna Huffington",
      category: "Meditation"
    },
    {
      id: 6,
      text: "The quieter you become, the more able you are to hear.",
      author: "Rumi",
      category: "Silence"
    },
    {
      id: 7,
      text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
      author: "Buddha",
      category: "Present Moment"
    },
    {
      id: 8,
      text: "The best way to take care of the future is to take care of the present moment.",
      author: "Thich Nhat Hanh",
      category: "Mindfulness"
    },
    {
      id: 9,
      text: "Meditation is a way for nourishing and blossoming the divine within you.",
      author: "Amit Ray",
      category: "Meditation"
    },
    {
      id: 10,
      text: "The mind is like water. When it's agitated, you can't see clearly. When it's calm, everything becomes clear.",
      author: "Prasad Mahes",
      category: "Clarity"
    },
    {
      id: 11,
      text: "Breathe in peace, breathe out stress.",
      author: "Anonymous",
      category: "Breathing"
    },
    {
      id: 12,
      text: "In the midst of movement and chaos, keep stillness inside of you.",
      author: "Deepak Chopra",
      category: "Stillness"
    },
    {
      id: 13,
      text: "The goal of meditation is not to control your thoughts, it's to stop letting them control you.",
      author: "Anonymous",
      category: "Meditation"
    },
    {
      id: 14,
      text: "When the mind is peaceful, it is like a still lake that reflects the beauty of the sky.",
      author: "Anonymous",
      category: "Peace"
    },
    {
      id: 15,
      text: "Let go of what was, accept what is, and have faith in what will be.",
      author: "Anonymous",
      category: "Acceptance"
    }
  ];

  /**
   * Get a random quote from Firebase or fallback to local collection
   * @returns {Promise<Object>} Random quote object
   */
  static async getRandomQuote() {
    try {
      // Try to fetch from Firebase first
      const quotesCollection = collection(db, 'MeditationQuotes');
      const quotesSnapshot = await getDocs(quotesCollection);
      const firebaseQuotes = quotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (firebaseQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * firebaseQuotes.length);
        return firebaseQuotes[randomIndex];
      } else {
        // Fallback to local quotes
        const randomIndex = Math.floor(Math.random() * this.quotes.length);
        return this.quotes[randomIndex];
      }
    } catch (error) {
      console.error('Error fetching quotes from Firebase, using local fallback:', error);
      // Fallback to local quotes
      return new Promise((resolve) => {
        setTimeout(() => {
          const randomIndex = Math.floor(Math.random() * this.quotes.length);
          resolve(this.quotes[randomIndex]);
        }, 500);
      });
    }
  }

  /**
   * Get quotes by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} Array of quotes in the category
   */
  static async getQuotesByCategory(category) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const filteredQuotes = this.quotes.filter(
          quote => quote.category.toLowerCase() === category.toLowerCase()
        );
        resolve(filteredQuotes);
      }, 300);
    });
  }

  /**
   * Get all available categories
   * @returns {Array} Array of unique categories
   */
  static getCategories() {
    const categories = [...new Set(this.quotes.map(quote => quote.category))];
    return categories.sort();
  }

  /**
   * Get quote by ID
   * @param {number} id - Quote ID
   * @returns {Promise<Object|null>} Quote object or null if not found
   */
  static async getQuoteById(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const quote = this.quotes.find(q => q.id === id);
        resolve(quote || null);
      }, 200);
    });
  }

  /**
   * Get all quotes from Firebase or fallback to local collection
   * @returns {Promise<Array>} Array of all quotes
   */
  static async getAllQuotes() {
    try {
      const quotesCollection = collection(db, 'MeditationQuotes');
      const quotesSnapshot = await getDocs(quotesCollection);
      const firebaseQuotes = quotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return firebaseQuotes.length > 0 ? firebaseQuotes : this.quotes;
    } catch (error) {
      console.error('Error fetching quotes from Firebase, using local fallback:', error);
      return this.quotes;
    }
  }

  /**
   * Get daily quote based on current date
   * @returns {Promise<Object>} Daily quote object
   */
  static async getDailyQuote() {
    try {
      // Use a deterministic approach based on the current date
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      
      const allQuotes = await this.getAllQuotes();
      const dailyQuoteIndex = dayOfYear % allQuotes.length;
      
      return allQuotes[dailyQuoteIndex];
    } catch (error) {
      console.error('Error fetching daily quote:', error);
      return this.getRandomQuote();
    }
  }
} 