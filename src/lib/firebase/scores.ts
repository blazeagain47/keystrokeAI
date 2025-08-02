import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface TypingResult {
  userId: string;
  wpm: number;
  accuracy: number;
  timestamp: any; // serverTimestamp
  duration?: number;
  testMode?: string;
  wordCount?: number;
}

export const saveTypingResult = async (
  userId: string, 
  wpm: number, 
  accuracy: number,
  duration?: number,
  testMode?: string,
  wordCount?: number
): Promise<void> => {
  try {
    const result: TypingResult = {
      userId,
      wpm,
      accuracy,
      timestamp: serverTimestamp(),
      duration,
      testMode,
      wordCount
    };

    const docRef = await addDoc(collection(db, 'typing_results'), result);
    console.log('Typing result saved successfully:', docRef.id);
  } catch (error) {
    console.error('Error saving typing result:', error);
    throw error;
  }
}; 