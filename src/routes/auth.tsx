import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GigLink" },
      {
        name: "description",
        content: "Sign in or create a GigLink account as an artist or an event organizer.",
      },
      { property: "og:title", content: "Sign in — GigLink" },
      {
        property: "og:description",
        content: "Access your GigLink artist or organizer dashboard.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupRole, setSignupRole] = useState<"artist" | "organizer">("artist");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      void navigate({
        to: role === "admin" ? "/admin" : role === "organizer" ? "/organizer" : "/dashboard",
      });
    }
  }, [loading, user, role, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || password.length < 8) {
      setError("Enter a valid email and a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName.trim(), role: signupRole },
          },
        });
        if (signUpError) throw signUpError;
        if (signUpData.session) {
          toast.success("Account created. You are signed in.");
        } else {
          toast.success(
            "Account created. Check your email and click the confirmation link to sign in.",
          );
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        toast.success("Welcome back.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message.includes("Invalid login") ? "Incorrect email or password." : message);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email above first, then click “Forgot password?”.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    toast.success("If that email has an account, a password reset link is on its way.");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="font-display text-3xl font-semibold">
        {mode === "signin" ? "Sign in to GigLink" : "Create your GigLink account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Artists find gigs. Organizers book them. One account for both sides of the stage.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md py-2 text-sm font-medium transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>I am joining as</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["artist", "organizer"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSignupRole(r)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm capitalize transition-colors",
                      signupRole === r
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface-2 text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === "signin" && (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
        )}

        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
