export function devLog(message: string, ...args: unknown[]) {
  console.log(message, ...args)
}

export function devError(message: string, ...args: unknown[]) {
  console.error(message, ...args)
}
