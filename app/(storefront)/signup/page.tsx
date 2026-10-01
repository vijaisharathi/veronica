"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreeTerms) {
      setErrorMessage("Please accept the Terms of Service and Privacy Policy to proceed.");
      return;
    }

    if (!email || !password || !firstName || !lastName) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/account");
    } catch {
      setErrorMessage("Unable to create account. Please check your information and try again.");
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
            Bespoke Membership
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
            Join the World of VÉRONA
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Experience exclusive couture drops, private showroom previews, and personalized curation.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <Alert variant="error" className="text-xs">
            {errorMessage}
          </Alert>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground tracking-wide block">
                First Name
              </label>
              <div className="relative">
                <Input
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  placeholder="Aria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="pl-9 text-xs"
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground tracking-wide block">
                Last Name
              </label>
              <Input
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder="Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground tracking-wide block">
              Email Address
            </label>
            <div className="relative">
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="aria.sharma@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 text-xs"
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground tracking-wide block">
              Create Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
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

          <div className="pt-2">
            <Checkbox
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              label="I agree to the VÉRONA Terms of Service and Privacy Policy"
            />
          </div>

          <Button
            type="submit"
            className="w-full justify-center text-xs tracking-wider uppercase font-medium h-11"
            isLoading={isLoading}
          >
            Create My Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {/* Footer / Switch to Login */}
        <div className="pt-4 border-t border-border/60 text-center">
          <p className="text-xs text-muted-foreground">
            Already have a VÉRONA account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground hover:underline underline-offset-4 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
