import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  console.log("🧪 DEBUG: OPENAI_API_KEY =", process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  try {
    const { prompt, difficulty, topic } = await request.json();

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using fallback text');
      return NextResponse.json({ 
        text: 'The quick brown fox jumps over the lazy dog in the morning.',
        fallback: true 
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
                   body: JSON.stringify({
               model: 'gpt-3.5-turbo',
               messages: [
                 {
                   role: 'system',
                   content: 'You are a helpful assistant that generates typing test sentences. Always return only the sentence, no quotes, no additional text.'
                 },
                 {
                   role: 'user',
                   content: prompt
                 }
               ],
               max_tokens: 100,
               temperature: 0.7,
             }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error('No text generated from OpenAI');
    }

    return NextResponse.json({ text: generatedText });
  } catch (error) {
    console.error('Error in generate-text API:', error);
    
    // Return fallback text based on difficulty and topic
    const fallbackTexts: Record<string, Record<string, string>> = {
      easy: {
        general: 'The quick brown fox jumps over the lazy dog in the morning.',
        code: 'The function returns a value when called with proper parameters.',
        punctuation: 'Hello, world! How are you today? I hope you\'re doing well.'
      },
      medium: {
        general: 'The scientist conducted experiments in the laboratory to test the new hypothesis.',
        code: 'The async function processes data and returns a promise with the results.',
        punctuation: 'She said, "I\'ll be there soon"; however, the traffic was terrible.'
      },
      hard: {
        general: 'The quantum physicist meticulously analyzed the subatomic particles in the particle accelerator.',
        code: 'The recursive algorithm efficiently traverses the binary tree structure and processes each node.',
        punctuation: 'The professor exclaimed, "This is remarkable!"; nevertheless, we must proceed with caution.'
      }
    };
    
    // Extract difficulty and topic from the request body for fallback
    let fallbackDifficulty = 'easy';
    let fallbackTopic = 'general';
    
    try {
      const body = await request.json();
      fallbackDifficulty = body.difficulty || 'easy';
      fallbackTopic = body.topic || 'general';
    } catch {
      // If we can't parse the body, use defaults
    }
    
    const fallbackText = fallbackTexts[fallbackDifficulty]?.[fallbackTopic] || 'The quick brown fox jumps over the lazy dog.';
    
    return NextResponse.json({ 
      text: fallbackText,
      fallback: true 
    });
  }
} 