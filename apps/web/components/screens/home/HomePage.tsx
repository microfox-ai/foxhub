'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Lexend_Deca } from 'next/font/google';
import { ArrowUpRight, Clapperboard, Cpu } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppButton } from '@/components/screens/landing/Header/AppButton';

// Microfox brand kit (pack-brand-kit, brands/microfox): the faceted fox, palette and type; logo files in /public/brand
const lexendDeca = Lexend_Deca({ subsets: ['latin'], weight: ['400', '600', '700'] });

const C = {
  fox: '#f28b2a',
  ember: '#c4621f',
  rust: '#8a4520',
  honey: '#f7d397',
  cream: '#faead4',
  paper: '#fff8ef',
  ink: '#28292a',
};

const PROJECTS = [
  {
    name: 'MediaMake',
    href: 'https://mediamake.microfox.app',
    host: 'mediamake.microfox.app',
    icon: Clapperboard,
    text: 'Turn JSON into videos: timelines, presets, captions and renders, made by you or by your agents.',
  },
  {
    name: 'Workers',
    href: 'https://docs.microfox.app/ai-router/overview/workers',
    host: 'docs.microfox.app',
    icon: Cpu,
    text: 'Run long AI jobs in the background: queued, retried and reported back to your app when they are done.',
  },
];

// Loose facets in the fox's own colours, floating around the hero fox
const FACETS = [
  { points: '0,100 50,0 100,100', fill: C.fox, x: 4, y: 14, size: 34, drift: 10, delay: 0 },
  { points: '0,0 100,30 30,100', fill: C.honey, x: 86, y: 8, size: 28, drift: 14, delay: 0.4 },
  { points: '0,60 100,0 70,100', fill: C.ember, x: 90, y: 64, size: 22, drift: 8, delay: 0.8 },
  { points: '20,0 100,80 0,100', fill: C.cream, x: 0, y: 72, size: 40, drift: 12, delay: 0.2 },
  { points: '0,0 100,0 50,100', fill: C.fox, x: 70, y: 92, size: 18, drift: 9, delay: 0.6 },
];

const ConsoleButton = ({ size = 'md' }: { size?: 'md' | 'lg' }) => {
  const { handleButtonClick } = useAppButton();
  const { initializingUser } = useAuth();
  return (
    <button
      onClick={handleButtonClick}
      disabled={initializingUser}
      className={`rounded-full font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#8a4520] disabled:opacity-60 ${
        size === 'lg' ? 'px-8 py-4 text-lg' : 'px-5 py-2.5 text-sm'
      }`}
      style={{ background: C.ember }}
    >
      Console
    </button>
  );
};

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

export const HomePage = () => (
  <div className={`${lexendDeca.className} min-h-dvh`} style={{ background: C.paper, color: C.ink }}>
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Image src="/brand/microfox-lockup.svg" alt="Microfox" width={156} height={65} priority />
      <ConsoleButton />
    </header>

    <main className="mx-auto max-w-6xl px-6">
      <section className="grid items-center gap-12 py-12 md:grid-cols-[1.15fr_1fr] md:py-20">
        <div>
          <motion.p {...rise(0)} className="mb-5 text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: C.ember }}>
            Microfox
          </motion.p>
          <motion.h1 {...rise(0.1)} className="text-5xl font-bold leading-[1.08] md:text-7xl">
            Small tools,{' '}
            <span style={{ color: C.ember }}>clever</span>{' '}
            results.
          </motion.h1>
          <motion.p {...rise(0.2)} className="mt-6 max-w-xl text-lg leading-relaxed opacity-80 md:text-xl">
            Microfox builds focused tools that do big jobs: making media from code, and running AI work in the background.
          </motion.p>
          <motion.div {...rise(0.3)} className="mt-10">
            <ConsoleButton size="lg" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          <div
            className="absolute inset-[8%] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${C.honey} 0%, ${C.cream} 55%, transparent 75%)` }}
          />
          {FACETS.map(({ points, fill, x, y, size, drift, delay }, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 100 100"
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: [0, -drift, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.5 + delay },
                y: { duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay },
              }}
            >
              <polygon points={points} fill={fill} />
            </motion.svg>
          ))}
          <motion.div
            className="absolute inset-[10%]"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src="/brand/microfox-mark.svg" alt="The Microfox fox" fill priority className="object-contain" />
          </motion.div>
        </motion.div>
      </section>

      <section className="pb-24 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: C.ember }}>
          Projects
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {PROJECTS.map(({ name, href, host, icon: Icon, text }, i) => (
            <motion.a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...rise(0.35 + i * 0.1)}
              className="group relative flex flex-col rounded-[28px] border-2 p-8 transition-all duration-200 hover:-translate-y-1"
              style={{ background: C.cream, borderColor: C.cream }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.fox)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.cream)}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: C.fox }}>
                  <Icon className="h-7 w-7" color={C.ink} strokeWidth={2.2} />
                </span>
                <ArrowUpRight
                  className="h-7 w-7 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1"
                  color={C.ember}
                />
              </div>
              <h3 className="mt-8 text-3xl font-bold">{name}</h3>
              <p className="mt-3 text-base leading-relaxed opacity-80">{text}</p>
              <span className="mt-6 text-sm font-semibold" style={{ color: C.rust }}>
                {host}
              </span>
            </motion.a>
          ))}
        </div>
      </section>
    </main>

    <footer className="border-t" style={{ borderColor: C.cream }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm opacity-70">
        <Image src="/brand/microfox-mark.svg" alt="" width={29} height={32} />
        <span>© {new Date().getFullYear()} Microfox</span>
      </div>
    </footer>
  </div>
);
