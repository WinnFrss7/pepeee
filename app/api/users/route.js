import { supabase } from "@/utils/supabase"

export async function GET(request) {
    const {data, error} = await supabase.from('users').select('*')
    return new Response(JSON.stringify({ ...data }), {
        status: 200,
    })
}

export async function POST(request) {
    const requestBody = await request.json();
    console.log("Request Body:", requestBody);
    let status
    if(requestBody.status == "pending") {
        status = "active"
    } else {
        status = "pending"
    }

    const { data, error } = await supabase.from('users').update([
        {
            username: requestBody.username,
            job: requestBody.job,
            status: status,
            last_post: Date.now(),
        },
    ]).eq("id", requestBody.id)
    .select();

    console.log("Supabase Insert Data:", data);
    console.log("Supabase Insert Error:", error);

    return new Response(JSON.stringify({ data, error }), {
        status: 200,
    });
}
