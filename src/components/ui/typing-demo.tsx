"use client"

import { TypingAnimation } from "./typing"

export function TypingAnimationDemo() {
  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Typing Animation Examples</h2>
        
        {/* Basic usage */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Basic Animation</h3>
          <TypingAnimation 
            text="Hello, this is a typing animation!" 
            className="text-xl text-blue-600"
          />
        </div>

        {/* Fast typing */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Fast Typing</h3>
          <TypingAnimation 
            text="This types faster!" 
            speed={30}
            className="text-lg text-green-600"
          />
        </div>

        {/* Slow typing */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Slow Typing</h3>
          <TypingAnimation 
            text="This types slowly..." 
            speed={100}
            className="text-lg text-purple-600"
          />
        </div>

        {/* Without cursor */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Without Cursor</h3>
          <TypingAnimation 
            text="No blinking cursor here" 
            cursor={false}
            className="text-lg text-orange-600"
          />
        </div>

        {/* Custom cursor */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Custom Cursor</h3>
          <TypingAnimation 
            text="Custom cursor style" 
            cursorClassName="bg-red-500 h-6 w-1"
            className="text-lg text-gray-700"
          />
        </div>

        {/* Repeating animation */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Repeating Animation</h3>
          <TypingAnimation 
            text="This repeats every 3 seconds!" 
            repeat={true}
            repeatDelay={3000}
            className="text-lg text-pink-600"
          />
        </div>

        {/* Large text */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Large Text</h3>
          <TypingAnimation 
            text="Welcome to KeystrokeAI" 
            className="text-4xl font-bold text-black dark:text-white"
          />
        </div>
      </div>
    </div>
  )
} 