import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer'

// ── Register fonts (built-in Helvetica works without registration) ─────────────

const colors = {
  red:      '#c0392b',
  darkRed:  '#922b21',
  gray:     '#666666',
  lightGray:'#f5f5f5',
  border:   '#dddddd',
  black:    '#1a1a1a',
  white:    '#ffffff',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.black,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 40,
    backgroundColor: colors.white,
  },
  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
    paddingBottom: 10,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: colors.red,
    letterSpacing: 0.5,
  },
  headerSub: { fontSize: 8, color: colors.gray, marginTop: 2 },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.darkRed,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docId: { fontSize: 7.5, color: colors.gray, marginTop: 3 },
  docDate: { fontSize: 7.5, color: colors.gray, marginTop: 1 },

  // ── Section ──────────────────────────────────────────────────────
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
    paddingBottom: 3,
    marginBottom: 7,
  },
  // ── Grid ──────────────────────────────────────────────────────────
  row: { flexDirection: 'row', marginBottom: 4 },
  col2: { flex: 1, paddingRight: 8 },
  col3: { flex: 1, paddingRight: 6 },
  fieldLabel: {
    fontSize: 7,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
  },
  fieldValueNormal: {
    fontSize: 9,
    color: colors.black,
  },
  // ── Blood type badge ──────────────────────────────────────────────
  bloodBadge: {
    backgroundColor: colors.red,
    color: colors.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  // ── Products table ────────────────────────────────────────────────
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellBold: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  // ── Info box ──────────────────────────────────────────────────────
  infoBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: colors.gray },
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}
function val(v: unknown) { return v ? String(v) : '—' }

interface TransfusionRequest {
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
  contact_phone?: string
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
  created_at?: string
}

// ── Products list ─────────────────────────────────────────────────────────────
function getProducts(req: TransfusionRequest) {
  const p: { name: string; amount: string }[] = []
  if (req.wb_fresh_volume)            p.push({ name: 'Whole Blood (Segar)',    amount: `${req.wb_fresh_volume} cc` })
  if (req.wb_new_volume)              p.push({ name: 'Whole Blood (Baru)',     amount: `${req.wb_new_volume} cc` })
  if (req.wb_regular_volume)          p.push({ name: 'Whole Blood (Biasa)',    amount: `${req.wb_regular_volume} cc` })
  if (req.prc_fresh_volume)           p.push({ name: 'PRC (Segar)',            amount: `${req.prc_fresh_volume} cc` })
  if (req.prc_regular_volume)         p.push({ name: 'PRC (Biasa)',            amount: `${req.prc_regular_volume} cc` })
  if (req.prc_washed_volume)          p.push({ name: 'PRC (Cuci)',             amount: `${req.prc_washed_volume} cc` })
  if (req.plasma_regular_volume)      p.push({ name: 'Plasma (Biasa)',         amount: `${req.plasma_regular_volume} cc` })
  if (req.plasma_ffp_volume)          p.push({ name: 'FFP',                   amount: `${req.plasma_ffp_volume} cc` })
  if (req.factor_thrombocyte_bags)    p.push({ name: 'Trombosit Konsentrat',  amount: `${req.factor_thrombocyte_bags} kantong` })
  if (req.factor_cryoprecipitate_bags)p.push({ name: 'Cryoprecipitate',       amount: `${req.factor_cryoprecipitate_bags} kantong` })
  if (req.factor_buffycoat_bags)      p.push({ name: 'Buffy Coat',            amount: `${req.factor_buffycoat_bags} kantong` })
  if (req.factor_other)               p.push({ name: 'Lainnya',               amount: req.factor_other })
  return p
}

// ── Main Document ─────────────────────────────────────────────────────────────
export function TransfusionRequestPDF({ request }: { request: TransfusionRequest }) {
  const products = getProducts(request)
  const printDate = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })

  return (
    <Document title={`Permintaan Transfusi - ${request.patient_name}`}>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Blood-Connect Palu</Text>
            <Text style={styles.headerSub}>Unit Transfusi Darah / Bank Darah · PMI Kota Palu</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Permintaan Darah Transfusi</Text>
            <Text style={styles.docId}>No: {request.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.docDate}>Dicetak: {printDate}</Text>
          </View>
        </View>

        {/* ── Info Identitas Pemohon ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. Identitas Pemohon</Text>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Rumah Sakit</Text>
              <Text style={styles.fieldValue}>{val(request.requesting_hospital)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Dokter yang Meminta</Text>
              <Text style={styles.fieldValue}>{val(request.requesting_doctor)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Bagian / Ward</Text>
              <Text style={styles.fieldValueNormal}>{val(request.bagian)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Kelas Perawatan</Text>
              <Text style={styles.fieldValueNormal}>{val(request.kelas)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>No. Registrasi</Text>
              <Text style={styles.fieldValueNormal}>{val(request.no_reg)}</Text>
            </View>
          </View>
        </View>

        {/* ── Data Pasien ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II. Data Pasien</Text>
          <View style={styles.row}>
            <View style={{ flex: 2, paddingRight: 8 }}>
              <Text style={styles.fieldLabel}>Nama Lengkap Pasien</Text>
              <Text style={styles.fieldValue}>{val(request.patient_name)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Tanggal Lahir</Text>
              <Text style={styles.fieldValueNormal}>{formatDate(request.birth_date)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Umur</Text>
              <Text style={styles.fieldValueNormal}>
                {request.age_years != null ? `${request.age_years} Thn` : '—'}
                {request.age_months != null ? ` ${request.age_months} Bln` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Alamat</Text>
              <Text style={styles.fieldValueNormal}>{val(request.address)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>No. Kontak / WhatsApp</Text>
              <Text style={styles.fieldValueNormal}>{val(request.contact_phone)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Tanggal Permintaan</Text>
              <Text style={styles.fieldValueNormal}>{formatDate(request.request_date)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Tanggal Diperlukan</Text>
              <Text style={styles.fieldValueNormal}>{formatDate(request.needed_date)}</Text>
            </View>
          </View>
        </View>

        {/* ── Diagnosa Klinis ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>III. Diagnosa &amp; Klinis</Text>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Diagnosa Klinis</Text>
              <Text style={styles.fieldValueNormal}>{val(request.diagnosis)}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.fieldLabel}>Alasan Transfusi</Text>
              <Text style={styles.fieldValueNormal}>{val(request.transfusion_reason)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Hb (g/%)</Text>
              <Text style={styles.fieldValue}>{request.hemoglobin ? `${request.hemoglobin} g/%` : '—'}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Transfusi Sebelumnya</Text>
              <Text style={styles.fieldValueNormal}>{request.has_previous_transfusion ? 'Pernah' : 'Belum Pernah'}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Pernah Reaksi</Text>
              <Text style={styles.fieldValueNormal}>{request.had_reaction ? 'Ya' : 'Tidak'}</Text>
            </View>
          </View>
        </View>

        {/* ── Golongan Darah & Produk ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IV. Golongan Darah &amp; Produk Diminta</Text>
          <View style={styles.row}>
            <View style={{ marginRight: 16 }}>
              <Text style={styles.fieldLabel}>Golongan Darah</Text>
              <Text style={styles.bloodBadge}>
                {val(request.blood_type)}{val(request.rhesus)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {products.length > 0 ? (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCellBold, { flex: 2 }]}>Jenis Produk</Text>
                    <Text style={styles.tableCellBold}>Jumlah</Text>
                  </View>
                  {products.map((p, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{p.name}</Text>
                      <Text style={styles.tableCell}>{p.amount}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.fieldValueNormal}>Tidak ada produk yang dipilih</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Tanda Tangan ── */}
        <View style={[styles.row, { marginTop: 20, justifyContent: 'space-between' }]}>
          <View style={{ alignItems: 'center', width: 160 }}>
            <Text style={styles.fieldLabel}>Dokter yang Meminta</Text>
            <View style={{ height: 50, borderBottomWidth: 1, borderBottomColor: colors.border, width: '100%', marginTop: 40 }} />
            <Text style={[styles.fieldValueNormal, { marginTop: 4 }]}>{val(request.requesting_doctor)}</Text>
          </View>
          <View style={{ alignItems: 'center', width: 160 }}>
            <Text style={styles.fieldLabel}>Petugas Penerima UTD</Text>
            <View style={{ height: 50, borderBottomWidth: 1, borderBottomColor: colors.border, width: '100%', marginTop: 40 }} />
            <Text style={[styles.fieldValueNormal, { marginTop: 4 }]}>( __________________ )</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Blood-Connect Palu — Sistem Informasi Transfusi Darah</Text>
          <Text style={styles.footerText}>No. Permintaan: {request.id.slice(0, 8).toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  )
}
