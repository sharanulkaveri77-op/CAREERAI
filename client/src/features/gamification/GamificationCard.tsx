import { useEffect, useState } from 'react';
import { Flame, Trophy, Zap } from 'lucide-react';
import api from '../../lib/axios';

interface GamificationSnapshot {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streakCount: number;
  badges: { id: string; emoji: string; name: string; description: string; earned: boolean }[];
  recentEvents: { reason: string; xp: number; at: string }[];
}

export const GamificationCard = () => {
  const [snapshot, setSnapshot] = useState<GamificationSnapshot | null>(null);

  const fetchSnapshot = async () => {
    try {
      const { data } = await api.get('/gamification');
      setSnapshot(data.gamification);
    } catch {
      // Gamification is a bonus layer — never break the dashboard for it
    }
  };

  useEffect(() => {
    fetchSnapshot();
    const refresh = () => {
      fetchSnapshot();
    };
    window.addEventListener('gamification-updated', refresh);
    return () => window.removeEventListener('gamification-updated', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!snapshot) return null;

  const levelProgress = snapshot.xpForNextLevel > 0
    ? Math.min(100, Math.round((snapshot.xpIntoLevel / snapshot.xpForNextLevel) * 100))
    : 100;
  const earnedCount = snapshot.badges.filter((b) => b.earned).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">Career Progress</h2>
        <span className="text-sm font-medium text-slate-500">{earnedCount}/{snapshot.badges.length} badges earned</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Zap className="w-4 h-4 text-amber-500 mr-2" />
            <p className="text-sm font-medium text-slate-500">Level {snapshot.level}</p>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${levelProgress}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {snapshot.xpIntoLevel}/{snapshot.xpForNextLevel} XP to level {snapshot.level + 1} · {snapshot.xp} total XP
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 flex items-start">
          <Flame className={`w-4 h-4 mr-2 mt-0.5 ${snapshot.streakCount > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
          <div>
            <p className="text-sm font-medium text-slate-500">Activity Streak</p>
            <p className="text-lg font-bold text-slate-900">
              {snapshot.streakCount > 0 ? `${snapshot.streakCount} day${snapshot.streakCount === 1 ? '' : 's'}` : 'Start today'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Come back daily to keep it alive</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 flex items-start">
          <Trophy className="w-4 h-4 mr-2 mt-0.5 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-slate-500">Recent</p>
            {snapshot.recentEvents.length > 0 ? (
              <p className="text-sm text-slate-700 mt-1">
                +{snapshot.recentEvents[0].xp} XP — {snapshot.recentEvents[0].reason.replace(/_/g, ' ').toLowerCase()}
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-1">No activity yet</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500 mb-3">Badges</p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {snapshot.badges.map((badge) => (
          <div
            key={badge.id}
            title={`${badge.name} — ${badge.description}`}
            className={`flex flex-col items-center text-center p-2 rounded-lg border ${
              badge.earned ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-40 grayscale'
            }`}
          >
            <span className="text-2xl">{badge.emoji}</span>
            <span className="text-[10px] font-medium text-slate-600 mt-1 leading-tight">{badge.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};