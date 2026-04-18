'use client';

import Image from 'next/image';

interface HandDrawnIconProps {
  type: 'flame' | 'shield' | 'target' | 'magnifier' | 'swords' | 'check';
  width?: number;
  height?: number;
  className?: string;
}

// 图标在雪碧图中的垂直位置（6等分）
const ICON_POSITIONS: Record<string, number> = {
  flame: 0,      // 第一个
  shield: 1,     // 第二个
  target: 2,     // 第三个
  magnifier: 3,  // 第四个
  swords: 4,     // 第五个
  check: 5,      // 第六个
};

export function HandDrawnIcon({ type, width = 40, height = 40, className = '' }: HandDrawnIconProps) {
  const index = ICON_POSITIONS[type];
  const totalIcons = 6;
  const iconHeight = 552 / totalIcons; // 假设原图高度 552px

  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{ width, height }}
    >
      <Image
        src="/hand-drawn-icons.png"
        alt={type}
        fill
        style={{
          objectPosition: `0 -${index * iconHeight}px`,
          objectFit: 'contain',
        }}
        className="pointer-events-none"
      />
    </div>
  );
}

// 独立的图标组件
export function FlameIcon({ className }: { className?: string }) {
  return <HandDrawnIcon type="flame" width={32} height={32} className={className} />;
}

export function ShieldIcon({ className }: { className?: string }) {
  return <HandDrawnIcon type="shield" width={32} height={32} className={className} />;
}

export function TargetIcon({ className }: { className?: string }) {
  return <HandDrawnIcon type="target" width={32} height={32} className={className} />;
}

export function MagnifierIcon({ className }: { className?: string }) {
  return <HandDrawnIcon type="magnifier" width={32} height={32} className={className} />;
}

export function SwordsIcon({ className }: { className?: string }) {
  return <HandDrawnIcon type="swords" width={48} height={48} className={className} />;
}

export function CheckIcon({ className }: { className?: string }) {
  return <HandDrawnIcon type="check" width={24} height={24} className={className} />;
}
