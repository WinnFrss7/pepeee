export function formatPresenceMessage(rawData) {
  const entry = rawData[0];

  if (!entry) return "❌ Tidak ada data presensi.";

  const { captchaSolved, timestamp, witaTime, finalStatus } = entry;

  const date = new Date(timestamp).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Makassar",
  });

  const masuk = finalStatus?.presenceStatus?.presenceIn ?? {};
  const pulang = finalStatus?.presenceStatus?.presenceOut ?? {};

  const statusEmoji = (status) => {
    if (status === "COMPLETED") {
        return "✅";
    } else {
        return "❌";
    }
  };

  const formatLine = (label, data) => {
    const isDone = data?.status === "COMPLETED";
    const emoji = statusEmoji(data?.status);

    const timeText = isDone
      ? `${data.time} ${emoji}`
      : `BELUM ABSEN ${emoji}`;

    return `${label}: ${timeText}`;
  };

  return `🗓️ *Presensi ${date}*\n\n` +
    `🔐 Captcha: ${captchaSolved || "–"}\n` +
    `⏰ WITA Time: ${witaTime?.timeString || "–"}\n\n` +
    `👤 ${formatLine("Masuk", masuk)}\n` +
    `🏃 ${formatLine("Pulang", pulang)}`;
}
