"use client";

import dynamic from 'next/dynamic';

const MeetingRoom = dynamic(() => import('./MeetingRoom'), { 
  ssr: false, 
  loading: () => <div className="w-screen h-[100dvh] bg-neutral-900 flex items-center justify-center text-white font-medium animate-pulse">Initializing Media Engine...</div>
});

export default function MeetingPage() {
    return <MeetingRoom />;
}
