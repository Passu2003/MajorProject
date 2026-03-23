import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <div className="w-6 h-6 bg-emerald-600 rounded-sm"></div>
          </div>
          <span className="text-white text-xl font-bold">Meet.AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/login" className="text-white hover:text-emerald-200 transition-colors">
            LOGIN
          </Link>
          <Link href="/signup" className="text-white hover:text-emerald-200 transition-colors">
            SIGNUP
          </Link>
        </nav>
      </header>

      {/* Pricing Content */}
      <main className="px-6 lg:px-12 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-emerald-100 text-lg mb-12">Start with our free trial and upgrade when you're ready</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <Card className="bg-white/10 backdrop-blur-sm border-emerald-600/20">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Free Trial</CardTitle>
                <CardDescription className="text-emerald-100">Perfect for getting started</CardDescription>
                <div className="text-white">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-emerald-200">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>10 AI Agents</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>10 Meetings per month</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Basic analytics</span>
                  </div>
                </div>
                <Link href="/signup">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-white/10 backdrop-blur-sm border-emerald-400/40 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-400 text-emerald-900 px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-white text-2xl">Pro</CardTitle>
                <CardDescription className="text-emerald-100">For power users and teams</CardDescription>
                <div className="text-white">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-emerald-200">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Unlimited AI Agents</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Unlimited Meetings</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-100">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Priority support</span>
                  </div>
                </div>
                <Link href="/signup">
                  <Button className="w-full bg-emerald-400 hover:bg-emerald-300 text-emerald-900 font-semibold">
                    Upgrade to Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
