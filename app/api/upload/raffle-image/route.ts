import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export const runtime = "nodejs"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null

export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Config de Supabase no disponible" }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 })
    }

    const extFromName = file.name?.split(".").pop() || "png"
    const ext = extFromName.trim() === "" ? "png" : extFromName
    const path = `rifas/${crypto.randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from("rifas")
      .upload(path, Buffer.from(arrayBuffer), { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from("rifas").getPublicUrl(path)

    return NextResponse.json(
      {
        path,
        publicUrl: publicData.publicUrl,
      },
      { status: 200 },
    )
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error al subir imagen" }, { status: 500 })
  }
}
