// Long-term missions (도전 과제). Daily goals are the to-dos; these are milestones that pay once.
import type { GameState, Reward } from './state';

export type CounterKey = 'cooks' | 'threeStarCooks' | 'bonusClaims';
export type Counters = Record<CounterKey, number>;

export type MissionIcon = 'bowl' | 'star' | 'ball' | 'bone' | 'heart' | 'house' | 'gift' | 'level';

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  icon: MissionIcon;
  goal: number;
  progress: (s: GameState) => number;
  reward: Pick<Reward, 'coins' | 'hearts' | 'exp'>;
}

export const MISSIONS: MissionDef[] = [
  { id: 'first-cook', title: '첫 화식 요리', desc: '화식키친에서 요리를 완성해요', icon: 'bowl', goal: 1, progress: (s) => s.counters.cooks, reward: { coins: 100 } },
  { id: 'star-chef', title: '별 셋 셰프', desc: '별 3개 화식을 3번 만들어요', icon: 'star', goal: 3, progress: (s) => s.counters.threeStarCooks, reward: { hearts: 5, exp: 100 } },
  { id: 'ball-1500', title: '공놀이 고수', desc: '공놀이에서 1,500점을 넘겨요', icon: 'ball', goal: 1500, progress: (s) => s.bestBall, reward: { coins: 200 } },
  { id: 'all-treats', title: '포근공원 탐험가', desc: '산책에서 간식 12개를 모두 찾아요', icon: 'bone', goal: 12, progress: (s) => s.walk.found.length, reward: { hearts: 10, exp: 150 } },
  { id: 'best-friend', title: '단짝 친구', desc: '친밀도 100을 채워요', icon: 'heart', goal: 100, progress: (s) => s.affection, reward: { coins: 300 } },
  { id: 'decorator', title: '꾸미기 장인', desc: '가구를 4개 모아요', icon: 'house', goal: 4, progress: (s) => s.deco.owned.length, reward: { coins: 150 } },
  { id: 'diligent', title: '성실한 보호자', desc: '보너스 상자를 3번 받아요', icon: 'gift', goal: 3, progress: (s) => s.counters.bonusClaims, reward: { hearts: 10 } },
  { id: 'grow-up', title: '무럭무럭', desc: 'Lv.7이 되어 듬직한 양말이로 자라요', icon: 'level', goal: 7, progress: (s) => s.level, reward: { coins: 500, hearts: 20 } },
];

export type MissionStatus = 'claimable' | 'progress' | 'claimed';

export interface MissionView extends MissionDef {
  current: number;
  status: MissionStatus;
}

export function missionViews(s: GameState): MissionView[] {
  return MISSIONS.map((m) => {
    const current = Math.min(m.goal, Math.floor(m.progress(s)));
    const status: MissionStatus = s.missionsClaimed.includes(m.id) ? 'claimed' : current >= m.goal ? 'claimable' : 'progress';
    return { ...m, current, status };
  });
}

export const claimableCount = (s: GameState) => missionViews(s).filter((m) => m.status === 'claimable').length;

/** Readable reward line, e.g. "코인 200 · 하트 5". */
export function rewardText(r: MissionDef['reward']) {
  return [r.coins && `코인 ${r.coins}`, r.hearts && `하트 ${r.hearts}`, r.exp && `EXP ${r.exp}`].filter(Boolean).join(' · ');
}
