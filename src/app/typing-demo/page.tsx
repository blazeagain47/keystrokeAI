import { TypingAnimationDemo } from "@/components/ui/typing-demo"

export default function TypingDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="mb-8 text-3xl font-bold text-center">
          Typing Animation Demo
        </h1>
        <TypingAnimationDemo />
      </div>
    </div>
  )
} 