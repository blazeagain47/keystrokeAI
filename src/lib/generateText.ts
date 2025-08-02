type Difficulty = 'easy' | 'medium' | 'hard';
type Topic = 'general' | 'code' | 'punctuation';

// Local typing prompt generator with predefined sentence pools
const TYPING_PROMPTS: Record<Difficulty, Record<Topic, string[]>> = {
  easy: {
    general: [
      'The quick brown fox jumps over the lazy dog in the morning.',
      'A beautiful sunset painted the sky with vibrant colors.',
      'Children played happily in the park near the fountain.',
      'The old library contained thousands of ancient books.',
      'Fresh coffee filled the kitchen with its rich aroma.'
    ],
    code: [
      'The function returns a value when called with proper parameters.',
      'Variables store data that can be used throughout the program.',
      'Loops repeat code until a specific condition is met.',
      'Arrays hold multiple values in a single variable.',
      'Comments help explain what the code does clearly.'
    ],
    punctuation: [
      'Hello, world! How are you today? I hope you\'re doing well.',
      'She said, "I\'ll be there soon"; however, the traffic was terrible.',
      'The meeting starts at 2:00 PM; please arrive on time.',
      'Wow! That\'s amazing; I can\'t believe it worked.',
      'Dr. Smith asked, "Are you ready for the test?"'
    ]
  },
  medium: {
    general: [
      'The scientist conducted experiments in the laboratory to test the new hypothesis.',
      'Environmental conservation efforts have increased significantly over the past decade.',
      'Modern technology continues to revolutionize how we communicate daily.',
      'The ancient ruins revealed fascinating insights about early civilizations.',
      'Global markets experienced unprecedented volatility during the economic crisis.'
    ],
    code: [
      'The async function processes data and returns a promise with the results.',
      'Object-oriented programming encapsulates data and behavior within classes.',
      'Error handling mechanisms prevent crashes when unexpected issues occur.',
      'Database queries retrieve information based on specific search criteria.',
      'API endpoints provide structured access to external service functionality.'
    ],
    punctuation: [
      'She said, "I\'ll be there soon"; however, the traffic was terrible.',
      'The professor exclaimed, "This is remarkable!"; nevertheless, we must proceed with caution.',
      'According to the report: "Sales increased by 25%"; moreover, customer satisfaction improved.',
      'The email stated: "Meeting postponed until Friday"; therefore, we\'ll reschedule accordingly.',
      'He asked, "Are you sure about this decision?"; meanwhile, others disagreed strongly.'
    ]
  },
  hard: {
    general: [
      'The quantum physicist meticulously analyzed the subatomic particles in the particle accelerator.',
      'Archaeological discoveries in the remote desert revealed previously unknown ancient civilizations.',
      'International diplomatic negotiations required extensive preparation and cultural sensitivity.',
      'Revolutionary breakthroughs in renewable energy technology transformed global infrastructure.',
      'Sophisticated artificial intelligence algorithms demonstrated unprecedented problem-solving capabilities.'
    ],
    code: [
      'The recursive algorithm efficiently traverses the binary tree structure and processes each node.',
      'Microservices architecture enables scalable deployment of distributed system components.',
      'Advanced cryptographic protocols implement secure communication channels between endpoints.',
      'Machine learning models utilize neural networks to recognize complex pattern relationships.',
      'Blockchain technology provides decentralized consensus mechanisms for digital transactions.'
    ],
    punctuation: [
      'The professor exclaimed, "This is remarkable!"; nevertheless, we must proceed with caution.',
      'According to the report: "Sales increased by 25%"; moreover, customer satisfaction improved significantly.',
      'The email stated: "Meeting postponed until Friday"; therefore, we\'ll reschedule accordingly.',
      'He asked, "Are you sure about this decision?"; meanwhile, others disagreed strongly.',
      'The document revealed: "Confidential information disclosed"; consequently, security protocols were activated immediately.'
    ]
  }
};

export async function generateTypingPrompt({ difficulty, topic }: { difficulty: Difficulty; topic: Topic }): Promise<string> {
  console.log('generateTypingPrompt called with:', { difficulty, topic });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Get the appropriate sentence pool
  const sentencePool = TYPING_PROMPTS[difficulty]?.[topic];
  if (!sentencePool || sentencePool.length === 0) {
    console.log('No sentences found for difficulty/topic combo, using fallback');
    return 'The quick brown fox jumps over the lazy dog in the morning.';
  }
  
  // Randomly select a sentence from the pool
  const randomIndex = Math.floor(Math.random() * sentencePool.length);
  const selectedSentence = sentencePool[randomIndex];
  
  console.log('Generated text (local):', selectedSentence);
  return selectedSentence;
} 