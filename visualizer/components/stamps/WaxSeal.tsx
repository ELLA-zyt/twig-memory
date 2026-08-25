import type { StampDefinition } from '../../../shared/stamps'

interface WaxSealProps {
  stamp: StampDefinition
  size?: number
  detail?: boolean
  className?: string
}

const EMBLEMS: Record<string, string> = {
  branch: `<g transform="translate(60,60) scale(0.88)" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-16,14 Q-6,4 8,-10" stroke-width="2"/><path d="M-6,4 Q-1,-3 4,1 Q-1,5 -6,4" fill="currentColor" opacity="0.8" stroke="none"/><path d="M0,-4 Q6,-12 12,-7 Q6,-3 0,-4" fill="currentColor" opacity="0.8" stroke="none"/><path d="M-12,-8 Q-2,0 12,10" stroke-width="1.5" opacity="0.6"/><path d="M-14,2 L-10,6 M-8,8 L-4,12 M-2,14 L2,18" stroke-width="1" opacity="0.4"/></g>`,
  fawn: `<g transform="translate(60,60) scale(0.86)" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-12,14 Q-14,2 -8,-6 Q-4,-12 6,-10 Q14,-6 12,4 Q10,12 2,14" stroke-width="1.8"/><path d="M-8,-6 L-12,-14 M6,-10 L10,-16" stroke-width="1.4"/><circle cx="-6" cy="-12" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="-14" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="-2" r="2" fill="currentColor" stroke="none"/><circle cx="-10" cy="-8" r="0.8" fill="currentColor" stroke="none" opacity="0.6"/><circle cx="12" cy="-8" r="0.8" fill="currentColor" stroke="none" opacity="0.6"/></g>`,
  raven: `<g transform="translate(60,60) scale(0.86)" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-20,-8 C-10,-20 10,-20 20,-8 C10,-2 0,12 0,24 C0,12 -10,-2 -20,-8 Z" stroke-width="2"/><circle cx="0" cy="-6" r="3.5" fill="currentColor" stroke="none"/><circle cx="0" cy="18" r="5" stroke-width="1.5"/><line x1="0" y1="13" x2="0" y2="23" stroke-width="1.5"/><line x1="-6" y1="18" x2="6" y2="18" stroke-width="1.5"/><line x1="0" y1="-16" x2="0" y2="-20" stroke-width="1.2"/><line x1="-5" y1="-6" x2="-10" y2="-6" stroke-width="1.2"/><line x1="5" y1="-6" x2="10" y2="-6" stroke-width="1.2"/></g>`,
  spark: `<g transform="translate(60,60) scale(0.9)" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><circle cx="0" cy="0" r="12" opacity="0.3" stroke-width="1"/><circle cx="0" cy="0" r="18" opacity="0.15" stroke-width="0.8"/><circle cx="-8" cy="-3" r="4" fill="currentColor" stroke="none"/><circle cx="8" cy="3" r="4" fill="currentColor" stroke="none"/><line x1="-3" y1="-1" x2="3" y2="1" stroke-width="3" stroke-linecap="round"/><line x1="-3" y1="1" x2="3" y2="-1" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none"/></g>`,
  tide: `<g transform="translate(60,60) scale(0.9)" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M-10,-2 A12,12 0 0,0 10,-2 A10,10 0 0,1 -10,-2" fill="currentColor" opacity="0.85" stroke="none"/><path d="M-24,8 Q-12,13 0,8 Q12,3 24,8" opacity="0.45" stroke-width="1.2"/><path d="M-20,14 Q-10,18 0,14 Q10,10 20,14" opacity="0.25" stroke-width="1"/><path d="M-16,20 Q-8,23 0,20 Q8,17 16,20" opacity="0.15" stroke-width="0.8"/></g>`,
  kintsugi: `<g transform="translate(60,60) scale(0.9)" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-16,-12 L-8,-2 L-10,6 L-2,10 L0,20" stroke-width="2.2"/><circle cx="0" cy="20" r="4" fill="currentColor" opacity="0.95" stroke="none"/><line x1="0" y1="16" x2="0" y2="10" stroke-width="1.2"/><line x1="-4" y1="20" x2="-8" y2="20" stroke-width="1"/><line x1="4" y1="20" x2="8" y2="20" stroke-width="1"/><line x1="-3" y1="17" x2="-6" y2="14" stroke-width="1"/><line x1="3" y1="17" x2="6" y2="14" stroke-width="1"/><circle cx="-2" cy="14" r="1" fill="currentColor" stroke="none" opacity="0.7"/><circle cx="3" cy="16" r="0.8" fill="currentColor" stroke="none" opacity="0.6"/></g>`,
  dew: `<g transform="translate(60,60) scale(0.88)" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M0,-14 Q8,-4 8,6 Q8,16 0,20 Q-8,16 -8,6 Q-8,-4 0,-14 Z" fill="currentColor" opacity="0.85" stroke="none"/><path d="M-4,2 Q0,6 4,2" stroke-width="1.5"/><circle cx="-3" cy="-4" r="1.2" fill="currentColor" stroke="none" opacity="0.7"/><circle cx="5" cy="0" r="0.9" fill="currentColor" stroke="none" opacity="0.5"/></g>`,
  ember: `<g transform="translate(60,60) scale(0.88)" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M-8,14 Q0,20 8,14 Q12,4 6,-8 Q0,-18 -6,-8 Q-12,4 -8,14 Z" fill="currentColor" opacity="0.85" stroke="none"/><path d="M-2,8 Q2,8 2,4 Q2,0 -2,0 Q-6,0 -6,4 Q-6,8 -2,8 Z" fill="currentColor" opacity="0.5" stroke="none"/><path d="M-10,-2 Q-6,-6 0,-6 Q6,-6 10,-2" stroke-width="1.2" opacity="0.6"/></g>`,
}

export default function WaxSeal({ stamp, size = 64, detail = false, className }: WaxSealProps) {
  const bf = detail ? 0.055 : 0.07
  const no = size <= 32 ? 1 : (detail ? 3 : 2)
  const sc = detail ? 2.0 : 2.5
  const fs = detail ? 7.0 : 5.4
  const sw = detail ? 2.0 : 1.5
  const id = `wax-${stamp.id}-${size}-${detail ? 'd' : 's'}`
  const emblem = EMBLEMS[stamp.id] ?? ''

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible', willChange: 'filter', filter: `drop-shadow(0 ${detail ? 10 : 3}px ${detail ? 20 : 6}px rgba(0,0,0,${detail ? 0.4 : 0.2}))` }}
    >
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency={bf} numOctaves={no} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={sc} />
        </filter>
      </defs>
      <path
        d="M60,6 C75,5 92,12 103,24 C114,36 116,54 113,70 C110,87 99,103 84,111 C68,118 49,116 34,109 C18,102 7,86 6,69 C4,51 13,33 25,20 C36,8 46,6 60,6 Z"
        fill={stamp.baseColor}
        filter={`url(#${id})`}
        opacity={0.96}
      />
      <circle cx="60" cy="60" r="44" stroke="rgba(255,255,255,0.14)" strokeWidth={sw} fill="none" />
      <circle cx="60" cy="60" r="41" stroke="rgba(0,0,0,0.22)" strokeWidth={sw * 0.6} fill="none" />
      <path id={`cp-${id}`} d="M 23,60 A 37,37 0 1,1 97,60 A 37,37 0 1,1 23,60" fill="none" />
      <text
        fontSize={fs}
        fontFamily="Georgia, serif"
        fill={stamp.rimColor}
        letterSpacing={detail ? 2.6 : 2.2}
        opacity={0.88}
      >
        <textPath href={`#cp-${id}`} startOffset="50%" textAnchor="middle">
          {stamp.motto}
        </textPath>
      </text>
      <g style={{ color: stamp.emblemColor }} dangerouslySetInnerHTML={{ __html: emblem }} />
    </svg>
  )
}
