export const MIN_PASSWORD = 8;

/** Erro da nova senha (ou "" se estiver boa). */
export function newPasswordError(password: string, confirm: string) {
  if (password.length < MIN_PASSWORD) return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (password !== confirm) return "As duas senhas não são iguais.";
  return "";
}
