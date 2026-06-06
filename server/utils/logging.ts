export function devLog(message: string, ...args: unknown[]) {
  if (import.meta.dev) {
    console.log(message, ...args)
  }
}

export function devError(message: string, ...args: unknown[]) {
  if (import.meta.dev) {
    console.error(message, ...args)
  }
}
