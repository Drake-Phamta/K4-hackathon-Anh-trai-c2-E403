import { TutorWorkspace } from '@/components/TutorWorkspace';

export default async function WildPage({
  searchParams,
}: {
  searchParams: Promise<{ voice?: string | string[] }>;
}) {
  const raw = (await searchParams).voice;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return <TutorWorkspace variant="wild" voiceProbe={value === 'probe'} />;
}
