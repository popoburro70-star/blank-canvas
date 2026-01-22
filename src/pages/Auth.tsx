import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const AuthSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

type AuthValues = z.infer<typeof AuthSchema>;

export default function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useSession();

  const loginForm = useForm<AuthValues>({ resolver: zodResolver(AuthSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<AuthValues>({ resolver: zodResolver(AuthSchema), defaultValues: { email: "", password: "" } });

  React.useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [loading, user, nav]);

  const onLogin = async (v: AuthValues) => {
    const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    if (error) {
      toast({ title: "Falha no login", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Login OK", description: "Você entrou com sucesso." });
    nav("/", { replace: true });
  };

  const onSignup = async (v: AuthValues) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      toast({ title: "Falha no cadastro", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Cadastro criado",
      description: "Se o login não acontecer automaticamente, tente entrar na aba Login.",
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-gaming text-2xl tracking-wider text-glow-gold">Acesso</h1>
            <p className="text-sm text-muted-foreground">Entre para acessar o painel admin.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">Voltar</Link>
          </Button>
        </header>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="font-gaming">Login / Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form className="grid gap-4" onSubmit={loginForm.handleSubmit(onLogin)}>
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" autoComplete="email" {...loginForm.register("email")} />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" autoComplete="current-password" {...loginForm.register("password")} />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit">Entrar</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form className="grid gap-4" onSubmit={signupForm.handleSubmit(onSignup)}>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" autoComplete="email" {...signupForm.register("email")} />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" autoComplete="new-password" {...signupForm.register("password")} />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" variant="secondary">Criar conta</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
