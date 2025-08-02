"use client"

import React from 'react';
import { Trophy, Crown, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  wpm: number;
  accuracy: number;
  date: string;
}

const dummyLeaderboardData: LeaderboardEntry[] = [
  { rank: 1, username: "speed_demon", wpm: 142, accuracy: 98, date: "2h ago" },
  { rank: 2, username: "typing_master", wpm: 138, accuracy: 99, date: "4h ago" },
  { rank: 3, username: "keyboard_warrior", wpm: 135, accuracy: 97, date: "6h ago" },
  { rank: 4, username: "fast_fingers", wpm: 132, accuracy: 96, date: "8h ago" },
  { rank: 5, username: "wpm_champion", wpm: 129, accuracy: 98, date: "1d ago" },
  { rank: 6, username: "accuracy_king", wpm: 127, accuracy: 100, date: "1d ago" },
  { rank: 7, username: "typing_pro", wpm: 125, accuracy: 95, date: "2d ago" },
  { rank: 8, username: "speed_racer", wpm: 123, accuracy: 97, date: "2d ago" },
  { rank: 9, username: "keyboard_ninja", wpm: 121, accuracy: 96, date: "3d ago" },
  { rank: 10, username: "typing_legend", wpm: 119, accuracy: 98, date: "3d ago" },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-yellow-400" />;
    case 2:
      return <Medal className="h-4 w-4 text-gray-300" />;
    case 3:
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return <span className="text-sm text-gray-400 font-medium">#{rank}</span>;
  }
};

const LeaderboardPanel: React.FC = () => {
  return (
    <div className="bg-neutral-800/50 backdrop-blur-sm rounded-lg p-6 border border-neutral-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
        Global Leaderboard
      </h3>
      
      <div className="space-y-2">
        {dummyLeaderboardData.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-700/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-6">
                {getRankIcon(entry.rank)}
              </div>
              <div>
                <div className="text-white font-medium text-sm">
                  {entry.username}
                </div>
                <div className="text-gray-400 text-xs">
                  {entry.date}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-yellow-400 font-bold text-sm">
                  {entry.wpm} WPM
                </div>
                <div className="text-gray-400 text-xs">
                  {entry.accuracy}% accuracy
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
        <div className="flex items-center text-blue-400">
          <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
          <span className="text-sm font-medium">Your best: 0 WPM</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Complete a test to see your ranking
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPanel; 