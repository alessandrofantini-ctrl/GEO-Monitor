// WHY: PDF generato client-side con jsPDF per evitare dipendenze server
// e consentire download immediato senza round-trip al server
import type { Report } from '@/lib/db/schema';

interface CompetitorEntry {
  name: string;
  count: number;
  percentage: number;
}

interface QueryLike {
  id: string;
  text: string;
  categoryName?: string | null;
}

export async function generateBrandPDF(
  reports: Report[],
  queries: QueryLike[],
  competitors: CompetitorEntry[]
) {
  // Dynamic import to avoid SSR issues (jsPDF is browser-only)
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const today = new Date().toLocaleDateString('it-IT');
  let y = 0;

  // ── Helper functions ──────────────────────────────────────────────────
  function newPage() {
    doc.addPage();
    y = margin;
    addPageNumber();
  }

  function checkY(needed: number) {
    if (y + needed > pageH - margin) newPage();
  }

  function addPageNumber() {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Pagina ${pageNum}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  // ── Dark header ───────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39); // gray-900
  doc.rect(0, 0, pageW, 28, 'F');

  // Logo text
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('GEO Monitor', margin, 12);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('Brand Visibility Report · LLM Analysis', margin, 18);

  // Date top-right
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(today, pageW - margin, 12, { align: 'right' });

  y = 35;

  // ── Mention rate metrics ───────────────────────────────────────────────
  const total = reports.length;
  const mentioned = reports.filter((r) => r.isMentioned).length;
  const first = reports.filter((r) => r.isFirst).length;
  const mentionRate = total > 0 ? Math.round((mentioned / total) * 100) : 0;
  const firstRate = total > 0 ? Math.round((first / total) * 100) : 0;
  const uniqueCompetitors = competitors.length;

  const metricCards = [
    { label: 'Mention Rate', value: `${mentionRate}%` },
    { label: 'First Position', value: `${firstRate}%` },
    { label: 'Analisi totali', value: String(total) },
    { label: 'Competitor', value: String(uniqueCompetitors) },
  ];

  const cardW = (pageW - margin * 2 - 9) / 4;
  metricCards.forEach((card, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 229, 226);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label.toUpperCase(), x + 4, y + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(card.value, x + 4, y + 13);
  });

  y += 24;

  // ── Competitors bar chart ─────────────────────────────────────────────
  if (competitors.length > 0) {
    checkY(14 + competitors.slice(0, 8).length * 7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Top Competitor', margin, y);
    y += 5;

    const maxCount = competitors[0].count;
    const barMaxW = pageW - margin * 2 - 50;

    competitors.slice(0, 8).forEach((c) => {
      const barW = maxCount > 0 ? (c.count / maxCount) * barMaxW : 0;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text(c.name.substring(0, 20), margin, y + 3.5);

      // Bar background
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(margin + 40, y, barMaxW, 5, 1, 1, 'F');

      // Bar fill — purple brand color
      doc.setFillColor(127, 119, 221);
      if (barW > 0) doc.roundedRect(margin + 40, y, barW, 5, 1, 1, 'F');

      // Percentage
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`${c.percentage}%`, pageW - margin, y + 3.5, { align: 'right' });

      y += 7;
    });

    y += 5;
  }

  // ── Reports table ─────────────────────────────────────────────────────
  checkY(20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Dettaglio risposte LLM', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, y, pageW - margin * 2, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text('LLM', margin + 2, y + 4.5);
  doc.text('QUERY', margin + 22, y + 4.5);
  doc.text('STATO', margin + 100, y + 4.5);
  doc.text('DATA', pageW - margin - 18, y + 4.5);
  y += 7;

  // Table rows
  reports.slice(0, 50).forEach((r) => {
    checkY(12);

    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageW - margin, y);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    // LLM badge
    const llmLabels: Record<string, string> = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' };
    const llmColors: Record<string, [number, number, number]> = {
      chatgpt: [220, 252, 231],
      claude: [237, 233, 254],
      gemini: [219, 234, 254],
    };
    const bgColor = llmColors[r.llm] ?? [243, 244, 246];
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin + 1, y + 1, 16, 5, 1, 1, 'F');
    doc.setTextColor(55, 65, 81);
    doc.text(llmLabels[r.llm] ?? r.llm, margin + 3, y + 4.5);

    // Query (truncated)
    doc.setTextColor(55, 65, 81);
    const queryTrunc = r.queryText.length > 55 ? r.queryText.substring(0, 52) + '...' : r.queryText;
    doc.text(queryTrunc, margin + 22, y + 4.5);

    // Status
    if (r.isFirst) {
      doc.setTextColor(29, 158, 117);
      doc.text('Prima menzione', margin + 100, y + 4.5);
    } else if (r.isMentioned) {
      doc.setTextColor(186, 117, 23);
      doc.text('Menzionato', margin + 100, y + 4.5);
    } else {
      doc.setTextColor(216, 90, 48);
      doc.text('Non menzionato', margin + 100, y + 4.5);
    }

    // Date
    doc.setTextColor(156, 163, 175);
    doc.text(
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('it-IT') : '-',
      pageW - margin - 2,
      y + 4.5,
      { align: 'right' }
    );

    y += 9;
  });

  // Page numbers on first page
  addPageNumber();

  // ── Save ─────────────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`GEO_Monitor_Report_${dateStr}.pdf`);
}
