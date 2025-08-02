"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TypingAnimationProps {
  text: string
  className?: string
  speed?: number
  delay?: number
  cursor?: boolean
  cursorClassName?: string
  repeat?: boolean
  repeatDelay?: number
}

export function TypingAnimation({
  text,
  className,
  speed = 50,
  delay = 0,
  cursor = true,
  cursorClassName,
  repeat = false,
  repeatDelay = 2000,
}: TypingAnimationProps) {
  const [displayText, setDisplayText] = React.useState("")
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isComplete, setIsComplete] = React.useState(false)

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else {
      setIsComplete(true)
    }
  }, [currentIndex, text, speed])

  React.useEffect(() => {
    if (repeat && isComplete) {
      const timer = setTimeout(() => {
        setDisplayText("")
        setCurrentIndex(0)
        setIsComplete(false)
      }, repeatDelay)

      return () => clearTimeout(timer)
    }
  }, [isComplete, repeat, repeatDelay])

  return (
    <div className={cn("inline-flex items-center", className)}>
      <span>{displayText}</span>
      {cursor && (
        <AnimatePresence>
          <motion.span
            className={cn(
              "ml-1 h-4 w-0.5 bg-current",
              cursorClassName
            )}
            animate={{ opacity: [1, 0, 1] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </AnimatePresence>
      )}
    </div>
  )
} 