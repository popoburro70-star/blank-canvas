import * as React from "react";

import { adminLicenseApi, type LicenseActivation } from "@/lib/adminLicenseApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

function fmt(ts: string) {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleString();
}

export function ActivationsViewer() {
  const [rows, setRows] = React.useState<LicenseActivation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [username, setUsername] = React.useState("");
  const [key, setKey] = React.useState("");

  const load = React.useCallback(async (params?: { username?: string; key?: string }) => {
    setLoading(true);
    try {
      setRows(await adminLicenseApi.listActivations(params));
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message ?? "Falha ao carregar ativações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onSearch = async () => {
    await load({ username, key });
  };

  const onClear = async () => {
    setUsername("");
    setKey("");
    await load();
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor="search-username">Buscar por username</Label>
          <Input
            id="search-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex: player_001"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="search-key">Buscar por key (ID)</Label>
          <Input
            id="search-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="UUID da key"
          />
        </div>
        <Button onClick={onSearch} disabled={loading}>
          Buscar
        </Button>
        <Button variant="outline" onClick={onClear} disabled={loading}>
          Limpar
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>HWID</TableHead>
              <TableHead>Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Nenhuma ativação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.license_key_id}</TableCell>
                  <TableCell className="font-medium">{r.username ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.hwid_hash}</TableCell>
                  <TableCell className="text-muted-foreground">{fmt(r.last_seen_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
