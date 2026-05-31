"use client";

import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { Chrome, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, loginWithGoogle, register } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  function persistSession(response: Awaited<ReturnType<typeof login>>) {
    window.localStorage.setItem("convertpro_token", response.access_token);
    window.localStorage.setItem("convertpro_user", JSON.stringify(response.user));
    router.push("/dashboard");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = mode === "login" ? await login(email, password) : await register(name, email, password);
      persistSession(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential?: string) {
    if (!credential) {
      setMessage("Google did not return a credential.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await loginWithGoogle(credential);
      persistSession(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {mode === "login" ? "Welcome back" : "Create account"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">
            {mode === "login" ? "Login to ConvertPro" : "Start converting securely"}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Access conversion history, plan usage, and secure downloads from one dashboard.
          </p>
        </div>

        <Card className="bg-white shadow-soft">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={submit} className="space-y-5">
              {mode === "register" && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="mt-2" />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-2" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="mt-2"
                />
              </div>

              {message && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{message}</div>}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {mode === "login" ? "Login" : "Register"}
              </Button>

              {googleEnabled ? (
                <div className="flex min-h-11 justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => handleGoogleCredential(credentialResponse.credential)}
                    onError={() => setMessage("Google login failed")}
                  />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => setMessage("Set GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google Login.")}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  Continue with Google
                </Button>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <Link href="#" className="hover:text-foreground">
                  Forgot Password
                </Link>
                {mode === "login" ? (
                  <Link href="/register" className="font-medium text-primary">
                    Create account
                  </Link>
                ) : (
                  <Link href="/login" className="font-medium text-primary">
                    Login instead
                  </Link>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
