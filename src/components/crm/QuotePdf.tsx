/** Browser-only: imported dynamically when the user clicks Download PDF. */
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { fmtDate } from "@/lib/crm-format";

export type PdfQuote = {
  number: string | null; status: string; issue_date: string; valid_until: string | null; tax_rate: number;
  discount_type: string; discount_value: number; notes: string | null; terms: string | null;
  subtotal: number; discount_total: number; tax_total: number; total: number;
  to: { name: string; lines: string[] };
  items: { description: string; quantity: number; unit_price: number; item_discount: number }[];
};

// Built-in Helvetica has no rupee glyph, so amounts use "Rs." with Indian grouping.
const money = (n: number) => "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0e100f" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 110, height: 28, objectFit: "contain" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  muted: { color: "#555" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbb", paddingVertical: 6 },
  th: { fontFamily: "Helvetica-Bold" },
  c0: { width: 24 }, c1: { flex: 1, paddingRight: 8 }, c2: { width: 40, textAlign: "right" }, c3: { width: 80, textAlign: "right" }, c4: { width: 70, textAlign: "right" }, c5: { width: 90, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 240 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1, borderTopColor: "#0e100f", marginTop: 4, paddingTop: 6, fontFamily: "Helvetica-Bold", fontSize: 12 },
  block: { marginTop: 22 },
  label: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  foot: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#555", textAlign: "center" },
});

function QuoteDoc({ q, logoSrc }: { q: PdfQuote; logoSrc: string }) {
  return (
    <Document title={q.number ?? "Quotation"} author="WebZaura">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <Image src={logoSrc} style={s.logo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.h1}>Quotation</Text>
            <Text>{q.number}</Text>
            <Text style={s.muted}>Issued {fmtDate(q.issue_date)}</Text>
            {q.valid_until && <Text style={s.muted}>Valid until {fmtDate(q.valid_until)}</Text>}
          </View>
        </View>
        <View style={s.block}>
          <Text style={s.label}>Prepared for</Text>
          <Text>{q.to.name}</Text>
          {q.to.lines.map((l, i) => <Text key={i} style={s.muted}>{l}</Text>)}
        </View>
        <View style={s.block}>
          <View style={[s.row, s.th]}>
            <Text style={s.c0}>#</Text><Text style={s.c1}>Description</Text><Text style={s.c2}>Qty</Text><Text style={s.c3}>Unit price</Text><Text style={s.c4}>Discount</Text><Text style={s.c5}>Amount</Text>
          </View>
          {q.items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.c0}>{i + 1}</Text><Text style={s.c1}>{it.description}</Text><Text style={s.c2}>{Number(it.quantity)}</Text>
              <Text style={s.c3}>{money(it.unit_price)}</Text><Text style={s.c4}>{Number(it.item_discount) ? money(it.item_discount) : "-"}</Text>
              <Text style={s.c5}>{money(Math.max(Number(it.quantity) * Number(it.unit_price) - Number(it.item_discount), 0))}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals}>
          <View style={s.tRow}><Text>Subtotal</Text><Text>{money(q.subtotal)}</Text></View>
          <View style={s.tRow}><Text>Discount{q.discount_type === "percent" ? ` (${Number(q.discount_value)}%)` : ""}</Text><Text>- {money(q.discount_total)}</Text></View>
          <View style={s.tRow}><Text>GST ({Number(q.tax_rate)}%)</Text><Text>{money(q.tax_total)}</Text></View>
          <View style={[s.tRow, s.grand]}><Text>Total (INR)</Text><Text>{money(q.total)}</Text></View>
        </View>
        {q.notes && <View style={s.block}><Text style={s.label}>Notes</Text><Text>{q.notes}</Text></View>}
        {q.terms && <View style={s.block}><Text style={s.label}>Terms</Text><Text>{q.terms}</Text></View>}
        <Text style={s.foot} fixed>WebZaura · webzaura@gmail.com · +91 91490 97947</Text>
      </Page>
    </Document>
  );
}

export async function downloadQuotePdf(q: PdfQuote) {
  const logoSrc = new URL("/webzaura-logo.png", window.location.origin).href;
  const blob = await pdf(<QuoteDoc q={q} logoSrc={logoSrc} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${q.number ?? "quotation"}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
