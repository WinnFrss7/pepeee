import { supabase } from "./supabase"
import { encrypt, decrypt } from "./encryptor"

export const getUserAndDecrypt = async () => {
    const {data, error} = await supabase.from('user').select('*')

    const result = data.map(v => {
        const decrypted = decrypt(v.encryptedPassword)
    
        return {
            ...v,
            password: decrypted
        }
    })

    return {
        data,
        result,
        error
    }
}

export const addUserAndEncrypt = async (requestBody) => {
    const encryptedPassword = encrypt(password);

     const {nip, password, username, phone} = requestBody

    const { data, error } = await supabase.from('user').insert([
        {
            nip,
            encryptedPassword,
            username,
            phone,
        },
    ]).select();

    return {
        data,
        error
    }
}