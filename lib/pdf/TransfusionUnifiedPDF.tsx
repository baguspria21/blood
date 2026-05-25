import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  red:       '#c0392b',
  darkRed:   '#922b21',
  gray:      '#64748b',
  lightGray: '#f8fafc',
  border:    '#e2e8f0',
  black:     '#0f172a',
  white:     '#ffffff',
  green:     '#15803d',
  amber:     '#b45309',
  blue:      '#1d4ed8',
}

const S = StyleSheet.create({
  // ── Page ────────────────────────────────────────────────────────────────────
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.black,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    backgroundColor: C.white,
  },

  // ── Letterhead ───────────────────────────────────────────────────────────────
  letterhead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginBottom: 6,
    borderBottomWidth: 3,
    borderBottomColor: C.red,
  },
  lhLeft: { flex: 1 },
  lhOrg: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: C.red, letterSpacing: 0.3 },
  lhSub: { fontSize: 7.5, color: C.gray, marginTop: 2 },
  lhRight: { alignItems: 'flex-end' },
  docTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.darkRed,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docMeta: { fontSize: 7.5, color: C.gray, marginTop: 3 },

  // ── Status badge row ──────────────────────────────────────────────────────
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  badgePending:   { backgroundColor: '#fef3c7', color: C.amber },
  badgeApproved:  { backgroundColor: '#dbeafe', color: C.blue  },
  badgeCompleted: { backgroundColor: '#dcfce7', color: C.green  },
  badgeRejected:  { backgroundColor: '#fee2e2', color: C.red   },

  // ── Sections ─────────────────────────────────────────────────────────────────
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.red,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: C.red,
    paddingBottom: 3,
    marginBottom: 8,
  },

  // ── Grid helpers ──────────────────────────────────────────────────────────
  row: { flexDirection: 'row', marginBottom: 5 },
  col:  { flex: 1, paddingRight: 8 },
  col2: { flex: 2, paddingRight: 8 },
  lbl: { fontSize: 7, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  val: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.black },
  valNormal: { fontSize: 9, color: C.black },

  // ── Blood type badge ─────────────────────────────────────────────────────
  bloodBadge: {
    backgroundColor: C.red,
    color: C.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  // ── Products table ────────────────────────────────────────────────────────
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.lightGray,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowAlt: { backgroundColor: '#fef2f2' },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellBold: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: { borderTopWidth: 1, borderTopColor: C.border, marginVertical: 12 },

  // ── Signature ─────────────────────────────────────────────────────────────
  sigBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 8,
    backgroundColor: C.lightGray,
    alignItems: 'center',
    width: 176,
  },
  sigImg: { width: 152, height: 56, objectFit: 'contain' },
  sigPlaceholder: {
    width: 152,
    height: 56,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },

  // ── Rejection notice ──────────────────────────────────────────────────────
  rejBox: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  rejTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#b91c1c', marginBottom: 4 },
  rejNote: { fontSize: 9, color: '#7f1d1d' },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.gray },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}
function v(x: unknown): string { return x != null && String(x).trim() ? String(x) : '—' }

// ── Types ─────────────────────────────────────────────────────────────────────
export interface UnifiedRequest {
  id: string
  patient_name: string
  blood_type?: string | null
  rhesus?: string | null
  requesting_hospital?: string | null
  requesting_doctor?: string | null
  bagian?: string | null
  kelas?: string | null
  no_reg?: string | null
  diagnosis?: string | null
  transfusion_reason?: string | null
  hemoglobin?: number | null
  contact_phone?: string | null
  request_date?: string | null
  needed_date?: string | null
  address?: string | null
  age_years?: number | null
  age_months?: number | null
  birth_date?: string | null
  has_previous_transfusion?: boolean
  had_reaction?: boolean
  wb_fresh_volume?: number | null
  wb_new_volume?: number | null
  wb_regular_volume?: number | null
  prc_fresh_volume?: number | null
  prc_regular_volume?: number | null
  prc_washed_volume?: number | null
  plasma_regular_volume?: number | null
  plasma_ffp_volume?: number | null
  factor_thrombocyte_bags?: number | null
  factor_cryoprecipitate_bags?: number | null
  factor_buffycoat_bags?: number | null
  factor_other?: string | null
  status?: string
  rejection_notes?: string | null
  created_at?: string
}

export interface UnifiedResponse {
  id: string
  bag_number: string
  collection_date?: string | null
  blood_category?: string | null
  volume_cc?: string | null
  blood_type_abo?: string | null
  rhesus?: string | null
  officer_name?: string | null
  release_date?: string | null
  release_time?: string | null
  receiver_name?: string | null
  receiver_signature?: string | null
}

export interface TransfusionUnifiedPDFProps {
  request: UnifiedRequest
  responses?: UnifiedResponse[]
}

// ── Requested blood products list ────────────────────────────────────────────
function getProducts(r: UnifiedRequest) {
  const p: { name: string; amount: string }[] = []
  if (r.wb_fresh_volume)             p.push({ name: 'Whole Blood — Segar',   amount: `${r.wb_fresh_volume} cc` })
  if (r.wb_new_volume)               p.push({ name: 'Whole Blood — Baru',    amount: `${r.wb_new_volume} cc` })
  if (r.wb_regular_volume)           p.push({ name: 'Whole Blood — Biasa',   amount: `${r.wb_regular_volume} cc` })
  if (r.prc_fresh_volume)            p.push({ name: 'PRC — Segar',           amount: `${r.prc_fresh_volume} cc` })
  if (r.prc_regular_volume)          p.push({ name: 'PRC — Biasa',           amount: `${r.prc_regular_volume} cc` })
  if (r.prc_washed_volume)           p.push({ name: 'PRC — Cuci',            amount: `${r.prc_washed_volume} cc` })
  if (r.plasma_regular_volume)       p.push({ name: 'Plasma Biasa',          amount: `${r.plasma_regular_volume} cc` })
  if (r.plasma_ffp_volume)           p.push({ name: 'FFP',                   amount: `${r.plasma_ffp_volume} cc` })
  if (r.factor_thrombocyte_bags)     p.push({ name: 'Trombosit Konsentrat',  amount: `${r.factor_thrombocyte_bags} kantong` })
  if (r.factor_cryoprecipitate_bags) p.push({ name: 'Cryoprecipitate',       amount: `${r.factor_cryoprecipitate_bags} kantong` })
  if (r.factor_buffycoat_bags)       p.push({ name: 'Buffy Coat',            amount: `${r.factor_buffycoat_bags} kantong` })
  if (r.factor_other)                p.push({ name: 'Lainnya',               amount: r.factor_other })
  return p
}

// ── STATUS helpers ────────────────────────────────────────────────────────────
function docTitle(status?: string) {
  if (status === 'approved' || status === 'completed') return 'Blood Transfusion Release Note'
  if (status === 'rejected')  return 'Blood Unavailability Notice'
  return 'Blood Requisition Form'
}

function statusLabel(status?: string) {
  if (status === 'pending')   return 'MENUNGGU RESPONS'
  if (status === 'approved')  return 'DIPROSES'
  if (status === 'completed') return 'SELESAI'
  if (status === 'rejected')  return 'TIDAK TERSEDIA'
  return status?.toUpperCase() ?? '—'
}

function statusBadgeStyle(status?: string) {
  if (status === 'completed') return [S.statusBadge, S.badgeCompleted]
  if (status === 'approved')  return [S.statusBadge, S.badgeApproved]
  if (status === 'rejected')  return [S.statusBadge, S.badgeRejected]
  return [S.statusBadge, S.badgePending]
}

// ── MAIN DOCUMENT ─────────────────────────────────────────────────────────────
export function TransfusionUnifiedPDF({ request, responses = [] }: TransfusionUnifiedPDFProps) {
  const status   = request.status ?? 'pending'
  const isResponded = status === 'approved' || status === 'completed'
  const isRejected  = status === 'rejected'
  const products    = getProducts(request)
  const printDate   = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })
  const sigResponse = responses.find(r => r.receiver_signature)

  return (
    <Document title={`${docTitle(status)} — ${request.patient_name}`}>
      <Page size="A4" style={S.page}>

        {/* ════════════════════════════════════════════════════════════
            LETTERHEAD
        ═══════════════════════════════════════════════════════════ */}
        <View style={S.letterhead}>
          <View style={S.lhLeft}>
            <Text style={S.lhOrg}>Blood-Connect Palu</Text>
            <Text style={S.lhSub}>Unit Transfusi Darah (UTD) · PMI Kota Palu · RSUD Undata</Text>
          </View>
          <View style={S.lhRight}>
            <Text style={S.docTitle}>{docTitle(status)}</Text>
            <Text style={S.docMeta}>No. Ref: {request.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={S.docMeta}>Dicetak: {printDate}</Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={S.statusRow}>
          <Text style={S.footerText}>Dokumen ini dicetak dari sistem Blood-Connect Palu</Text>
          <Text style={statusBadgeStyle(status)}>{statusLabel(status)}</Text>
        </View>

        {/* ════════════════════════════════════════════════════════════
            PART I — REQUEST DETAILS (always visible)
        ═══════════════════════════════════════════════════════════ */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>I. Identitas Pemohon</Text>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.lbl}>Rumah Sakit</Text>
              <Text style={S.val}>{v(request.requesting_hospital)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Dokter yang Meminta</Text>
              <Text style={S.val}>{v(request.requesting_doctor)}</Text>
            </View>
          </View>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.lbl}>Bagian / Ward</Text>
              <Text style={S.valNormal}>{v(request.bagian)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Kelas</Text>
              <Text style={S.valNormal}>{v(request.kelas)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>No. Registrasi</Text>
              <Text style={S.valNormal}>{v(request.no_reg)}</Text>
            </View>
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>II. Data Pasien</Text>
          <View style={S.row}>
            <View style={S.col2}>
              <Text style={S.lbl}>Nama Lengkap Pasien</Text>
              <Text style={S.val}>{v(request.patient_name)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Tanggal Lahir</Text>
              <Text style={S.valNormal}>{fmtDate(request.birth_date)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Umur</Text>
              <Text style={S.valNormal}>
                {request.age_years != null ? `${request.age_years} Thn` : '—'}
                {request.age_months != null && request.age_months > 0 ? ` ${request.age_months} Bln` : ''}
              </Text>
            </View>
          </View>
          <View style={S.row}>
            <View style={S.col2}>
              <Text style={S.lbl}>Alamat</Text>
              <Text style={S.valNormal}>{v(request.address)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>No. Kontak / WhatsApp</Text>
              <Text style={S.valNormal}>{v(request.contact_phone)}</Text>
            </View>
          </View>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.lbl}>Tanggal Permintaan</Text>
              <Text style={S.valNormal}>{fmtDate(request.request_date)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Tanggal Diperlukan</Text>
              <Text style={S.valNormal}>{fmtDate(request.needed_date)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Diagnosa</Text>
              <Text style={S.valNormal}>{v(request.diagnosis)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Hb (g/%)</Text>
              <Text style={S.val}>{request.hemoglobin ? `${request.hemoglobin} g/%` : '—'}</Text>
            </View>
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>III. Golongan Darah &amp; Produk Diminta</Text>
          <View style={S.row}>
            <View style={{ marginRight: 16 }}>
              <Text style={S.lbl}>Golongan Darah</Text>
              <Text style={S.bloodBadge}>{v(request.blood_type)}{v(request.rhesus)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.lbl, { marginBottom: 4 }]}>Produk yang Diminta</Text>
              {products.length > 0 ? (
                <>
                  <View style={S.tableHead}>
                    <Text style={[S.tableCellBold, { flex: 2 }]}>Jenis Produk</Text>
                    <Text style={S.tableCellBold}>Jumlah</Text>
                  </View>
                  {products.map((p, i) => (
                    <View key={i} style={i % 2 === 1 ? [S.tableRow, S.tableRowAlt] : S.tableRow}>
                      <Text style={[S.tableCell, { flex: 2 }]}>{p.name}</Text>
                      <Text style={S.tableCell}>{p.amount}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={S.valNormal}>—</Text>
              )}
            </View>
          </View>
          <View style={[S.row, { marginTop: 8 }]}>
            <View style={S.col}>
              <Text style={S.lbl}>Alasan Transfusi</Text>
              <Text style={S.valNormal}>{v(request.transfusion_reason)}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Pernah Transfusi Sebelumnya</Text>
              <Text style={S.valNormal}>{request.has_previous_transfusion ? 'Ya' : 'Tidak'}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.lbl}>Pernah Reaksi</Text>
              <Text style={S.valNormal}>{request.had_reaction ? 'Ya' : 'Tidak'}</Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════
            PENDING — Signature placeholder area for doctor
        ═══════════════════════════════════════════════════════════ */}
        {!isResponded && !isRejected && (
          <View style={[S.row, { marginTop: 20, justifyContent: 'space-between' }]}>
            <View style={{ alignItems: 'center', width: 160 }}>
              <Text style={S.lbl}>Dokter yang Meminta</Text>
              <View style={{ height: 52, borderBottomWidth: 1, borderBottomColor: C.border, width: '100%', marginTop: 40 }} />
              <Text style={[S.valNormal, { marginTop: 4 }]}>{v(request.requesting_doctor)}</Text>
            </View>
            <View style={{ alignItems: 'center', width: 160 }}>
              <Text style={S.lbl}>Petugas Penerima UTD</Text>
              <View style={{ height: 52, borderBottomWidth: 1, borderBottomColor: C.border, width: '100%', marginTop: 40 }} />
              <Text style={[S.valNormal, { marginTop: 4 }]}>( __________________ )</Text>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════
            REJECTED — Notice block
        ═══════════════════════════════════════════════════════════ */}
        {isRejected && (
          <>
            <View style={S.divider} />
            <View style={S.rejBox}>
              <Text style={S.rejTitle}>⚠ Darah Tidak Tersedia</Text>
              <Text style={S.rejNote}>{v(request.rejection_notes)}</Text>
            </View>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            PART II — RESPONSE DATA (only when approved/completed)
        ═══════════════════════════════════════════════════════════ */}
        {isResponded && responses.length > 0 && (
          <>
            <View style={S.divider} />
            <View style={S.section}>
              <Text style={S.sectionTitle}>IV. Data Kantong Darah yang Dikeluarkan</Text>
              <View style={S.tableHead}>
                {['No. Kantong', 'Jenis', 'Volume', 'Gol.', 'Rh', 'Tgl Ambil', 'Petugas ATD/PTTD', 'Tgl & Jam Keluar'].map((h, i) => (
                  <Text key={i} style={i === 0 ? [S.tableCellBold, { flex: 1.5 }] : S.tableCellBold}>{h}</Text>
                ))}
              </View>
              {responses.map((r, idx) => (
                <View key={r.id} style={idx % 2 === 1 ? [S.tableRow, S.tableRowAlt] : S.tableRow}>
                  <Text style={[S.tableCellBold, { flex: 1.5 }]}>{r.bag_number}</Text>
                  <Text style={S.tableCell}>{v(r.blood_category)}</Text>
                  <Text style={S.tableCell}>{v(r.volume_cc)}</Text>
                  <Text style={S.tableCell}>{v(r.blood_type_abo)}</Text>
                  <Text style={S.tableCell}>{v(r.rhesus)}</Text>
                  <Text style={S.tableCell}>{fmtDate(r.collection_date)}</Text>
                  <Text style={S.tableCell}>{v(r.officer_name)}</Text>
                  <Text style={S.tableCell}>
                    {r.release_date ? `${fmtDate(r.release_date)} ${r.release_time ?? ''}` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            PART III — SIGNATURE (only when approved/completed)
        ═══════════════════════════════════════════════════════════ */}
        {isResponded && (
          <>
            <View style={S.divider} />
            <View style={S.section}>
              <Text style={S.sectionTitle}>V. Tanda Tangan &amp; Serah Terima</Text>
              <View style={[S.row, { alignItems: 'flex-start', justifyContent: 'space-between' }]}>
                {/* Receiver info */}
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={S.lbl}>Nama Penerima</Text>
                  <Text style={S.val}>{v(sigResponse?.receiver_name ?? responses[0]?.receiver_name)}</Text>
                  <View style={{ marginTop: 12 }}>
                    <Text style={S.lbl}>Petugas ATD/PTTD</Text>
                    <Text style={S.val}>{v(responses[0]?.officer_name)}</Text>
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <Text style={S.lbl}>Waktu Pengeluaran</Text>
                    <Text style={S.valNormal}>
                      {responses[0]?.release_date
                        ? `${fmtDate(responses[0].release_date)} ${responses[0].release_time ?? ''}`
                        : '—'}
                    </Text>
                  </View>
                </View>

                {/* Signature box */}
                <View style={S.sigBox}>
                  <Text style={[S.lbl, { marginBottom: 4 }]}>Tanda Tangan Penerima</Text>
                  {sigResponse?.receiver_signature ? (
                    <Image src={sigResponse.receiver_signature} style={S.sigImg} />
                  ) : (
                    <View style={S.sigPlaceholder} />
                  )}
                  <Text style={[S.lbl, { marginTop: 4 }]}>{v(sigResponse?.receiver_name ?? responses[0]?.receiver_name)}</Text>
                </View>

                {/* Officer stamp area */}
                <View style={{ alignItems: 'center', width: 140, marginLeft: 16 }}>
                  <Text style={S.lbl}>Petugas Pengeluaran</Text>
                  <View style={{ height: 52, width: '100%', marginTop: 40, borderBottomWidth: 1, borderColor: C.border }} />
                  <Text style={[S.valNormal, { marginTop: 4 }]}>{v(responses[0]?.officer_name)}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Blood-Connect Palu — Dokumen Resmi Sistem Informasi Transfusi Darah</Text>
          <Text style={S.footerText}>Ref: {request.id.slice(0, 8).toUpperCase()} · {new Date().toLocaleDateString('id-ID')}</Text>
        </View>
      </Page>
    </Document>
  )
}
