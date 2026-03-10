import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { farmFileName } from "./report-export";
import { getFarmSettings } from "./farm-settings-cache";
import fallbackLogoUrl from "@/assets/farm-logo.png";

interface CalendarTask {
  title: string;
  date: Date;
  type: string;
  priority: string;
  completed: boolean;
  description?: string;
  recurrence?: string | null;
  assignedTo?: string | null;
}

function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function exportCalendarToPDF(tasks: CalendarTask[]) {
  const settings = await getFarmSettings();
  const farmName = settings?.farm_name || "My Farm";
  const farmLocation = settings?.location || "";
  const farmSlogan = (settings as any)?.slogan || "";

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  let y = 14;

  // Logo
  try {
    const logoUrl = settings?.logo_url || fallbackLogoUrl;
    const logoData = await loadImageAsBase64(logoUrl);
    doc.addImage(logoData, "PNG", 14, y, 20, 20);
  } catch {
    // skip logo
  }

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(farmName, 40, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (farmLocation) doc.text(farmLocation, 40, y + 14);
  if (farmSlogan) {
    doc.setFont("helvetica", "italic");
    doc.text(farmSlogan, 40, y + 19);
  }

  y += 28;
  doc.setDrawColor(76, 119, 62);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Farm Calendar Report", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, y);
  y += 10;

  // Summary stats
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed).length;
  const overdue = tasks.filter(t => !t.completed && t.date < now).length;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Total Tasks", "Completed", "Pending", "Overdue"]],
    body: [[total.toString(), completed.toString(), pending.toString(), overdue.toString()]],
    theme: "grid",
    headStyles: { fillColor: [76, 119, 62], textColor: 255, fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Overdue tasks
  const overdueTasks = tasks.filter(t => !t.completed && t.date < now);
  if (overdueTasks.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0);
    doc.text(`Overdue Tasks (${overdueTasks.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Task", "Date", "Type", "Priority", "Description"]],
      body: overdueTasks.map(t => [
        t.title,
        t.date.toLocaleDateString(),
        t.type,
        t.priority,
        t.description || "-",
      ]),
      theme: "striped",
      headStyles: { fillColor: [200, 50, 50], textColor: 255, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Upcoming tasks
  const upcomingTasks = tasks
    .filter(t => !t.completed && t.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcomingTasks.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Upcoming Tasks (${upcomingTasks.length})`, 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Task", "Date", "Type", "Priority", "Recurrence", "Description"]],
      body: upcomingTasks.map(t => [
        t.title,
        t.date.toLocaleDateString(),
        t.type,
        t.priority,
        t.recurrence || "-",
        t.description || "-",
      ]),
      theme: "striped",
      headStyles: { fillColor: [76, 119, 62], textColor: 255, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Completed tasks
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Completed Tasks (${completedTasks.length})`, 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Task", "Date", "Type", "Priority"]],
      body: completedTasks.map(t => [
        t.title,
        t.date.toLocaleDateString(),
        t.type,
        t.priority,
      ]),
      theme: "striped",
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`${farmName} — Calendar Report`, 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" });
  }

  const fileName = await farmFileName("Calendar-Report", "pdf");
  doc.save(fileName);
}
