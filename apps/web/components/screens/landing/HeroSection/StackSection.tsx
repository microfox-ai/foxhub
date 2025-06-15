'use client';
import StackList from './Stack';
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards';
import media from '@/styles/media';
import { stacks } from './StackData';
import { useMediaQuery } from '@mui/material';
const StackSection = () => {
  const isMobile = useMediaQuery(media.largeMobile);
  const visibleStacks = isMobile
    ? stacks.slice(0, Math.ceil(stacks.length / 3))
    : stacks;

  const midpoint = Math.ceil(visibleStacks.length / 2);
  const firstHalf = visibleStacks.slice(0, midpoint);
  const secondHalf = visibleStacks.slice(midpoint);
  return (
    <section className="flex flex-col items-center justify-center pb-8">
      <InfiniteMovingCards
        items={<StackList data={firstHalf} />}
        speed="slow"
        direction="left"
        pauseOnHover={false}
      />
      {/* <InfiniteMovingCards
        items={<StackList data={secondHalf} />}
        speed="slow"
        direction="right"
        pauseOnHover={false}
      /> */}
    </section>
  );
};

export default StackSection;
