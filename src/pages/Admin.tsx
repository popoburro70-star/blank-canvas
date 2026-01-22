import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSession } from "@/hooks/useSession";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManager } from "@/components/admin/UserManager";
import { KeyManager } from "@/components/admin/KeyManager";
import { ActivationsViewer } from "@/components/admin/ActivationsViewer";

export default function AdminPage() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);

  React.useEffect(() => {
    if (!loading && !user) nav("/auth", { replace: true });
  }, [loading, user, nav]);

  React.useEffect(() => {
    if (!loading && !roleLoading && user && !isAdmin) nav("/", { replace: true });
  }, [loading, roleLoading, user, isAdmin, nav]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    nav("/", { replace: true });
  };

  if (loading || roleLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle className="font-gaming">Carregando…</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-gaming text-2xl tracking-wider text-glow-gold">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários e licenças.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Voltar</Link>
            </Button>
            <Button variant="secondary" onClick={onLogout}>Sair</Button>
          </div>
        </header>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="font-gaming">Licenças</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users">
              <TabsList>
                <TabsTrigger value="users">Usuários</TabsTrigger>
                <TabsTrigger value="keys">Keys</TabsTrigger>
                <TabsTrigger value="activations">Ativações</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="mt-4">
                <UserManager />
              </TabsContent>
              <TabsContent value="keys" className="mt-4">
                <KeyManager />
              </TabsContent>
              <TabsContent value="activations" className="mt-4">
                <ActivationsViewer />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
