// WHY: PDF generato client-side con jsPDF per evitare dipendenze server
// e consentire download immediato senza round-trip al server
import type { Report, Brand, BrandSnapshot } from '@/lib/db/schema';

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

interface AiRecommendation {
  title: string;
  description: string;
}

interface AiRecommendations {
  summary: string;
  recommendations: AiRecommendation[];
}

export async function generateBrandPDF(
  brand: Brand,
  reports: Report[],
  queries: QueryLike[],
  competitors: CompetitorEntry[],
  snapshots: BrandSnapshot[] = [],
  aiRecommendations: AiRecommendations | null = null
) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const today = new Date().toLocaleDateString('it-IT');
  let y = 0;

  // ── Helpers ───────────────────────────────────────────────────────────
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

  function drawDarkHeader(brandName: string) {
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setFontSize(10);
    doc.setTextColor(29, 158, 117);
    doc.setFont('helvetica', 'bold');
    doc.text('GEO Monitor', margin, 11);
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(brandName, margin, 21);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text('Brand Visibility Report · LLM Analysis', margin, 27);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(today, pageW - margin, 11, { align: 'right' });
  }

  function sectionTitle(title: string) {
    checkY(12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(229, 229, 226);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  }

  // ── Metrics calc ──────────────────────────────────────────────────────
  const total = reports.length;
  const mentioned = reports.filter((r) => r.isMentioned).length;
  const first = reports.filter((r) => r.isFirst).length;
  const mentionRate = total > 0 ? Math.round((mentioned / total) * 100) : 0;
  const firstRate = total > 0 ? Math.round((first / total) * 100) : 0;

  // Trend delta vs previous snapshot
  const sortedSnaps = [...snapshots].sort(
    (a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
  );
  const latestSnap = sortedSnaps[sortedSnaps.length - 1];
  const prevSnap = sortedSnaps.length >= 2 ? sortedSnaps[sortedSnaps.length - 2] : null;
  const mentionDelta = prevSnap && latestSnap ? latestSnap.mentionRate - prevSnap.mentionRate : null;
  const firstDelta = prevSnap && latestSnap ? latestSnap.firstPositionRate - prevSnap.firstPositionRate : null;

  // ─────────────────────────────────────────────────────────────────────
  // PAGE 1 — Executive Summary
  // ─────────────────────────────────────────────────────────────────────
  drawDarkHeader(brand.name);
  y = 40;
  addPageNumber();

  // Metric cards
  sectionTitle('Situazione attuale');

  const metricCards = [
    { label: 'Mention Rate', value: `${mentionRate}%`, delta: mentionDelta },
    { label: 'First Position', value: `${firstRate}%`, delta: firstDelta },
    { label: 'Analisi totali', value: String(total), delta: null },
    { label: 'Competitor', value: String(competitors.length), delta: null },
  ];

  const cardW = (pageW - margin * 2 - 9) / 4;
  metricCards.forEach((card, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 229, 226);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(card.label.toUpperCase(), x + 4, y + 5);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(card.value, x + 4, y + 14);

    if (card.delta !== null) {
      const sign = card.delta >= 0 ? '+' : '';
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(card.delta >= 0 ? 22 : 185, card.delta >= 0 ? 163 : 28, card.delta >= 0 ? 74 : 28);
      doc.text(`${sign}${card.delta}% vs precedente`, x + 4, y + 20);
    }
  });

  y += 28;

  // Trend textual description
  if (mentionDelta !== null) {
    checkY(20);
    sectionTitle('Trend');
    const trendText = mentionDelta === 0
      ? 'Il mention rate è rimasto stabile rispetto all\'analisi precedente.'
      : mentionDelta > 0
        ? `Il mention rate è aumentato del +${mentionDelta}% rispetto all'analisi precedente.`
        : `Il mention rate è diminuito del ${mentionDelta}% rispetto all'analisi precedente.`;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(trendText, pageW - margin * 2) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;

    // Sparkline for mention rate (inline SVG drawn via jsPDF)
    if (sortedSnaps.length >= 2) {
      const sparkW = pageW - margin * 2;
      const sparkH = 18;
      const sparkX = margin;
      const sparkY = y;
      const maxVal = 100;
      const pts = sortedSnaps.map((s, i) => ({
        x: sparkX + (i / (sortedSnaps.length - 1)) * sparkW,
        y: sparkY + sparkH - (s.mentionRate / maxVal) * sparkH,
      }));

      // Background
      doc.setFillColor(249, 250, 251);
      doc.rect(sparkX, sparkY, sparkW, sparkH, 'F');

      // Line
      doc.setDrawColor(29, 158, 117);
      doc.setLineWidth(0.6);
      for (let i = 1; i < pts.length; i++) {
        doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      }

      // Dots
      pts.forEach((pt) => {
        doc.setFillColor(29, 158, 117);
        doc.circle(pt.x, pt.y, 0.8, 'F');
      });

      // Label
      doc.setFontSize(6);
      doc.setTextColor(156, 163, 175);
      doc.text('Mention Rate %', sparkX, sparkY - 1);
      y += sparkH + 6;
    }
  }

  // AI Recommendations
  if (aiRecommendations) {
    checkY(30);
    sectionTitle('Raccomandazioni AI');

    if (aiRecommendations.summary) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(55, 65, 81);
      const sumLines = doc.splitTextToSize(aiRecommendations.summary, pageW - margin * 2) as string[];
      doc.text(sumLines, margin, y);
      y += sumLines.length * 5 + 4;
    }

    aiRecommendations.recommendations.slice(0, 5).forEach((rec, i) => {
      checkY(14);
      // Bullet dot
      doc.setFillColor(29, 158, 117);
      doc.circle(margin + 1.5, y - 1, 1.2, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(rec.title, margin + 5, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const descLines = doc.splitTextToSize(rec.description, pageW - margin * 2 - 5) as string[];
      doc.text(descLines, margin + 5, y);
      y += descLines.length * 4.5 + 4;
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // PAGE 2 — Competitor analysis
  // ─────────────────────────────────────────────────────────────────────
  newPage();
  drawDarkHeader(brand.name);
  y = 40;

  sectionTitle('Analisi Competitor');

  if (competitors.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Nessun competitor rilevato nelle analisi.', margin, y);
    y += 8;
  } else {
    const topComps = competitors.slice(0, 10);
    const maxCount = topComps[0].count;
    const barMaxW = pageW - margin * 2 - 55;

    topComps.forEach((c) => {
      checkY(9);
      const barW = maxCount > 0 ? (c.count / maxCount) * barMaxW : 0;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text(c.name.substring(0, 22), margin, y + 4);

      doc.setFillColor(243, 244, 246);
      doc.roundedRect(margin + 45, y, barMaxW, 6, 1, 1, 'F');
      doc.setFillColor(127, 119, 221);
      if (barW > 0) doc.roundedRect(margin + 45, y, barW, 6, 1, 1, 'F');

      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`${c.percentage}%  (${c.count})`, pageW - margin, y + 4, { align: 'right' });

      y += 8;
    });

    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(156, 163, 175);
    doc.text('Competitor rilevati automaticamente dalle risposte degli LLM', margin, y);
    y += 8;
  }

  // ─────────────────────────────────────────────────────────────────────
  // PAGE 3+ — Dettaglio risposte
  // ─────────────────────────────────────────────────────────────────────
  newPage();
  drawDarkHeader(brand.name);
  y = 40;

  sectionTitle('Dettaglio risposte LLM');

  // Table header
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, y, pageW - margin * 2, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text('LLM', margin + 2, y + 4.5);
  doc.text('QUERY', margin + 22, y + 4.5);
  doc.text('STATO', margin + 105, y + 4.5);
  doc.text('DATA', pageW - margin - 18, y + 4.5);
  y += 7;

  const llmLabels: Record<string, string> = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' };
  const llmColors: Record<string, [number, number, number]> = {
    chatgpt: [220, 252, 231],
    claude: [237, 233, 254],
    gemini: [219, 234, 254],
  };

  reports.slice(0, 80).forEach((r) => {
    checkY(10);

    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageW - margin, y);

    // LLM badge
    const bgColor = llmColors[r.llm] ?? [243, 244, 246];
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin + 1, y + 1, 16, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(llmLabels[r.llm] ?? r.llm, margin + 3, y + 4.5);

    // Query (truncated)
    const queryTrunc = r.queryText.length > 58 ? r.queryText.substring(0, 55) + '...' : r.queryText;
    doc.text(queryTrunc, margin + 22, y + 4.5);

    // Status
    if (r.isFirst) {
      doc.setTextColor(29, 158, 117);
      doc.text('Prima menzione', margin + 105, y + 4.5);
    } else if (r.isMentioned) {
      doc.setTextColor(186, 117, 23);
      doc.text('Menzionato', margin + 105, y + 4.5);
    } else {
      doc.setTextColor(216, 90, 48);
      doc.text('Non menzionato', margin + 105, y + 4.5);
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

  addPageNumber();

  // ── Save ─────────────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = brand.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`GEO_Monitor_${safeName}_${dateStr}.pdf`);
}
