// src/components/dashboard/Dashboard.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import UserProfile from '@/components/auth/UserProfile'
import TypingTest from '@/components/typing/TypingTest'
import { 
  Keyboard, 
  Crown,
  Info,
  Settings,
  Bell,
  User,
  X,
  Mail,
  DollarSign,
  Github,
  MessageCircle,
  Twitter,
  FileText,
  Lock,
  Shield
} from 'lucide-react'

export default function Dashboard() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'practice'>('practice')
  const [showBanner, setShowBanner] = useState(true)

  if (!userProfile) return null

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <UserProfile />
      case 'practice':
        return <TypingTest />
      default:
        return <TypingTest />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top Banner */}
      {showBanner && (
        <div className="bg-yellow-500 text-gray-900 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">New merch store now open, including a limited edition metal keycap! keystrokeai.store</span>
          <button 
            onClick={() => setShowBanner(false)}
            className="hover:bg-yellow-600 rounded p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header/Navigation */}
      <nav className="bg-neutral-800/50 backdrop-blur-sm border-b border-neutral-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-yellow-400 rounded mr-2 flex items-center justify-center">
                  <Keyboard className="h-5 w-5 text-gray-900" />
                </div>
                <span className="text-xl font-bold text-gray-100">
                  keystrokeai
                </span>
              </div>
              <div className="ml-10 flex items-baseline space-x-1">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'practice' 
                      ? 'bg-yellow-400 text-gray-900 shadow-sm' 
                      : 'text-gray-300 hover:text-white hover:bg-neutral-700'
                  }`}
                  onClick={() => setActiveTab('practice')}
                >
                  Practice
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'dashboard' 
                      ? 'bg-yellow-400 text-gray-900 shadow-sm' 
                      : 'text-gray-300 hover:text-white hover:bg-neutral-700'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'profile' 
                      ? 'bg-yellow-400 text-gray-900 shadow-sm' 
                      : 'text-gray-300 hover:text-white hover:bg-neutral-700'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-neutral-700 transition-all duration-200">
                <Crown className="h-5 w-5" />
              </button>
              <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-neutral-700 transition-all duration-200">
                <Info className="h-5 w-5" />
              </button>
              <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-neutral-700 transition-all duration-200">
                <Settings className="h-5 w-5" />
              </button>
              <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-neutral-700 transition-all duration-200">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-neutral-700 transition-all duration-200">
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-800/50 backdrop-blur-sm border-t border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-6">
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <Mail className="h-4 w-4" />
                <span>contact</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <DollarSign className="h-4 w-4" />
                <span>support</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <Github className="h-4 w-4" />
                <span>github</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>discord</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-4 w-4" />
                <span>twitter</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <FileText className="h-4 w-4" />
                <span>terms</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <Shield className="h-4 w-4" />
                <span>security</span>
              </a>
              <a href="#" className="footer-link flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                <Lock className="h-4 w-4" />
                <span>privacy</span>
              </a>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span className="shortcut">tab + enter - restart test</span>
                <span className="shortcut">esc or ctrl + shift + p - command line</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <span>serika dark</span>
                <span>v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}