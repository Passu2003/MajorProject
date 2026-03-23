import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 flex items-center justify-center p-6">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 lg:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <div className="w-6 h-6 bg-emerald-600 rounded-sm"></div>
          </div>
          <span className="text-white text-xl font-bold">Meet.AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/pricing" className="text-white hover:text-emerald-200 transition-colors">
            PRICING
          </Link>
          <Link href="/login" className="text-white hover:text-emerald-200 transition-colors">
            LOGIN
          </Link>
        </nav>
      </div>

      {/* Signup Form */}
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-emerald-600/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
          <CardDescription className="text-emerald-100">Join Meet.AI and start creating AI agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" action="/dashboard">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
              />
            </div>

            <Link href="/dashboard">
              <Button
                type="button"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2"
              >
                Create Account
              </Button>
            </Link>
          </form>

          <div className="text-center">
            <p className="text-emerald-100">
              Already have an account?{" "}
              <Link href="/login" className="text-white font-semibold hover:text-emerald-200 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
