export function verifyAdminPasswordCore(password: string) {
  return password === process.env.ADMIN_PASSWORD;
}
