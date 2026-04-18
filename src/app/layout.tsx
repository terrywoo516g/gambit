import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Gambit - 国王的选择',
    template: '%s | Gambit',
  },
  description:
    '重要决定，不该只听一个 AI 的。Gambit 是一个让 AI 评审团把分歧摆在用户面前、由用户做最终决断的决策辅助产品。',
  keywords: [
    'AI决策',
    'AI评审团',
    '决策辅助',
    '多角度分析',
    'Gambit',
  ],
  authors: [{ name: 'Gambit Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
