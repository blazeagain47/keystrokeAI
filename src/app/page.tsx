"use client"

import React from 'react';
import TypingTest from '@/components/typing/TypingTest';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function PracticePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <TypingTest />
      </div>
    </ProtectedRoute>
  );
}