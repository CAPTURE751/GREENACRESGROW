import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, Pencil, Plus, FileSignature } from "lucide-react";
import { CONTRACT_TEMPLATES, ContractData, exportContractPDF, loadContracts, saveContracts } from "@/lib/contracts";
import { formatKES } from "@/lib/currency";

const blank = (templateId = "land-lease"): ContractData => {
  const t = CONTRACT_TEMPLATES.find((x) => x.id === templateId)!;
  return {
    id: crypto.randomUUID(), templateId, title: t.name,
    partyA: "", partyAId: "", partyAContact: "", partyB: "", partyBId: "", partyBContact: "",
    subject: "", startDate: new Date().toISOString().slice(0, 10), endDate: "",
    amount: 0, paymentTerms: "", clauses: t.clauses, witness: "", createdAt: new Date().toISOString(),
  };
};

export default function Contracts() {
  const { toast } = useToast();
  const [list, setList] = useState<ContractData[]>(loadContracts);
  const [form, setForm] = useState<ContractData>(blank());
  const t = CONTRACT_TEMPLATES.find((x) => x.id === form.templateId)!;
  const set = (k: keyof ContractData, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const persist = (next: ContractData[]) => { setList(next); saveContracts(next); };
  const save = () => {
    const exists = list.some((c) => c.id === form.id);
    persist(exists ? list.map((c) => (c.id === form.id ? form : c)) : [form, ...list]);
    toast({ title: "Contract saved" });
  };
  const download = async (c: ContractData) => {
    try { await exportContractPDF(c); toast({ title: "PDF downloaded" }); }
    catch (e: any) { toast({ title: "PDF failed", description: e?.message, variant: "destructive" }); }
  };

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6" /> Contracts</h1>
            <p className="text-muted-foreground text-sm">Create farm agreements and download them as branded PDFs.</p>
          </div>
          <Button variant="outline" onClick={() => setForm(blank())}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Contract details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Contract type</Label>
                  <Select value={form.templateId} onValueChange={(v) => {
                    const nt = CONTRACT_TEMPLATES.find((x) => x.id === v)!;
                    setForm((f) => ({ ...f, templateId: v, title: nt.name, clauses: nt.clauses }));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTRACT_TEMPLATES.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
              </div>

              {(["A", "B"] as const).map((p) => (
                <div key={p} className="grid gap-3 md:grid-cols-3 rounded-md border p-3">
                  <div><Label>{p === "A" ? t.partyALabel : t.partyBLabel}</Label>
                    <Input value={form[`party${p}`]} onChange={(e) => set(`party${p}`, e.target.value)} /></div>
                  <div><Label>ID / Reg No</Label>
                    <Input value={form[`party${p}Id`]} onChange={(e) => set(`party${p}Id`, e.target.value)} /></div>
                  <div><Label>Phone / Contact</Label>
                    <Input value={form[`party${p}Contact`]} onChange={(e) => set(`party${p}Contact`, e.target.value)} /></div>
                </div>
              ))}

              <div><Label>{t.subjectLabel}</Label><Textarea rows={2} value={form.subject} onChange={(e) => set("subject", e.target.value)} /></div>
              <div className="grid gap-3 md:grid-cols-4">
                <div><Label>Start date</Label><Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
                <div><Label>End date</Label><Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
                <div><Label>{t.amountLabel} (KSh)</Label><Input type="number" value={form.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} /></div>
                <div><Label>Witness name</Label><Input value={form.witness} onChange={(e) => set("witness", e.target.value)} /></div>
              </div>
              <div><Label>Payment terms</Label><Input placeholder="e.g. Paid in full via M-Pesa on signing" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></div>
              <div><Label>Terms & conditions (editable)</Label><Textarea rows={10} value={form.clauses} onChange={(e) => set("clauses", e.target.value)} /></div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={save}>Save</Button>
                <Button onClick={() => { save(); download(form); }}><Download className="h-4 w-4 mr-1" /> Save & Download PDF</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Saved contracts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {list.length === 0 && <p className="text-sm text-muted-foreground">No contracts yet.</p>}
              {list.map((c) => (
                <div key={c.id} className="rounded-md border p-3 space-y-1">
                  <div className="font-medium text-sm">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.partyA || "—"} ↔ {c.partyB || "—"} · {formatKES(c.amount)}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setForm(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => download(c)}><Download className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this contract?")) persist(list.filter((x) => x.id !== c.id)); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
