"use client"

import React from 'react';
import TypingTest from '@/components/typing/TypingTest';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <TypingTest />
      </div>
    </ProtectedRoute>
  );
}