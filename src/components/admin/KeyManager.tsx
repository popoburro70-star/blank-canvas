import * as React from "react";
import { z } from "zod";

import { adminLicenseApi, type LicenseKey } from "@/lib/adminLicenseApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const ValidDaysSchema = z.coerce.number().int().min(1).max(3650);

function fmt(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleString();
}

export function KeyManager() {
  const [keys, setKeys] = React.useState<LicenseKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [validDays, setValidDays] = React.useState<string>("30");
  const [note, setNote] = React.useState<string>("");
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await adminLicenseApi.listKeys());
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao carregar keys", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    const parsed = ValidDaysSchema.safeParse(validDays);
    if (!parsed.success) {
      toast({ title: "Valor inválido", description: "valid_days deve ser entre 1 e 3650", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const res = await adminLicenseApi.createKey(parsed.data, note.trim() || undefined);
      setCreatedKey(res.key);
      setKeys((prev) => [res.record, ...prev]);
      setNote("");
      setDialogOpen(true);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao criar key", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    try {
      const updated = await adminLicenseApi.revokeKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
      toast({ title: "Key revogada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao revogar", variant: "destructive" });
    }
  };

  const copyCreatedKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    toast({ title: "Copiado", description: "Key copiada para a área de transferência." });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[180px_1fr_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor="validDays">Dias válidos</Label>
          <Input id="validDays" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="note">Nota (opcional)</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex: Cliente X" />
        </div>
        <Button onClick={onCreate} disabled={creating}>Gerar key</Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Ativada em</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">Carregando…</TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">Nenhuma key.</TableCell>
              </TableRow>
            ) : (
              keys.map((k) => {
                const status = k.revoked_at ? "Revogada" : k.expires_at && new Date(k.expires_at).getTime() < Date.now() ? "Expirada" : "Ativa";
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{status}</TableCell>
                    <TableCell className="text-muted-foreground">{k.valid_days}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(k.first_activated_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(k.expires_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{k.note ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={Boolean(k.revoked_at)}
                        onClick={() => onRevoke(k.id)}
                      >
                        Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="border-border bg-popover text-popover-foreground">
          <DialogHeader>
            <DialogTitle className="font-gaming">Key gerada</DialogTitle>
            <DialogDescription>
              Esta é a única vez que a key aparece em texto. Copie e guarde com segurança.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input readOnly value={createdKey ?? ""} />
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={copyCreatedKey} disabled={!createdKey}>Copiar</Button>
              <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
