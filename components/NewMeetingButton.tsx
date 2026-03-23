"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NewMeetingButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/login")} // navigate to login page
      size="lg"
      className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg"
    >
      NEW MEETING
    </Button>
  );
}
