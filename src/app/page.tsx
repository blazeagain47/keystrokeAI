"use client"

import React from 'react';
import TypingTest from '@/components/typing/TypingTest';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TypingAnimation } from '@/components/ui/typing';

export default function PracticePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center mb-8">
            <TypingAnimation 
              text="Welcome to KeystrokeAI" 
              className="text-4xl font-bold text-white mb-4"
            />
            <TypingAnimation 
              text="Your AI-powered typing practice platform" 
              className="text-lg text-gray-300"
              speed={80}
            />
          </div>
          <TypingTest />
        </div>
      </div>
    </ProtectedRoute>
  );
}