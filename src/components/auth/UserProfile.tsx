// src/components/auth/UserProfile.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, Settings, Trophy, Zap } from 'lucide-react'

export default function UserProfile() {
  const { user, userProfile, logout, updateUserProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: userProfile?.displayName || '',
    theme: userProfile?.preferences.theme || 'dark',
    soundEnabled: userProfile?.preferences.soundEnabled ?? true,
    keyboardLayout: userProfile?.preferences.keyboardLayout || 'qwerty',
    difficulty: userProfile?.preferences.difficulty || 'adaptive',
  })

  const handleSaveProfile = async () => {
    if (!userProfile) return

    await updateUserProfile({
      displayName: editForm.displayName,
      preferences: {
        theme: editForm.theme as 'light' | 'dark',
        soundEnabled: editForm.soundEnabled,
        keyboardLayout: editForm.keyboardLayout,
        difficulty: editForm.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'adaptive',
      },
    })
    setIsEditing(false)
  }

  if (!userProfile) return null

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user?.photoURL || undefined} />
          <AvatarFallback className="text-lg">
            {userProfile.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2">
            {userProfile.displayName}
            <Badge variant="secondary">Level {userProfile.typingStats.currentLevel}</Badge>
          </CardTitle>
          <CardDescription>{userProfile.email}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Typing Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {userProfile.typingStats.avgWPM}
            </div>
            <div className="text-sm text-muted-foreground">Avg WPM</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {userProfile.typingStats.avgAccuracy}%
            </div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1">
              <Trophy className="h-5 w-5" />
              {userProfile.typingStats.totalTests}
            </div>
            <div className="text-sm text-muted-foreground">Tests</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-orange-600 flex items-center justify-center gap-1">
              <Zap className="h-5 w-5" />
              {userProfile.typingStats.skillRating}
            </div>
            <div className="text-sm text-muted-foreground">Rating</div>
          </div>
        </div>

        {/* Profile Settings */}
        {isEditing ? (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={editForm.theme}
                  onValueChange={(value: 'light' | 'dark') =>
                    setEditForm({ ...editForm, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyboard">Keyboard Layout</Label>
                <Select
                  value={editForm.keyboardLayout}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, keyboardLayout: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwerty">QWERTY</SelectItem>
                    <SelectItem value="dvorak">Dvorak</SelectItem>
                    <SelectItem value="colemak">Colemak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={editForm.difficulty}
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced' | 'adaptive') =>
                    setEditForm({ ...editForm, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="adaptive">Adaptive (AI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sound"
                checked={editForm.soundEnabled}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, soundEnabled: checked })
                }
              />
              <Label htmlFor="sound">Enable typing sounds</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile}>Save Changes</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Theme:</span>
              <span className="capitalize">{userProfile.preferences.theme}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Keyboard:</span>
              <span className="uppercase">{userProfile.preferences.keyboardLayout}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Difficulty:</span>
              <span className="capitalize">{userProfile.preferences.difficulty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sounds:</span>
              <span>{userProfile.preferences.soundEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}