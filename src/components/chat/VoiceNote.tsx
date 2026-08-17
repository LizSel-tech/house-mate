'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceNote({ src, mine }: { src: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  };

  const ratio = duration > 0 ? Math.min(1, progress / duration) : 0;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          mine ? 'bg-white/20 text-white' : 'bg-primary text-primary-foreground'
        }`}
      >
        <Icon name={playing ? 'PauseIcon' : 'PlayIcon'} size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1.5 rounded-full overflow-hidden ${mine ? 'bg-white/25' : 'bg-foreground/15'}`}>
          <div
            className={`h-full rounded-full ${mine ? 'bg-white' : 'bg-primary'}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <p className={`text-[10px] mt-1 tabular-nums ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
          {formatClock(progress)} / {formatClock(duration)}
        </p>
      </div>
    </div>
  );
}
