import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLink, Meter, Screen } from '../components/ui';
import { useToast } from '../components/Toast';
import { BallIcon, BoneIcon, BowlIcon, CheckIcon, CloseIcon, GiftIcon, HeartIcon, HouseIcon, MissionIcon, SparkleIcon, StarIcon } from '../components/icons';
import { missionViews, rewardText, type MissionIcon as Kind, type MissionStatus } from '../game/missions';
import { buzz } from '../game/hooks';
import { playSound } from '../game/sound';
import { fmt, useGame } from '../game/state';
import { ROUTES } from '../routes';

const ICONS: Record<Kind, ReactNode> = {
  bowl: <BowlIcon size={26} />,
  star: <StarIcon size={26} />,
  ball: <BallIcon size={26} />,
  bone: <BoneIcon size={28} />,
  heart: <HeartIcon size={24} />,
  house: <HouseIcon size={26} door />,
  gift: <GiftIcon size={26} />,
  level: <SparkleIcon size={26} color="#E89B3C" />,
};

const ORDER: Record<MissionStatus, number> = { claimable: 0, progress: 1, claimed: 2 };

/** 미션 — long-term goals with one-time rewards. A sheet over the room, like the to-do list. */
export default function MissionsScreen() {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const navigate = useNavigate();
  const missions = missionViews(state).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const done = missions.filter((m) => m.status === 'claimed').length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(ROUTES.home);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <Screen className="todo missions">
      <div className="backdrop" aria-hidden="true" onClick={() => navigate(ROUTES.home)}>
        <img src="/images/room.png" alt="" />
      </div>

      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="missions-title">
        <div className="grip" />
        <div className="sheet-head">
          <div className="label">
            <MissionIcon size={20} />
            <h2 id="missions-title">미션</h2>
          </div>
          <IconLink to={ROUTES.home} label="닫기">
            <CloseIcon />
          </IconLink>
        </div>
        <div className="sheet-sub">
          <b>
            {done} / {missions.length} 달성
          </b>
          <span>한 번씩만 받을 수 있는 특별 보상이에요</span>
        </div>

        <ul className="mission-list">
          {missions.map((m) => (
            <li key={m.id} className={`mission ${m.status}`}>
              <span className="disc" aria-hidden="true">
                {ICONS[m.icon]}
              </span>
              <div className="body">
                <b>{m.title}</b>
                <span className="desc">{m.desc}</span>
                <div className="bar">
                  <Meter value={(m.current / m.goal) * 100} label={`${m.title} 진행`} valueText={`${fmt(m.current)} / ${fmt(m.goal)}`} color="var(--green)" />
                  <span className="count">
                    {fmt(m.current)} / {fmt(m.goal)}
                  </span>
                </div>
                <span className="reward">{rewardText(m.reward)}</span>
              </div>
              {m.status === 'claimed' ? (
                <span className="got" aria-label="받음">
                  <CheckIcon size={16} color="#467A2A" strokeWidth={3.4} />
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary claim"
                  disabled={m.status !== 'claimable'}
                  aria-label={m.status === 'claimable' ? `${m.title} 보상 받기` : `${m.title} 진행 중`}
                  onClick={() => {
                    dispatch({ type: 'claimMission', id: m.id });
                    buzz(30);
                    playSound('reward');
                    toast(`"${m.title}" 달성! ${rewardText(m.reward)}`);
                  }}
                >
                  받기
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
