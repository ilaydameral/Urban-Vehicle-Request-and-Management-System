const { sendEmail } = require("./emailService");

function formatMapLink(address) {
  if (!address) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getPassengerFromTrip(trip, request) {
  if (trip?.passenger && trip.passenger.email) return trip.passenger;
  if (request?.passenger && request.passenger.email) return request.passenger;
  return null;
}

function getDriverUser(trip) {
  if (!trip?.driver) return null;

  if (trip.driver.user && trip.driver.user.email) return trip.driver.user;
  if (trip.driver.email) return trip.driver; // fallback if driver populated directly with a user

  return null;
}

function buildTripSnapshot({ request, vehicle }) {
  const vehicleLabel = vehicle
    ? `${vehicle.plateNumber || "Plaka Yok"} • ${[vehicle.brand, vehicle.model]
        .filter(Boolean)
        .join(" ")}`
    : "Araç bilgisi bekleniyor";

  return {
    pickupAddress: request?.pickupAddress || "Belirtilmedi",
    dropAddress: request?.dropAddress || "Belirtilmedi",
    vehicleLabel,
  };
}

function renderCardSection(title, rows) {
  const renderedRows = rows
    .filter((r) => r && r.value)
    .map(
      (row) => `
        <div style="margin-top:8px; display:flex; justify-content:space-between; color:#cbd5e1;">
          <span style="font-weight:600; color:#e2e8f0;">${row.label}</span>
          <span style="text-align:right;">${row.value}</span>
        </div>`
    )
    .join("");

  if (!renderedRows) return "";

  return `
    <div style="margin-top:16px; padding:16px; border:1px solid #1f2937; border-radius:12px; background:#0f172a;">
      <div style="font-weight:700; color:#f8fafc; margin-bottom:8px;">${title}</div>
      ${renderedRows}
    </div>`;
}

function wrapEmailContent({ heading, body, cta }) {
  return `
    <div style="font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif; background:#0b1220; padding:24px; color:#e2e8f0;">
      <div style="max-width:640px; margin:0 auto; background:#0f172a; border:1px solid #1f2937; border-radius:16px; padding:24px; box-shadow:0 12px 32px rgba(0,0,0,0.35);">
        <h2 style="margin-top:0; color:#f1f5f9;">${heading}</h2>
        <p style="margin:12px 0 16px; color:#cbd5e1; line-height:1.6;">${body}</p>
        ${cta || ""}
      </div>
      <div style="margin-top:12px; color:#64748b; font-size:13px; text-align:center;">Bu mesaj Urban Vehicle Request & Management System tarafından oluşturuldu.</div>
    </div>`;
}

async function sendTripAssignmentNotifications(trip) {
  const passenger = getPassengerFromTrip(trip, trip.request);
  const driverUser = getDriverUser(trip);
  const snapshot = buildTripSnapshot({ request: trip.request, vehicle: trip.vehicle });

  const mapLink = formatMapLink(snapshot.pickupAddress);
  const locationCta = `<a href="${mapLink}" style="display:inline-block; margin-top:12px; padding:12px 18px; background:#22c55e; color:#0b1220; text-decoration:none; font-weight:700; border-radius:10px;">Google Haritada Görüntüle</a>`;

  if (passenger?.email) {
    const html = wrapEmailContent({
      heading: "Aracınız Görevlendirildi",
      body: `Sayın ${passenger.name || "yolcu"}, talebiniz için bir araç ve şoför atandı.`,
      cta:
        renderCardSection("Talep Bilgileri", [
          { label: "Kalkış", value: snapshot.pickupAddress },
          { label: "Varış", value: snapshot.dropAddress },
        ]) +
        renderCardSection("Görev Bilgileri", [
          { label: "Araç", value: snapshot.vehicleLabel },
          { label: "Şoför", value: driverUser?.name },
        ]) +
        locationCta,
    });

    await sendEmail({
      to: passenger.email,
      subject: "Aracınız Görevlendirildi",
      text: `Talebiniz için araç atandı. Kalkış: ${snapshot.pickupAddress} | Varış: ${snapshot.dropAddress}`,
      html,
    });
  }

  if (driverUser?.email) {
    const html = wrapEmailContent({
      heading: "Yeni Görev Atandı",
      body: `Merhaba ${driverUser.name || "Şoför"}, yeni bir yolculuk görevi size atandı.`,
      cta:
        renderCardSection("Talep Bilgileri", [
          { label: "Kalkış", value: snapshot.pickupAddress },
          { label: "Varış", value: snapshot.dropAddress },
        ]) +
        renderCardSection("Araç", [
          { label: "Plaka / Model", value: snapshot.vehicleLabel },
        ]) +
        locationCta,
    });

    await sendEmail({
      to: driverUser.email,
      subject: "Yeni Görev Atandı",
      text: `Yeni görev: ${snapshot.pickupAddress} -> ${snapshot.dropAddress}`,
      html,
    });
  }
}

async function sendTripCancellationNotifications({ trip, request, cancelledBy = "sistem" }) {
  const passenger = getPassengerFromTrip(trip, request);
  const driverUser = getDriverUser(trip);
  const snapshot = buildTripSnapshot({ request, vehicle: trip?.vehicle });

  const reasonLine =
    cancelledBy === "DRIVER"
      ? "Görev şoför tarafından iptal edildi."
      : cancelledBy === "PASSENGER"
        ? "Talep yolcu tarafından iptal edildi."
        : "Görev iptal edildi.";

  if (passenger?.email) {
    const html = wrapEmailContent({
      heading: "Talebiniz / Seyahatiniz İptal Edildi",
      body: `Sayın ${passenger.name || "yolcu"}, ${reasonLine}`,
      cta: renderCardSection("Talep Özeti", [
        { label: "Kalkış", value: snapshot.pickupAddress },
        { label: "Varış", value: snapshot.dropAddress },
        { label: "Araç", value: snapshot.vehicleLabel },
      ]),
    });

    await sendEmail({
      to: passenger.email,
      subject: "Talebiniz / Seyahatiniz İptal Edildi",
      text: `${reasonLine} Kalkış: ${snapshot.pickupAddress} | Varış: ${snapshot.dropAddress}`,
      html,
    });
  }

  if (driverUser?.email) {
    const html = wrapEmailContent({
      heading: "Görev İptal Edildi",
      body: `Merhaba ${driverUser.name || "Şoför"}, size atanmış görev iptal edildi. ${reasonLine}`,
      cta: renderCardSection("Görev Özeti", [
        { label: "Kalkış", value: snapshot.pickupAddress },
        { label: "Varış", value: snapshot.dropAddress },
        { label: "Araç", value: snapshot.vehicleLabel },
      ]),
    });

    await sendEmail({
      to: driverUser.email,
      subject: "Görev İptal Edildi",
      text: `Görev iptal edildi. ${snapshot.pickupAddress} -> ${snapshot.dropAddress}`,
      html,
    });
  }
}

module.exports = {
  sendTripAssignmentNotifications,
  sendTripCancellationNotifications,
};
