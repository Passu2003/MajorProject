import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
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
          <Link href="/signup" className="text-white hover:text-emerald-200 transition-colors">
            SIGNUP
          </Link>
        </nav>
      </div>

      {/* Login Form */}
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-emerald-600/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-emerald-100">Sign in to your Meet.AI account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" action="/dashboard">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-200"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Link href="/forgot-password" className="text-sm text-emerald-200 hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>

            <Link href="/dashboard">
              <Button
                type="button"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2"
              >
                Sign In
              </Button>
            </Link>
          </form>

          <div className="text-center">
            <p className="text-emerald-100">
              Don't have an account?{" "}
              <Link href="/signup" className="text-white font-semibold hover:text-emerald-200 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
