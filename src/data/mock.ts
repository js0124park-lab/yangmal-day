// Static game content (names, rewards, art choices). Changing values live in src/game/state.tsx.
import { ROUTES } from '../routes';
import { asset } from '../lib/asset';

export type TodoId = 'meal' | 'play' | 'walk' | 'care' | 'deco';

export interface TodoDef {
  id: TodoId;
  name: string;
  reward: string;
  to: string;
  color: string;
  rotate: string;
  curl?: boolean;
}

export const TODOS: TodoDef[] = [
  { id: 'meal', name: '밥 먹이기', reward: '화식키친 1회 · 코인 50 · EXP 100', to: ROUTES.kitchen, color: '#BFEBD3', rotate: '-1.5deg', curl: true },
  { id: 'play', name: '신나게 놀아주기', reward: '공놀이 1회 · 코인 50 · EXP 100', to: ROUTES.ball, color: '#DCC7EE', rotate: '1deg' },
  { id: 'walk', name: '산책하기', reward: 'Lv.7 전엔 마당 놀기 · 코인 80 · EXP 120', to: ROUTES.walk, color: '#BFDDF4', rotate: '0.8deg' },
  { id: 'care', name: '씻기 & 케어', reward: '목욕 또는 빗질 · 코인 50 · EXP 80', to: ROUTES.care, color: '#FBD5B5', rotate: '-1deg' },
  { id: 'deco', name: '집 꾸미기', reward: '가구 1개 배치 · 코인 30 · EXP 50', to: ROUTES.deco, color: '#FBEFA6', rotate: '-0.8deg' },
];

export const BONUS = { coins: 40, hearts: 5, exp: 50 };

export type CareId = 'bath' | 'brush' | 'nail' | 'health';

export interface CareDef {
  id: CareId;
  label: string;
  weekly?: boolean;
  title: string;
  verb: string;
  steps: number;
  /** how the stage is worked: rub (drag) or tap */
  input: 'rub' | 'tap' | 'none';
  text: string;
  say: string;
  done: string;
}

export const CARE_TABS: CareDef[] = [
  { id: 'bath', label: '목욕', title: '거품 목욕', verb: '헹구기', steps: 3, input: 'rub', text: '사진을 위아래로 문질러 거품을 깨끗이 헹궈 주세요. 청결도 +60', say: '개운해요 멍!', done: '완료! 청결도 +60 · 코인 50' },
  { id: 'brush', label: '빗질', title: '털 빗기', verb: '빗질', steps: 5, input: 'rub', text: '털이 난 방향으로 쓸어 주세요. 청결도 +20, 친밀도 +2', say: '시원해요~', done: '완료! 청결도 +20 · 친밀도 +2' },
  { id: 'nail', label: '발톱', weekly: true, title: '발톱 다듬기', verb: '다듬기', steps: 4, input: 'tap', text: '발톱을 하나씩 톡톡 눌러 살살 잘라 주세요. 하트 +5', say: '살살 해 주세요...', done: '완료! 하트 +5' },
  { id: 'health', label: '건강', title: '건강 수첩', verb: '이번 주', steps: 0, input: 'none', text: '체중 7.4kg · 기분 좋음 · 이번 주 산책 4회. 주간 리포트를 확인해 보세요.', say: '나 건강해요!', done: '' },
];

export type PoseId = 'sit' | 'roll' | 'run' | 'wink';

export const POSES: Array<{ id: PoseId; label: string; src: string; alt: string; say: string; right: string; bottom: string; width: string }> = [
  { id: 'sit', label: '마음에 쏙', src: asset('images/pose-sit.png'), alt: '하트를 띄우며 얌전히 앉아 있는 양말이', say: '이 소파 마음에 들어요 멍!', right: '20px', bottom: '10px', width: '116px' },
  { id: 'roll', label: '뒹굴뒹굴', src: asset('images/pose-roll.png'), alt: '러그 위에서 배를 보이며 뒹구는 양말이', say: '러그 위에서 뒹굴뒹굴~', right: '6px', bottom: '8px', width: '150px' },
  { id: 'run', label: '신나요', src: asset('images/pose-run.png'), alt: '새 가구를 보고 신나서 달려오는 양말이', say: '새 가구다! 구경할래요 멍!', right: '14px', bottom: '10px', width: '128px' },
  { id: 'wink', label: '완성 윙크', src: asset('images/pose-wink.png'), alt: '별을 띄우며 윙크하는 양말이', say: '꾸미기 완료! 최고예요 멍!', right: '12px', bottom: '8px', width: '128px' },
];

export const DECO_SPACES = ['실내', '마당', '개집'];

export type DecoCategory = 'all' | 'bed' | 'store' | 'plant' | 'wall';
export const DECO_CATEGORIES: Array<{ id: DecoCategory; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'bed', label: '쿠션·침대' },
  { id: 'store', label: '수납' },
  { id: 'plant', label: '식물' },
  { id: 'wall', label: '벽지·바닥' },
];

export type FurnitureKind = 'cushion' | 'cabinet' | 'plant' | 'lamp' | 'window' | 'crown';

export interface FurnitureDef {
  kind: FurnitureKind;
  name: string;
  category: Exclude<DecoCategory, 'all'> | 'etc';
  price?: number;
  currency?: 'coin' | 'heart';
  unlockLevel?: number;
}

export const FURNITURE: FurnitureDef[] = [
  { kind: 'cushion', name: '발바닥 방석', category: 'bed' },
  { kind: 'cabinet', name: '원목 수납장', category: 'store' },
  { kind: 'plant', name: '몬스테라 화분', category: 'plant', price: 600, currency: 'coin' },
  { kind: 'lamp', name: '스탠드 조명', category: 'etc', price: 800, currency: 'coin' },
  { kind: 'window', name: '아치 창문', category: 'wall', price: 60, currency: 'heart' },
  { kind: 'crown', name: '왕관 방석', category: 'bed', unlockLevel: 10 },
];

/** Treat spots on the walk minimap (percent of map). The first 7 start found, as in the design (7/12). */
export const TREATS: Array<{ id: number; x: number; y: number }> = [
  { id: 1, x: 12, y: 80 }, { id: 2, x: 22, y: 66 }, { id: 3, x: 34, y: 60 }, { id: 4, x: 8, y: 20 },
  { id: 5, x: 26, y: 18 }, { id: 6, x: 70, y: 12 }, { id: 7, x: 90, y: 8 },
  { id: 8, x: 79, y: 76 }, { id: 9, x: 62, y: 38 }, { id: 10, x: 88, y: 48 }, { id: 11, x: 44, y: 86 }, { id: 12, x: 16, y: 44 },
];
