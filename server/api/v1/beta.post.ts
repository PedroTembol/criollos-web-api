import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  if (!body.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required',
    })
  }

  // Por ahora loggeamos el interés en la consola/logs del servidor
  // En el futuro esto podría ir a Supabase o una Google Sheet
  console.log(`[BETA SIGNUP] New interest from: ${body.email} at ${new Date().toISOString()}`)

  return {
    ok: true,
    message: 'Registrado con éxito'
  }
})
