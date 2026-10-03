export async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  )
}

export async function sha256Hex(value: string): Promise<string> {
  return Array.from(await sha256(value), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}
