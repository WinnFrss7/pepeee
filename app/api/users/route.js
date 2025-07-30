import { getUserAndDecrypt, addUserAndEncrypt } from "@/utils/supabaseQuery";
export async function GET(request) {
    const {data, result, error} = await getUserAndDecrypt()

    return new Response(JSON.stringify(result), {
        status: 200,
    })
}

export async function POST(request) {
    const requestBody = await request.json();
    console.log("Request Body:", requestBody);
    
    const {data, error}  = await addUserAndEncrypt(requestBody)

    console.log("Supabase Insert Data:", data);
    console.log("Supabase Insert Error:", error);

    return new Response(JSON.stringify({ data, error }), {
        status: 200,
    });
}
