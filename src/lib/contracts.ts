import jsPDF from "jspdf";
import { applyBrandedHeader, applyBrandedFooter, getBrandingAssets } from "./pdf-branding";
import { formatKES } from "./currency";

export interface ContractTemplate {
  id: string;
  name: string;
  partyALabel: string;
  partyBLabel: string;
  subjectLabel: string;
  amountLabel: string;
  clauses: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "land-lease", name: "Land Lease Agreement", partyALabel: "Lessor (Landowner)", partyBLabel: "Lessee (Farmer)",
    subjectLabel: "Land description / location / acreage", amountLabel: "Lease amount",
    clauses: `1. The Lessor leases the land described above to the Lessee for agricultural use only.
2. The lease runs from the start date to the end date stated in this agreement.
3. The Lessee shall pay the lease amount as per the payment terms stated.
4. The Lessee shall use good farming practices and not damage the land, boundaries or water sources.
5. The Lessee shall not sublet the land without written consent of the Lessor.
6. Either party may end this agreement with 30 days written notice; crops already planted may be harvested.
7. Disputes shall first be resolved amicably, then through mediation, under the laws of Kenya.`,
  },
  {
    id: "labour", name: "Farm Labour / Employment Contract", partyALabel: "Employer", partyBLabel: "Employee / Worker",
    subjectLabel: "Job title and duties", amountLabel: "Wage / salary",
    clauses: `1. The Employee is engaged to perform the duties described above.
2. Working hours, rest days and leave shall follow the Employment Act of Kenya.
3. The Employer shall pay the agreed wage as per the payment terms stated.
4. The Employer shall provide necessary protective gear and safe working conditions.
5. The Employee shall take good care of farm property, animals, tools and produce.
6. Either party may end this contract by giving notice as required by law.
7. Misconduct, theft or negligence may lead to summary dismissal.`,
  },
  {
    id: "produce-supply", name: "Produce Supply / Sale Agreement", partyALabel: "Seller (Farm)", partyBLabel: "Buyer",
    subjectLabel: "Produce, quantity and quality grade", amountLabel: "Agreed price",
    clauses: `1. The Seller agrees to supply the produce described above to the Buyer.
2. The produce shall meet the agreed quality grade at the point of delivery.
3. Delivery shall be made on or before the dates agreed between the parties.
4. Ownership and risk pass to the Buyer upon delivery and acceptance.
5. The Buyer shall pay the agreed price as per the payment terms stated.
6. Rejected produce must be reported within 24 hours of delivery with reasons.
7. Neither party is liable for delays caused by weather, disease or events beyond their control.`,
  },
  {
    id: "livestock-sale", name: "Livestock Sale Agreement", partyALabel: "Seller", partyBLabel: "Buyer",
    subjectLabel: "Animals (type, breed, tag numbers, count)", amountLabel: "Purchase price",
    clauses: `1. The Seller sells and the Buyer buys the animals described above.
2. The Seller confirms they are the lawful owner and the animals are free of any claims.
3. The animals are sold in their current condition, as inspected by the Buyer.
4. Ownership and risk pass to the Buyer upon full payment and collection.
5. The Seller shall provide any available health and vaccination records.
6. Transport and movement permits are the responsibility of the Buyer unless agreed otherwise.`,
  },
  {
    id: "equipment-hire", name: "Equipment / Machinery Hire Agreement", partyALabel: "Owner", partyBLabel: "Hirer",
    subjectLabel: "Equipment description", amountLabel: "Hire charge",
    clauses: `1. The Owner hires out the equipment described above to the Hirer for the stated period.
2. The Hirer shall use the equipment carefully and only for its intended purpose.
3. Fuel and operator costs are borne by the Hirer unless agreed otherwise.
4. The Hirer is liable for damage or loss caused by misuse or negligence.
5. The equipment shall be returned clean and in the same condition, fair wear excepted.
6. The Hirer shall pay the hire charge as per the payment terms stated.`,
  },
  {
    id: "custom", name: "Custom Agreement", partyALabel: "Party A", partyBLabel: "Party B",
    subjectLabel: "Subject of agreement", amountLabel: "Amount",
    clauses: `1. Write your own terms here.`,
  },
];

export interface ContractData {
  id: string;
  templateId: string;
  title: string;
  partyA: string; partyAId: string; partyAContact: string;
  partyB: string; partyBId: string; partyBContact: string;
  subject: string;
  startDate: string; endDate: string;
  amount: number; paymentTerms: string;
  clauses: string;
  witness: string;
  createdAt: string;
}

const KEY = "farmos_contracts_v1";
export const loadContracts = (): ContractData[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
export const saveContracts = (list: ContractData[]) => localStorage.setItem(KEY, JSON.stringify(list));

const fmtDate = (d: string) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB") : "—");

export async function exportContractPDF(c: ContractData) {
  const t = CONTRACT_TEMPLATES.find((x) => x.id === c.templateId) || CONTRACT_TEMPLATES[5];
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const W = pw - 28;
  const { farmName } = await getBrandingAssets();
  let y = await applyBrandedHeader(doc, { title: (c.title || t.name).toUpperCase(), subtitle: `Ref: ${c.id.slice(0, 8).toUpperCase()}` });

  const ensure = (h: number) => { if (y + h > ph - 30) { doc.addPage(); y = 20; } };
  const heading = (s: string) => {
    ensure(12); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(76, 111, 60);
    doc.text(s, 14, y); y += 6; doc.setTextColor(30, 30, 30);
  };
  const para = (s: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(10);
    for (const line of doc.splitTextToSize(s || "—", W)) { ensure(6); doc.text(line, 14, y); y += 5; }
  };

  para(`This agreement is made on ${fmtDate(c.createdAt.slice(0, 10))} between the parties below.`);
  y += 3;
  heading("1. PARTIES");
  para(`${t.partyALabel}: ${c.partyA || "—"}`, true);
  para(`ID/Reg No: ${c.partyAId || "—"}    Contact: ${c.partyAContact || "—"}`);
  y += 2;
  para(`${t.partyBLabel}: ${c.partyB || "—"}`, true);
  para(`ID/Reg No: ${c.partyBId || "—"}    Contact: ${c.partyBContact || "—"}`);
  y += 3;
  heading(`2. ${t.subjectLabel.toUpperCase()}`);
  para(c.subject);
  y += 3;
  heading("3. DURATION");
  para(`From ${fmtDate(c.startDate)} to ${c.endDate ? fmtDate(c.endDate) : "until ended by either party"}.`);
  y += 3;
  heading("4. CONSIDERATION & PAYMENT");
  para(`${t.amountLabel}: ${formatKES(c.amount)}`, true);
  para(`Payment terms: ${c.paymentTerms || "—"}`);
  y += 3;
  heading("5. TERMS & CONDITIONS");
  para(c.clauses);
  y += 6;

  ensure(60);
  heading("SIGNATURES");
  y += 4;
  const col = (x: number, label: string, name: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(label, x, y);
    doc.text(`Name: ${name || ""}`, x, y + 7);
    doc.line(x, y + 20, x + 80, y + 20); doc.text("Signature", x, y + 25);
    doc.text("Date: ____________________", x, y + 33);
  };
  col(14, t.partyALabel, c.partyA);
  col(pw / 2 + 4, t.partyBLabel, c.partyB);
  y += 42;
  if (c.witness !== undefined) {
    ensure(30);
    col(14, "Witness", c.witness);
    y += 40;
  }

  await applyBrandedFooter(doc, "contract");
  const safe = (c.title || t.name).replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safe}_${(c.partyB || farmName).replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
