// twilioClient.js
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken =  process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// 🧠 Now receives a `text` parameter
export async function sendWhatsAppMessage(text) {
  try {
    const message = await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+6285754834306',
      body: text, // 👈 use body instead of contentSid
    });

    console.log('✅ Message sent with SID:', message.sid);
    return message;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    throw error;
  }
}
