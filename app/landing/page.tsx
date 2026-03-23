import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import NewMeetingButton from "@/components/NewMeetingButton";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-900/90 to-emerald-800/90 backdrop-blur-sm flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <div className="w-6 h-6 bg-emerald-600 rounded-sm"></div>
          </div>
          <span className="text-white text-xl font-bold drop-shadow-sm">
            Meet.AI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/pricing"
            className="text-white hover:text-emerald-200 font-medium"
          >
            PRICING
          </Link>
          <Link
            href="/login"
            className="text-white hover:text-emerald-200 font-medium"
          >
            LOGIN
          </Link>
          <Link
            href="/signup"
            className="text-white hover:text-emerald-200 font-medium"
          >
            SIGNUP
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="px-6 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Create Agent Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text + Button */}
            <div className="space-y-8">
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                Discover And Generate Real-Time AI-Agents
              </h1>

              <p className="text-emerald-50 text-lg lg:text-xl leading-relaxed drop-shadow-sm">
                Talk to AI agents that understand, respond, and evolve with your
                needs.
              </p>

              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg"
                >
                  CREATE AGENT
                </Button>
              </Link>
            </div>

            {/* Right: Image */}
            <div className="flex justify-center">
              <Image
                src="/images/ai-human-chat.png"
                alt="AI agent chatting with human user"
                width={400}
                height={300}
                className="w-full max-w-md drop-shadow-xl"
                priority
              />
            </div>
          </div>

          {/* New Meeting Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mt-24">
            {/* Left: Text + Button */}
            <div className="space-y-8">
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                Schedule Your Meetings Instantly
              </h1>

              <p className="text-emerald-50 text-lg lg:text-xl leading-relaxed drop-shadow-sm">
                Set up and join real-time meetings effortlessly. Connect,
                collaborate, and discuss with others anytime, right from your
                browser.
              </p>

              <NewMeetingButton />
            </div>

            {/* Right: Image */}
            <div className="flex justify-center">
              <Image
                src="/images/meeting-schedule.png" // <-- add your meeting illustration here
                alt="Scheduling a meeting"
                width={400}
                height={300}
                className="w-full max-w-md drop-shadow-xl"
              />
            </div>
          </div>

          {/* Analytics Section */}
          <div className="mt-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-emerald-200 text-sm font-semibold tracking-wider uppercase drop-shadow-sm">
                    ANALYTICS
                  </p>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
                    Built-In Analytics
                  </h2>
                </div>

                <p className="text-emerald-50 text-lg leading-relaxed drop-shadow-sm">
                  Analytic features like call summary, transcript and much more.
                </p>

                <Link href="/pricing">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg"
                  >
                    PRICING
                  </Button>
                </Link>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/images/ChatGPT Image Sep 6, 2025, 11_11_05 PM.png"
                  alt="AI agent chatting with human user"
                  width={400}
                  height={300}
                  className="w-full max-w-md drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
