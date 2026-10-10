// Validações inline em pt-BR, espelhando as regras do backend.

export function validateRequired(value: string, label: string): string | null {
  return value.trim().length === 0 ? `Por favor, preencha este campo (${label}).` : null;
}

export function validateEmail(value: string): string | null {
  if (value.trim().length === 0) return "Por favor, preencha este campo (e-mail).";
  if (!value.includes("@")) return "Inclua um '@' no endereço de e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return "Informe um e-mail completo e válido (ex.: nome@empresa.com).";
  return null;
}

// Regra definitiva de senha: 8+ caracteres, uma maiúscula e um especial.
export function validatePassword(value: string): string | null {
  if (value.length === 0) return "Por favor, preencha este campo (senha).";
  if (value.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(value)) return "Inclua ao menos uma letra MAIÚSCULA na senha.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Inclua ao menos um caractere especial (ex.: #, @, !).";
  return null;
}

export function validateName(value: string): string | null {
  if (value.trim().length === 0) return "Por favor, preencha este campo (nome).";
  if (value.trim().length < 2) return "Informe um nome com pelo menos 2 caracteres.";
  return null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (confirm.length === 0) return "Confirme a senha digitada.";
  if (password !== confirm) return "As senhas não coincidem.";
  return null;
}
