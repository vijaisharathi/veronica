"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      // In production with Clerk, user is redirected through Clerk session or SignIn component.
      // For development verification, simulated or client session redirection proceeds to /account.
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/account");
    } catch {
      setErrorMessage("Unable to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50/50 dark:bg-neutral-950">
      <div className="w-full max-w-md space-y-8 bg-background border border-border/80 p-8 sm:p-10 shadow-elevated rounded-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Privilege & Access
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
            Sign In to VÉRONA
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Access your curated wardrobe, order history, and bespoke luxury concierge.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <Alert variant="error" className="text-xs">
            {errorMessage}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground tracking-wide block">
              Email Address
            </label>
            <div className="relative">
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 text-xs"
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground tracking-wide block">
                Password
              </label>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 pr-9 text-xs"
              />
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full justify-center text-xs tracking-wider uppercase font-medium h-11"
            isLoading={isLoading}
          >
            Sign In to Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {/* Footer / Switch to Signup */}
        <div className="pt-4 border-t border-border/60 text-center">
          <p className="text-xs text-muted-foreground">
            Don&apos;t have a VÉRONA profile?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground hover:underline underline-offset-4 transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
