import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconLink, Screen, TopBar } from '../components/ui';
import { useToast } from '../components/Toast';
import { BallIcon, BoneIcon, CloseIcon, CornerOrnament, HeartIcon, SparkleIcon, StarIcon } from '../components/icons';
import { growthStage, useGame } from '../game/state';
import { ROUTES } from '../routes';
import { asset } from '../lib/asset';

function UnlockCard({ icon, title, sub, color }: { icon: ReactNode; title: string; sub: string; color: string }) {
  return (
    <div className="unlock">
      <CornerOrnament className="tl" />
      <CornerOrnament className="tr" />
      <CornerOrnament className="bl" />
      <CornerOrnament className="br" />
      {icon}
      <div>
        <b style={{ color }}>{title}</b>
        <small>{sub}</small>
      </div>
    </div>
  );
}

/** M2 레벨업·진화 — shows the latest level up; with none pending it shows the design's Lv.4 evolution. */
export default function LevelUpScreen() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const toast = useToast();
  const to = state.levelUp?.to ?? 4;
  const from = state.levelUp?.from ?? 3;
  const before = growthStage(from);
  const after = growthStage(to);
  const evolved = before.name !== after.name;

  const close = () => {
    dispatch({ type: 'clearLevelUp' });
    navigate(ROUTES.home);
  };

  return (
    <Screen className="levelup">
      <TopBar
        right={
          <IconLink to={ROUTES.home} label="닫기">
            <CloseIcon />
          </IconLink>
        }
      >
        <div className="levelup-pill">
          <StarIcon size={18} color="#FFD24D" />
          <span>레벨업!</span>
        </div>
      </TopBar>

      <h1 className="pop">Lv.{to}로 성장했어요!</h1>

      <div className="stage grow evolve">
        <img className="cover" src={asset('images/room.png')} alt="" aria-hidden="true" />
        <div className="veil" aria-hidden="true" />
        <div className="glow" aria-hidden="true" />
        <SparkleIcon size={22} style={{ left: 40, top: 210 }} />
        <SparkleIcon size={16} style={{ right: 46, top: 240 }} />
        <SparkleIcon size={26} color="#FFFFFF" style={{ right: 34, bottom: 120 }} />
        <SparkleIcon size={14} style={{ left: 58, bottom: 90 }} />
        <HeartIcon size={24} color="#F08A8A" strokeWidth={1.5} className="spark" style={{ right: 64, top: 300 }} />
        <HeartIcon size={18} color="#F08A8A" strokeWidth={1.5} className="spark" style={{ left: 66, top: 330 }} />

        <div className="inner">
          {evolved && (
            <>
              <div className="before">
                <img src={before.img} alt={`진화 전, ${before.age} ${before.name}`} />
                <span>
                  진화 전 · {before.name} · {before.age}
                </span>
              </div>
              <svg width="40" height="46" viewBox="0 0 40 46" aria-hidden="true" style={{ margin: '6px 0' }}>
                <path d="M20 4v30M8 24l12 14 12-14" fill="none" stroke="#E89B3C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 4v30M8 24l12 14 12-14" fill="none" stroke="#FFF7EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
          <div className="after">
            <img src={after.img} alt={`${evolved ? '진화 후, ' : ''}${after.age} ${after.name}`} />
            <span className="name">
              {after.name} · {after.age}
            </span>
            <span className="say">{evolved ? '에너지가 넘치고, 놀고 탐험하는 걸 좋아해요!' : '한 뼘 더 자랐어요! 다음 진화까지 힘내요'}</span>
          </div>
        </div>
      </div>

      <div className="unlocks">
        <span>새로 열린 콘텐츠</span>
        <div className="grid">
          <UnlockCard icon={<BallIcon size={34} />} title="공놀이 챌린지" sub="신나게 놀기" color="#36679A" />
          <UnlockCard icon={<BoneIcon />} title="간식 찾기" sub="냄새로 찾기" color="#467A2A" />
        </div>
      </div>

      <div className="pair">
        <Button variant="paper" size="lg" onClick={() => toast('성장 사진을 앨범에 저장했어요')}>
          성장 사진 저장
        </Button>
        <Button size="lg" onClick={close}>
          확인
        </Button>
      </div>
    </Screen>
  );
}
