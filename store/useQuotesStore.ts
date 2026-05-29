import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './useAuthStore';

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  category: string;
}

export const INITIAL_QUOTES: QuoteItem[] = [
  // Motivation (1-20)
  { id: '1', text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "Motivation" },
  { id: '2', text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "Motivation" },
  { id: '3', text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "Motivation" },
  { id: '4', text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "Motivation" },
  { id: '5', text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "Motivation" },
  { id: '6', text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs", category: "Motivation" },
  { id: '7', text: "You can never cross the ocean until you have the courage to lose sight of the shore.", author: "Christopher Columbus", category: "Motivation" },
  { id: '8', text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford", category: "Motivation" },
  { id: '9', text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "Motivation" },
  { id: '10', text: "Don't let yesterday take up too much of today.", author: "Will Rogers", category: "Motivation" },
  { id: '11', text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", category: "Motivation" },
  { id: '12', text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas A. Edison", category: "Motivation" },
  { id: '13', text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", category: "Motivation" },
  { id: '14', text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar", category: "Motivation" },
  { id: '15', text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt", category: "Motivation" },
  { id: '16', text: "If you can dream it, you can do it.", author: "Walt Disney", category: "Motivation" },
  { id: '17', text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", category: "Motivation" },
  { id: '18', text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "Motivation" },
  { id: '19', text: "When everything seems to be going against you, remember that the airplane takes off against the wind, not with it.", author: "Henry Ford", category: "Motivation" },
  { id: '20', text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis", category: "Motivation" },

  // Discipline (21-40)
  { id: '21', text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln", category: "Discipline" },
  { id: '22', text: "We must all suffer from one of two pains: the pain of discipline or the pain of regret.", author: "Jim Rohn", category: "Discipline" },
  { id: '23', text: "Self-discipline is the magic power that makes you virtually unstoppable.", author: "Dan Kennedy", category: "Discipline" },
  { id: '24', text: "Rule your mind or it will rule you.", author: "Horace", category: "Discipline" },
  { id: '25', text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", category: "Discipline" },
  { id: '26', text: "Without discipline, there is no true freedom.", author: "M. Scott Peck", category: "Discipline" },
  { id: '27', text: "Mental toughness is many things and rather difficult to explain. Its qualities are sacrifice and self-denial.", author: "Vince Lombardi", category: "Discipline" },
  { id: '28', text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn", category: "Discipline" },
  { id: '29', text: "He who cannot obey himself will be commanded.", author: "Friedrich Nietzsche", category: "Discipline" },
  { id: '30', text: "First we make our habits, then our habits make us.", author: "Charles C. Noble", category: "Discipline" },
  { id: '31', text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Rohn", category: "Discipline" },
  { id: '32', text: "By constant self-discipline and self-control you can develop greatness of character.", author: "Grenville Kleiser", category: "Discipline" },
  { id: '33', text: "Great leaders always have self-discipline without exception.", author: "John C. Maxwell", category: "Discipline" },
  { id: '34', text: "Do not wait for the mood. Do it regardless.", author: "Marcus Aurelius", category: "Discipline" },
  { id: '35', text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", category: "Discipline" },
  { id: '36', text: "You will never have a greater or lesser dominion than that over yourself.", author: "Leonardo da Vinci", category: "Discipline" },
  { id: '37', text: "True freedom is impossible without a mind made free by discipline.", author: "Mortimer J. Adler", category: "Discipline" },
  { id: '38', text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma", category: "Discipline" },
  { id: '39', text: "Mastering others is strength. Mastering yourself is true power.", author: "Lao Tzu", category: "Discipline" },
  { id: '40', text: "The foundation of a strong character is steadfast self-control.", author: "Seneca", category: "Discipline" },

  // Success (41-60)
  { id: '41', text: "Success is not final; failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill", category: "Success" },
  { id: '42', text: "Action is the foundational key to all success.", author: "Pablo Picasso", category: "Success" },
  { id: '43', text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson", category: "Success" },
  { id: '44', text: "Opportunities don't happen. You create them.", author: "Chris Grosser", category: "Success" },
  { id: '45', text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", category: "Success" },
  { id: '46', text: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", author: "Colin Powell", category: "Success" },
  { id: '47', text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein", category: "Success" },
  { id: '48', text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", category: "Success" },
  { id: '49', text: "Successful people do what unsuccessful people are not willing to do.", author: "Jim Rohn", category: "Success" },
  { id: '50', text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller", category: "Success" },
  { id: '51', text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs", category: "Success" },
  { id: '52', text: "The real test is not whether you avoid this failure, because you won't. It's whether you let it harden or shame you.", author: "Barack Obama", category: "Success" },
  { id: '53', text: "To succeed in your mission, you must have single-minded devotion to your goal.", author: "A.P.J. Abdul Kalam", category: "Success" },
  { id: '54', text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill", category: "Success" },
  { id: '55', text: "The distance between insanity and genius is measured only by success.", author: "Bruce Feirstein", category: "Success" },
  { id: '56', text: "If you want to achieve greatness stop asking for permission.", author: "Brian Tracy", category: "Success" },
  { id: '57', text: "If you don't build your dream, someone else will hire you to help them build theirs.", author: "Dhirubhai Ambani", category: "Success" },
  { id: '58', text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", category: "Success" },
  { id: '59', text: "The starting point of all achievement is desire.", author: "Napoleon Hill", category: "Success" },
  { id: '60', text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", category: "Success" },

  // Study (61-80)
  { id: '61', text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King", category: "Study" },
  { id: '62', text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X", category: "Study" },
  { id: '63', text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "Study" },
  { id: '64', text: "The expert in anything was once a beginner.", author: "Helen Hayes", category: "Study" },
  { id: '65', text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", category: "Study" },
  { id: '66', text: "Education is not the learning of facts, but the training of the mind to think.", author: "Albert Einstein", category: "Study" },
  { id: '67', text: "Learning never exhausts the mind.", author: "Leonardo da Vinci", category: "Study" },
  { id: '68', text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle", category: "Study" },
  { id: '69', text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo", category: "Study" },
  { id: '70', text: "Teachers can open the door, but you must enter it yourself.", author: "Chinese Proverb", category: "Study" },
  { id: '71', text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", category: "Study" },
  { id: '72', text: "Knowledge is power. Information is liberating. Education is the premise of progress.", author: "Kofi Annan", category: "Study" },
  { id: '73', text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein", category: "Study" },
  { id: '74', text: "Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.", author: "Richard Feynman", category: "Study" },
  { id: '75', text: "There is no end to education. It is not that you read a book, pass an examination, and finish with education.", author: "Jiddu Krishnamurti", category: "Study" },
  { id: '76', text: "In youth we learn; in age we understand.", author: "Marie von Ebner-Eschenbach", category: "Study" },
  { id: '77', text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin", category: "Study" },
  { id: '78', text: "Education is what remains after one has forgotten what one has learned in school.", author: "Albert Einstein", category: "Study" },
  { id: '79', text: "Curiosity is the wick in the candle of learning.", author: "William Arthur Ward", category: "Study" },
  { id: '80', text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch", category: "Study" },

  // Leadership (81-95)
  { id: '81', text: "If your actions inspire others to dream more, learn more, do more and become more, you are a leader.", author: "John Quincy Adams", category: "Leadership" },
  { id: '82', text: "Leadership is the capacity to translate vision into reality.", author: "Warren Bennis", category: "Leadership" },
  { id: '83', text: "To handle yourself, use your head; to handle others, use your heart.", author: "Eleanor Roosevelt", category: "Leadership" },
  { id: '84', text: "A leader is one who knows the way, goes the way, and shows the way.", author: "John C. Maxwell", category: "Leadership" },
  { id: '85', text: "The function of leadership is to produce more leaders, not more followers.", author: "Ralph Nader", category: "Leadership" },
  { id: '86', text: "Earn your leadership every day.", author: "Michael Jordan", category: "Leadership" },
  { id: '87', text: "Before you are a leader, success is all about growing yourself. When you become a leader, success is all about growing others.", author: "Jack Welch", category: "Leadership" },
  { id: '88', text: "Effective leadership is not about making speeches or being liked; leadership is defined by results not attributes.", author: "Peter Drucker", category: "Leadership" },
  { id: '89', text: "Management is doing things right; leadership is doing the right things.", author: "Peter Drucker", category: "Leadership" },
  { id: '90', text: "The supreme quality for leadership is unquestionably integrity. Without it, no real success is possible.", author: "Dwight D. Eisenhower", category: "Leadership" },
  { id: '91', text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "Leadership" },
  { id: '92', text: "A genuine leader is not a searcher for consensus but a molder of consensus.", author: "Martin Luther King Jr.", category: "Leadership" },
  { id: '93', text: "Great leaders are almost always great simplifiers, who can cut through argument, debate, and doubt.", author: "Colin Powell", category: "Leadership" },
  { id: '94', text: "The art of leadership is saying no, not yes. It is very easy to say yes.", author: "Tony Blair", category: "Leadership" },
  { id: '95', text: "Outstanding leaders go out of their way to boost the self-esteem of their personnel.", author: "Sam Walton", category: "Leadership" },

  // Creativity (96-105)
  { id: '96', text: "Creativity is intelligence having fun.", author: "Albert Einstein", category: "Creativity" },
  { id: '97', text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou", category: "Creativity" },
  { id: '98', text: "Clean out a corner of your mind and creativity will instantly fill it.", author: "Dee Hock", category: "Creativity" },
  { id: '99', text: "Creativity is connecting things. When you ask creative people how they did something, they feel a little guilty because they didn't really do it.", author: "Steve Jobs", category: "Creativity" },
  { id: '100', text: "The worst enemy to creativity is self-doubt.", author: "Sylvia Plath", category: "Creativity" },
  { id: '101', text: "To practice any art, no matter how well or badly, is a way to make your soul grow.", author: "Kurt Vonnegut", category: "Creativity" },
  { id: '102', text: "Don't think. Thinking is the enemy of creativity. It's self-conscious, and anything self-conscious is lousy.", author: "Ray Bradbury", category: "Creativity" },
  { id: '103', text: "Creativity comes from looking for the unexpected and stepping outside your own experience.", author: "Masaru Ibuka", category: "Creativity" },
  { id: '104', text: "Imagination is everything. It is the preview of life's coming attractions.", author: "Albert Einstein", category: "Creativity" },
  { id: '105', text: "Creativity is seeing what everyone else has seen, and thinking what no one else has thought.", author: "Albert Szent-Györgyi", category: "Creativity" },

  // Life (106-120)
  { id: '106', text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", category: "Life" },
  { id: '107', text: "Life is what happens when you're busy making other plans.", author: "John Lennon", category: "Life" },
  { id: '108', text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha", category: "Life" },
  { id: '109', text: "The purpose of our lives is to be happy.", author: "Dalai Lama", category: "Life" },
  { id: '110', text: "Life is really simple, but we insist on making it complicated.", author: "Confucius", category: "Life" },
  { id: '111', text: "Good friends, good books, and a sleepy conscience: this is the ideal life.", author: "Mark Twain", category: "Life" },
  { id: '112', text: "Only a life lived for others is a life worthwhile.", author: "Albert Einstein", category: "Life" },
  { id: '113', text: "The unexamined life is not worth living.", author: "Socrates", category: "Life" },
  { id: '114', text: "Turn your wounds into wisdom.", author: "Oprah Winfrey", category: "Life" },
  { id: '115', text: "Live in the sunshine, swim the sea, drink the wild air.", author: "Ralph Waldo Emerson", category: "Life" },
  { id: '116', text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll", category: "Life" },
  { id: '117', text: "The biggest adventure you can take is to live the life of your dreams.", author: "Oprah Winfrey", category: "Life" },
  { id: '118', text: "To live is the rarest thing in the world. Most people exist, that is all.", author: "Oscar Wilde", category: "Life" },
  { id: '119', text: "Life isn't about finding yourself. Life is about creating yourself.", author: "George Bernard Shaw", category: "Life" },
  { id: '120', text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem", category: "Life" },

  // Business (121-135)
  { id: '121', text: "Whenever you see a successful business, someone once made a courageous decision.", author: "Peter Drucker", category: "Business" },
  { id: '122', text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates", category: "Business" },
  { id: '123', text: "The best way to predict the future is to create it.", author: "Peter Drucker", category: "Business" },
  { id: '124', text: "If you don't drive your business, you will be driven out of business.", author: "B.C. Forbes", category: "Business" },
  { id: '125', text: "A big business starts small.", author: "Richard Branson", category: "Business" },
  { id: '126', text: "Great things in business are never done by one person. They're done by a team of people.", author: "Steve Jobs", category: "Business" },
  { id: '127', text: "In business, you don't get what you deserve, you get what you negotiate.", author: "Chester Karrass", category: "Business" },
  { id: '128', text: "Risk more than others think is safe. Dream more than others think is practical.", author: "Howard Schultz", category: "Business" },
  { id: '129', text: "Don't find customers for your products, find products for your customers.", author: "Seth Godin", category: "Business" },
  { id: '130', text: "Quality means doing it right when no one is looking.", author: "Henry Ford", category: "Business" },
  { id: '131', text: "Business opportunities are like buses, there's always another one coming.", author: "Richard Branson", category: "Business" },
  { id: '132', text: "Price is what you pay. Value is what you get.", author: "Warren Buffett", category: "Business" },
  { id: '133', text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates", category: "Business" },
  { id: '134', text: "Never give up. Today is hard, tomorrow will be worse, but the day after tomorrow will be sunshine.", author: "Jack Ma", category: "Business" },
  { id: '135', text: "Choose a job that you like, and you will never have to work a day in your life.", author: "Confucius", category: "Business" }
];

export const CATEGORIES = [
  "All",
  "Favorites",
  "Motivation",
  "Discipline",
  "Success",
  "Study",
  "Leadership",
  "Creativity",
  "Life",
  "Business"
];

interface QuotesState {
  favorites: string[];
  loadFavorites: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

const getStorageKey = () => {
  const userId = useAuthStore.getState().session?.user?.id || 'guest';
  return `@groundwork_quotes_favorites_${userId}`;
};

export const useQuotesStore = create<QuotesState>((set, get) => ({
  favorites: [],

  loadFavorites: async () => {
    try {
      const key = getStorageKey();
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        set({ favorites: JSON.parse(stored) });
      } else {
        set({ favorites: [] });
      }
    } catch (e) {
      console.warn('[QuotesStore] Failed to load favorites:', e);
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const current = get().favorites;
      const key = getStorageKey();
      let nextFavorites: string[];
      if (current.includes(id)) {
        nextFavorites = current.filter(item => item !== id);
      } else {
        nextFavorites = [...current, id];
      }
      set({ favorites: nextFavorites });
      await AsyncStorage.setItem(key, JSON.stringify(nextFavorites));
    } catch (e) {
      console.warn('[QuotesStore] Failed to save favorites:', e);
    }
  }
}));
