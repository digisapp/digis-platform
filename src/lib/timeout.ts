export async function withTimeout<T>(p: Promise<T>, ms = 3000): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, rej) => t = setTimeout(() => rej(new Error('Timeout')), ms));
  try { return await Promise.race([p, timeout]); }
  finally { clearTimeout(t); }
}
