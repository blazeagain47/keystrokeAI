"use client"

// hooks/useAuth.tsx
import { useState, useEffect, useContext, createContext } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: any
  lastLogin: any
  typingStats: {
    totalTests: number
    avgWPM: number
    avgAccuracy: number
    totalTimeTyped: number
    currentLevel: number
    skillRating: number
  }
  preferences: {
    theme: 'light' | 'dark'
    soundEnabled: boolean
    keyboardLayout: string
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive'
  }
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Create default user profile
  const createUserProfile = async (user: User, additionalData?: any) => {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      const defaultProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || additionalData?.displayName || 'Typist',
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        typingStats: {
          totalTests: 0,
          avgWPM: 0,
          avgAccuracy: 0,
          totalTimeTyped: 0,
          currentLevel: 1,
          skillRating: 100,
        },
        preferences: {
          theme: 'dark',
          soundEnabled: true,
          keyboardLayout: 'qwerty',
          difficulty: 'adaptive',
        },
        ...additionalData,
      }

      await setDoc(userRef, defaultProfile)
      setUserProfile(defaultProfile)
    } else {
      // Update last login
      const profile = userSnap.data() as UserProfile
      await setDoc(userRef, { ...profile, lastLogin: serverTimestamp() })
      setUserProfile(profile)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })
      await createUserProfile(result.user, { displayName })
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  // Logout
  const logout = async () => {
    try {
      await signOut(auth)
      setUserProfile(null)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userProfile) return

    try {
      const userRef = doc(db, 'users', user.uid)
      const updatedProfile = { ...userProfile, ...updates }
      await setDoc(userRef, updatedProfile)
      setUserProfile(updatedProfile)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        await createUserProfile(user)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 