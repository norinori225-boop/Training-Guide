import { ListSkeleton } from '@/components/Skeletons';

// 「← ホーム」と見出しは layout が先に描くので、ここには含めない
export default function Loading() {
  return <ListSkeleton />;
}
