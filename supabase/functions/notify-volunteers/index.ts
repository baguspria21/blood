// ============================================================
// Blood-Connect Palu | Supabase Edge Function
// File: supabase/functions/notify-volunteers/index.ts
//
// TRIGGER: Dipanggil dari Admin API saat status blood_request
//          diupdate menjadi 'approved'.
//
// CARA DEPLOY:
//   supabase functions deploy notify-volunteers
//
// ENV VARIABLES (set via Supabase Dashboard > Edge Functions > Secrets):
//   WA_GATEWAY_URL   = https://api.fonnte.com/send  (atau Watzap)
//   WA_GATEWAY_TOKEN = <token dari Fonnte/Watzap>
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// TYPES
// ============================================================
interface RequestPayload {
  request_id: string; // UUID dari blood_request yang baru di-approve
}

interface Volunteer {
  id: string;
  name: string;
  phone_number: string;
}

interface BloodRequest {
  id: string;
  patient_name: string;
  blood_type: string;
  rhesus: string;
  bags_needed: number;
  bags_fulfilled: number;
  hospital: {
    name: string;
    address: string;
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req: Request) => {
  // Hanya menerima POST request
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { request_id } = payload;

    if (!request_id) {
      return new Response(
        JSON.stringify({ error: "request_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Inisialisasi Supabase Client dengan Service Role Key
    // (Service Role Key melewati RLS, diperlukan untuk query seluruh data relawan)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ----------------------------------------------------------
    // STEP 1: Ambil detail Blood Request yang baru di-approve
    // ----------------------------------------------------------
    const { data: bloodRequest, error: requestError } = await supabase
      .from("blood_requests")
      .select(`
        id,
        patient_name,
        blood_type,
        rhesus,
        bags_needed,
        bags_fulfilled,
        hospital:hospitals (
          name,
          address
        )
      `)
      .eq("id", request_id)
      .eq("status", "approved")
      .single();

    if (requestError || !bloodRequest) {
      console.error("Request not found or not approved:", requestError);
      return new Response(
        JSON.stringify({ error: "Blood request not found or not approved" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const br = bloodRequest as BloodRequest;

    // ----------------------------------------------------------
    // STEP 2: Cari relawan yang cocok (Filtering Logic)
    //
    // Kriteria:
    // 1. blood_type == blood_type request
    // 2. rhesus == rhesus request
    // 3. is_active == true (tidak sedang dalam cooldown)
    // 4. last_donated_at IS NULL OR last_donated_at < (now - 90 days)
    //    => Belum pernah donor atau sudah lebih dari 90 hari sejak donor terakhir
    // ----------------------------------------------------------
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cooldownDate = ninetyDaysAgo.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    const { data: volunteers, error: volunteerError } = await supabase
      .from("profiles")
      .select("id, name, phone_number")
      .eq("blood_type", br.blood_type)
      .eq("rhesus", br.rhesus)
      .eq("is_active", true)
      .eq("role", "volunteer")
      .or(`last_donated_at.is.null,last_donated_at.lt.${cooldownDate}`);

    if (volunteerError) {
      console.error("Error fetching volunteers:", volunteerError);
      throw volunteerError;
    }

    if (!volunteers || volunteers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No matching volunteers found",
          volunteers_notified: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ----------------------------------------------------------
    // STEP 3: Kirim WA Notification via Gateway
    // Menggunakan Promise.allSettled agar 1 kegagalan tidak
    // menghentikan pengiriman ke relawan lainnya.
    // ----------------------------------------------------------
    const WA_GATEWAY_URL = Deno.env.get("WA_GATEWAY_URL")!;
    const WA_GATEWAY_TOKEN = Deno.env.get("WA_GATEWAY_TOKEN")!;

    const bagsRemaining = br.bags_needed - br.bags_fulfilled;
    const respondUrl = `${Deno.env.get("NEXT_PUBLIC_APP_URL")}/api/v1/volunteer/respond/${br.id}`;

    const notificationResults = await Promise.allSettled(
      (volunteers as Volunteer[]).map(async (volunteer) => {
        const message = buildWhatsAppMessage({
          volunteerName: volunteer.name,
          patientName: br.patient_name,
          bloodType: `${br.blood_type}${br.rhesus}`,
          bagsRemaining,
          hospitalName: br.hospital.name,
          hospitalAddress: br.hospital.address,
          respondUrl: `${respondUrl}?uid=${volunteer.id}`,
        });

        // Fonnte API Format
        const response = await fetch(WA_GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: WA_GATEWAY_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target: volunteer.phone_number, // Nomor WA tujuan
            message: message,
            delay: "2", // Delay 2 detik antar pesan (anti-spam)
            countryCode: "62", // Indonesia
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to send WA to ${volunteer.phone_number}: ${response.statusText}`
          );
        }

        return { volunteer_id: volunteer.id, phone: volunteer.phone_number, status: "sent" };
      })
    );

    // Hitung berapa yang berhasil dan gagal
    const sent = notificationResults.filter((r) => r.status === "fulfilled").length;
    const failed = notificationResults.filter((r) => r.status === "rejected").length;

    // Log errors untuk monitoring
    notificationResults
      .filter((r) => r.status === "rejected")
      .forEach((r) => console.error("WA send failed:", (r as PromiseRejectedResult).reason));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Broadcast selesai untuk request ${request_id}`,
        volunteers_found: volunteers.length,
        notifications_sent: sent,
        notifications_failed: failed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// HELPER: Membangun teks pesan WhatsApp
// ============================================================
function buildWhatsAppMessage(params: {
  volunteerName: string;
  patientName: string;
  bloodType: string;
  bagsRemaining: number;
  hospitalName: string;
  hospitalAddress: string;
  respondUrl: string;
}): string {
  return `🩸 *PERMINTAAN DARAH DARURAT - Blood-Connect Palu*

Halo, Kak *${params.volunteerName}*!

Ada pasien yang membutuhkan bantuan Anda segera.

👤 *Pasien:* ${params.patientName}
🩸 *Golongan Darah:* ${params.bloodType}
🏥 *RS Tujuan:* ${params.hospitalName}
📍 *Alamat:* ${params.hospitalAddress}
🩹 *Kantong Dibutuhkan:* ${params.bagsRemaining} kantong

Jika Anda *bersedia mendonor*, silakan klik link di bawah ini:
✅ *${params.respondUrl}*

Jika tidak bisa membantu saat ini, abaikan pesan ini. Terima kasih telah menjadi pahlawan tanpa tanda jasa! ❤️

_Blood-Connect Palu - PMI Kota Palu_`;
}
