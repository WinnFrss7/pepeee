// app/api/send-message/route.js
import { getApifyResult } from "@/utils/getApifyResult";
import { sendWhatsAppMessage } from "@/utils/twilioClient";
import { formatPresenceMessage } from "@/utils/formatPresenceMessage";
import { getUserAndDecrypt } from "@/utils/supabaseQuery";

export async function POST(request) {

    const {result: user} = await getUserAndDecrypt()

    const apifyResult = await getApifyResult(user);

    // const message = formatPresenceMessage(apifyResult);
    try {
        // const result = await sendWhatsAppMessage(message);
        return new Response(JSON.stringify({ success: true, apifyResult }), {
        status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        });
    }
}



