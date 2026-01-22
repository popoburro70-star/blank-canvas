import * as React from "react";
import { z } from "zod";

import { adminLicenseApi, type LicenseUser } from "@/lib/adminLicenseApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Min 3")
  .max(32, "Max 32")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras/números . _ -");

export function UserManager() {
  const [users, setUsers] = React.useState<LicenseUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [username, setUsername] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminLicenseApi.listUsers();
      setUsers(list);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    const parsed = UsernameSchema.safeParse(username);
    if (!parsed.success) {
      toast({ title: "Usuário inválido", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const created = await adminLicenseApi.createUser(parsed.data);
      setUsers((prev) => [created, ...prev]);
      setUsername("");
      toast({ title: "Usuário criado", description: created.username });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao criar usuário", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (u: LicenseUser, enabled: boolean) => {
    try {
      const updated = await adminLicenseApi.setUserEnabled(u.id, enabled);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao atualizar", variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="username">Novo usuário (username)</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex: player_001"
          />
        </div>
        <Button onClick={onCreate} disabled={saving}>Adicionar</Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">Carregando…</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">Nenhum usuário.</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">{u.enabled ? "Liberado" : "Bloqueado"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Switch checked={u.enabled} onCheckedChange={(v) => onToggle(u, v)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
