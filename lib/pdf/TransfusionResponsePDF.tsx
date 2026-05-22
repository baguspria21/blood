import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const colors = {
  red:      '#c0392b',
  darkRed:  '#922b21',
  gray:     '#666666',
  lightGray:'#f5f5f5',
  border:   '#dddddd',
  black:    '#1a1a1a',
  white:    '#ffffff',
  blue:     '#1d4ed8',
  green:    '#15803d',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.black,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
    paddingBottom: 10,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: colors.red },
  headerSub: { fontSize: 7.5, color: colors.gray, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.darkRed, textTransform: 'uppercase', letterSpacing: 0.8 },
  docId: { fontSize: 7.5, color: colors.gray, marginTop: 3 },
  docDate: { fontSize: 7.5, color: colors.gray, marginTop: 1 },

  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
    paddingBottom: 3,
    marginBottom: 6,
  },

  row: { flexDirection: 'row', marginBottom: 4 },
  col: { flex: 1, paddingRight: 8 },
  fieldLabel: { fontSize: 7, color: colors.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  fieldValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.black },
  fieldValueNormal: { fontSize: 9, color: colors.black },

  // Blood bag table
  bagTable: { marginTop: 4 },
  bagTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#922b21',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  bagTableHeaderCell: { color: colors.white, fontSize: 7.5, fontFamily: 'Helvetica-Bold', flex: 1 },
  bagTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  bagTableRowAlt: { backgroundColor: '#fef9f9' },
  bagTableCell: { flex: 1, fontSize: 8 },
  bagTableCellMono: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Signature area
  sigBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 6,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    width: 160,
  },
  sigImg: { width: 140, height: 52, objectFit: 'contain' },
  sigLabel: { fontSize: 7, color: colors.gray, marginTop: 4 },

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

  rejectedBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  rejectedTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#b91c1c', marginBottom: 3 },
  rejectedNote: { fontSize: 9, color: '#7f1d1d' },
})

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}
function val(v: unknown) { return v ? String(v) : '—' }

export interface TransfusionResponseRow {
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

export interface TransfusionResponsePDFProps {
  request: {
    id: string
    patient_name: string
    blood_type?: string | null
    rhesus?: string | null
    requesting_hospital?: string | null
    requesting_doctor?: string | null
    bagian?: string | null
    kelas?: string | null
    diagnosis?: string | null
    request_date?: string | null
    needed_date?: string | null
    contact_phone?: string
    status?: string
    rejection_notes?: string | null
  }
  responses: TransfusionResponseRow[]
}

export function TransfusionResponsePDF({ request, responses }: TransfusionResponsePDFProps) {
  const printDate = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })
  const isRejected = request.status === 'rejected'

  // Use the signature from the first response that has one
  const sigResponse = responses.find(r => r.receiver_signature)

  return (
    <Document title={`Surat Pengeluaran Darah - ${request.patient_name}`}>
      <Page size="A4" style={styles.page}>

        {/* ── Header / Letterhead ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Blood-Connect Palu</Text>
            <Text style={styles.headerSub}>Unit Transfusi Darah (UTD) · Bank Darah RSUD · PMI Kota Palu</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>
              {isRejected ? 'Surat Penolakan Darah' : 'Surat Pengeluaran Darah'}
            </Text>
            <Text style={styles.docId}>No. Ref: {request.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.docDate}>Dicetak: {printDate}</Text>
          </View>
        </View>

        {/* ── Penolakan / Tidak Tersedia ── */}
        {isRejected && (
          <View style={styles.rejectedBadge}>
            <Text style={styles.rejectedTitle}>⚠ Darah Tidak Tersedia</Text>
            <Text style={styles.rejectedNote}>
              {val(request.rejection_notes)}
            </Text>
          </View>
        )}

        {/* ── Identitas Permintaan ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. Data Permintaan</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Rumah Sakit Peminta</Text>
              <Text style={styles.fieldValue}>{val(request.requesting_hospital)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Dokter yang Meminta</Text>
              <Text style={styles.fieldValue}>{val(request.requesting_doctor)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Pasien</Text>
              <Text style={styles.fieldValue}>{val(request.patient_name)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Golongan Darah</Text>
              <Text style={styles.fieldValue}>{val(request.blood_type)}{val(request.rhesus)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Diagnosa</Text>
              <Text style={styles.fieldValueNormal}>{val(request.diagnosis)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Tanggal Permintaan</Text>
              <Text style={styles.fieldValueNormal}>{fmtDate(request.request_date)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Bagian</Text>
              <Text style={styles.fieldValueNormal}>{val(request.bagian)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Kelas</Text>
              <Text style={styles.fieldValueNormal}>{val(request.kelas)}</Text>
            </View>
          </View>
        </View>

        {/* ── Logbook Kantong Darah ── */}
        {!isRejected && responses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>II. Data Kantong Darah yang Dikeluarkan</Text>
            <View style={styles.bagTable}>
              <View style={styles.bagTableHeader}>
                {['No. Kantong', 'Jenis', 'Volume', 'Gol.', 'Rh', 'Tgl Ambil', 'Petugas ATD/PTTD', 'Tgl & Jam Keluar'].map((h, i) => (
                  <Text key={i} style={i === 0 ? [styles.bagTableHeaderCell, { flex: 1.5 }] : styles.bagTableHeaderCell}>{h}</Text>
                ))}
              </View>
              {responses.map((r, idx) => (
                <View
                  key={r.id}
                  style={idx % 2 === 1 ? [styles.bagTableRow, styles.bagTableRowAlt] : styles.bagTableRow}
                >
                  <Text style={[styles.bagTableCellMono, { flex: 1.5 }]}>{r.bag_number}</Text>
                  <Text style={styles.bagTableCell}>{val(r.blood_category)}</Text>
                  <Text style={styles.bagTableCell}>{val(r.volume_cc)}</Text>
                  <Text style={styles.bagTableCell}>{val(r.blood_type_abo)}</Text>
                  <Text style={styles.bagTableCell}>{val(r.rhesus)}</Text>
                  <Text style={styles.bagTableCell}>{fmtDate(r.collection_date)}</Text>
                  <Text style={styles.bagTableCell}>{val(r.officer_name)}</Text>
                  <Text style={styles.bagTableCell}>
                    {r.release_date ? `${fmtDate(r.release_date)} ${r.release_time ?? ''}` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Penerima & Tanda Tangan ── */}
        {!isRejected && sigResponse && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>III. Penerima &amp; Tanda Tangan</Text>
            <View style={[styles.row, { alignItems: 'flex-start', gap: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Nama Penerima</Text>
                <Text style={styles.fieldValue}>{val(sigResponse.receiver_name)}</Text>
              </View>
              <View style={styles.sigBox}>
                <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Tanda Tangan Penerima</Text>
                {sigResponse.receiver_signature ? (
                  <Image
                    src={sigResponse.receiver_signature}
                    style={styles.sigImg}
                  />
                ) : (
                  <View style={[styles.sigImg, { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }]} />
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Petugas UTD ── */}
        {!isRejected && (
          <View style={[styles.row, { marginTop: 12, justifyContent: 'flex-end' }]}>
            <View style={{ alignItems: 'center', width: 180 }}>
              <Text style={styles.fieldLabel}>Petugas UTD yang Mengeluarkan</Text>
              <View style={{ height: 48, width: '100%', marginTop: 8, borderBottomWidth: 1, borderColor: colors.border }} />
              <Text style={[styles.fieldValueNormal, { marginTop: 4 }]}>
                {val(responses[0]?.officer_name)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Blood-Connect Palu — Surat Pengeluaran Darah Resmi</Text>
          <Text style={styles.footerText}>Ref: {request.id.slice(0, 8).toUpperCase()} · {responses.length} kantong</Text>
        </View>
      </Page>
    </Document>
  )
}
