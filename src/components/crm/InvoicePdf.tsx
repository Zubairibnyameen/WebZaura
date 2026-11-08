/** Browser-only: imported dynamically when the user clicks Download PDF. */
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { fmtDate } from "@/lib/crm-format";

export type PdfInvoice = {
  number: string; issue_date: string; due_date: string | null; status: string;
  subtotal: number; discount_total: number; tax_rate: number; tax_total: number; total: number; paid_total: number; notes: string | null;
  client: { company?: string | null; contact_name?: string | null; address?: string | null; city?: string | null; email?: string | null; phone?: string | null; gstin?: string | null } | null;
  items: { description: string; quantity: number; unit_price: number; item_discount: number }[];
};

const money = (n: number) => "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0e100f" },
  head: { flexDirection: "row", justifyContent: "space-between" },
  logo: { width: 110, height: 28, objectFit: "contain" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  muted: { color: "#555" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbb", paddingVertical: 6 },
  th: { fontFamily: "Helvetica-Bold" },
  c0: { width: 24 }, c1: { flex: 1, paddingRight: 8 }, c2: { width: 40, textAlign: "right" }, c3: { width: 80, textAlign: "right" }, c5: { width: 90, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 250 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1, borderTopColor: "#0e100f", marginTop: 4, paddingTop: 6, fontFamily: "Helvetica-Bold", fontSize: 12 },
  block: { marginTop: 22 },
  label: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  foot: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#555", textAlign: "center" },
});

function Doc({ v, logoSrc }: { v: PdfInvoice; logoSrc: string }) {
  const c = v.client;
  const half = Math.round((Number(v.tax_total) / 2) * 100) / 100;
  return (
    <Document title={v.number} author="WebZaura">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <Image src={logoSrc} style={s.logo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.h1}>Tax invoice</Text><Text>{v.number}</Text>
            <Text style={s.muted}>Issued {fmtDate(v.issue_date)}</Text>
            {v.due_date && <Text style={s.muted}>Due {fmtDate(v.due_date)}</Text>}
            <Text style={s.muted}>Status: {v.status}</Text>
          </View>
        </View>
        <View style={s.block}>
          <Text style={s.label}>Billed to</Text>
          <Text>{c?.company ?? "Client"}</Text>
          {[c?.contact_name, c?.address, c?.city, c?.email, c?.phone].filter(Boolean).map((l, i) => <Text key={i} style={s.muted}>{l}</Text>)}
          {c?.gstin && <Text>GSTIN: {c.gstin}</Text>}
        </View>
        <View style={s.block}>
          <View style={[s.row, s.th]}><Text style={s.c0}>#</Text><Text style={s.c1}>Description</Text><Text style={s.c2}>Qty</Text><Text style={s.c3}>Unit price</Text><Text style={s.c5}>Amount</Text></View>
          {v.items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.c0}>{i + 1}</Text><Text style={s.c1}>{it.description}</Text><Text style={s.c2}>{Number(it.quantity)}</Text>
              <Text style={s.c3}>{money(it.unit_price)}</Text><Text style={s.c5}>{money(Math.max(Number(it.quantity) * Number(it.unit_price) - Number(it.item_discount), 0))}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals}>
          <View style={s.tRow}><Text>Subtotal</Text><Text>{money(v.subtotal)}</Text></View>
          {Number(v.discount_total) > 0 && <View style={s.tRow}><Text>Discount</Text><Text>- {money(v.discount_total)}</Text></View>}
          <View style={s.tRow}><Text>Taxable value</Text><Text>{money(Number(v.subtotal) - Number(v.discount_total))}</Text></View>
          <View style={s.tRow}><Text>GST ({Number(v.tax_rate)}%)</Text><Text>{money(v.tax_total)}</Text></View>
          <View style={s.tRow}><Text style={s.muted}>  CGST {Number(v.tax_rate) / 2}% / SGST {Number(v.tax_rate) / 2}% (intra-state)</Text><Text style={s.muted}>{money(half)} each</Text></View>
          <View style={[s.tRow, s.grand]}><Text>Total (INR)</Text><Text>{money(v.total)}</Text></View>
          <View style={s.tRow}><Text>Paid</Text><Text>{money(v.paid_total)}</Text></View>
          <View style={[s.tRow, { fontFamily: "Helvetica-Bold" }]}><Text>Balance due</Text><Text>{money(Number(v.total) - Number(v.paid_total))}</Text></View>
        </View>
        {v.notes && <View style={s.block}><Text style={s.label}>Notes</Text><Text>{v.notes}</Text></View>}
        <Text style={s.foot} fixed>WebZaura · webzaura@gmail.com · +91 91490 97947</Text>
      </Page>
    </Document>
  );
}

export async function downloadInvoicePdf(v: PdfInvoice) {
  const blob = await pdf(<Doc v={v} logoSrc={new URL("/webzaura-logo.png", window.location.origin).href} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${v.number}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
