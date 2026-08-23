import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';
import { DotWave } from './DotWave';

// ── The Decode ─────────────────────────────────────────────────────
// Inline processing on ink. Finnish glyphs churn, then resolve letter by
// letter into English. Source: "Opas Motion — Loaders.dc.html".

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖ0123456789#/';
const DEFAULT_PAIRS: [string, string][] = [
  ['VEROTUS', 'TAXATION'],
  ['KELA-TUKI', 'BENEFIT'],
  ['MUUTOKSENHAKU', 'APPEAL'],
  ['ERÄPÄIVÄ', 'DUE DATE'],
  ['OLESKELULUPA', 'RESIDENCE'],
];

function rand(target: string, solved: number) {
  return target
    .split('')
    .map((ch, i) => (ch === ' ' ? ' ' : i < solved ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
    .join('');
}

interface DecodeScrambleProps {
  pairs?: [string, string][];
  label?: string;
}

export function DecodeScramble({ pairs = DEFAULT_PAIRS, label = 'Translating' }: DecodeScrambleProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const [fi, setFi] = useState(pairs[0][0]);
  const [en, setEn] = useState(pairs[0][1]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (reduced) {
      setFi(pairs[0][0]);
      setEn(pairs[0][1]);
      return;
    }
    let pi = 0;
    const push = (t: ReturnType<typeof setTimeout>) => timers.current.push(t);

    const reveal = (fiT: string, enT: string, done: () => void) => {
      const total = Math.max(fiT.length, enT.length);
      let step = 0;
      const run = () => {
        const solved = Math.floor(step / 3);
        setFi(rand(fiT, solved));
        setEn(rand(enT, solved));
        step++;
        if (solved <= total) push(setTimeout(run, 45));
        else {
          setFi(fiT);
          setEn(enT);
          done();
        }
      };
      run();
    };

    const tick = () => {
      const [f, e] = pairs[pi];
      reveal(f, e, () => {
        push(
          setTimeout(() => {
            pi = (pi + 1) % pairs.length;
            tick();
          }, 1500),
        );
      });
    };
    tick();
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduced, pairs]);

  return (
    <View className="items-center gap-4">
      <Text className="font-body font-semibold text-[9px] tracking-[0.24em] uppercase text-muted">{label}</Text>
      <Text className="font-mono text-[26px] tracking-[0.04em]" style={{ color: c.warning }}>
        {fi}
      </Text>
      <Svg width={20} height={26} viewBox="0 0 20 26" fill="none" opacity={0.5}>
        <Path d="M10 2 V22 M10 22 L4 16 M10 22 L16 16" stroke={c.muted} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
      <Text className="font-mono text-[26px] tracking-[0.04em]" style={{ color: c.fg }}>
        {en}
      </Text>
      {!reduced && <DotWave color={c['fg-soft']} />}
    </View>
  );
}
