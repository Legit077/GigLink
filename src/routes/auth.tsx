import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Mic2, Users2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Join GigLink" },
      {
        name: "description",
        content:
          "Create a GigLink account as a band, a solo artist, or an event organizer / restaurant and start booking live music.",
      },
      { property: "og:title", content: "Sign In or Join GigLink" },
      {
        property: "og:description",
        content: "Join as a band, solo artist, or event organizer and start booking live music.",
      },
    ],
  }),
  component: AuthPage,
});

type AccountKind = "band" | "solo" | "organizer";

const accountOptions: { value: AccountKind; label: string; hint: string; icon: typeof Mic2 }[] = [
  { value: "band", label: "Band", hint: "A group performing together", icon: Users2 },
  { value: "solo", label: "Solo artist", hint: "You perform on your own", icon: Mic2 },
  {
    value: "organizer",
    label: "Restaurant / Event organizer",
    hint: "You host events and book artists",
    icon: Building2,
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [kind, setKind] = useState<AccountKind>("band");

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          role: kind === "organizer" ? "organizer" : "artist",
          artist_kind: kind === "organizer" ? null : kind,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Welcome to GigLink!");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your email to confirm your account.");
    }
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-4xl">Welcome to GigLink</h1>
      <p className="mt-2 text-muted-foreground">Book live music, or get booked.</p>

      <Tabs defaultValue="signup" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Create account</TabsTrigger>
          <TabsTrigger value="signin">Sign in</TabsTrigger>
        </TabsList>

        <TabsContent value="signup">
          <form onSubmit={signUp} className="mt-6 space-y-4 rounded-xl p-6 card-surface">
            <div className="space-y-2">
              <Label>I am a…</Label>
              <div className="grid gap-2">
                {accountOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setKind(o.value)}
                    className={
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors " +
                      (kind === o.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/60")
                    }
                  >
                    <o.icon className={"size-5 " + (kind === o.value ? "text-primary" : "text-muted-foreground")} />
                    <span>
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="name">
                {kind === "organizer" ? "Business / your name" : "Band or artist name"}
              </Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-stage text-primary-foreground hover:opacity-90"
            >
              Create account
            </Button>
            <GoogleButton onClick={googleSignIn} />
          </form>
        </TabsContent>

        <TabsContent value="signin">
          <form onSubmit={signIn} className="mt-6 space-y-4 rounded-xl p-6 card-surface">
            <div>
              <Label htmlFor="email2">Email</Label>
              <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password2">Password</Label>
              <Input
                id="password2"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-stage text-primary-foreground hover:opacity-90"
            >
              Sign in
            </Button>
            <GoogleButton onClick={googleSignIn} />
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      Continue with Google
    </Button>
  );
}