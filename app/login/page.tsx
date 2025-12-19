"use client"

import type React from "react"
import { useState } from "react"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Image from "next/image"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isFirebaseConfigured =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      router.push("/")
    } catch (err: any) {
      setError(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-slate-700/10 shadow-xl flex flex-col items-center">
        <Image
          src="/fense-logo.png"
          alt="Fense Logo"
          width={150}
          height={150}
          className="mb-4"
        />
        <h1 className="text-2xl font-semibold text-foreground/40 mb-2">
          {isSignUp ? "Create an account" : "Sign in"}
        </h1>
        <p className="text-foreground/50 text-center mb-6">
          {isSignUp
            ? "Sign up to manage your questions and categories"
            : "Sign in to manage questions"}
        </p>

        {!isFirebaseConfigured && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/50 text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Firebase is not configured. Add the required environment variables in the{" "}
              <strong>Vars</strong> section of the sidebar.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <Alert className="bg-red-500/10 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className="w-full text-white transition-colors"
          >
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-foreground/50 hover:text-white transition-colors mt-2"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  )
}
