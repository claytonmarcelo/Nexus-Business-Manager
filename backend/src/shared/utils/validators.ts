export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
  let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let rest = (sum * 10) % 11; if (rest === 10) rest = 0;
  if (rest !== parseInt(cleaned[9])) return false;
  sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10) rest = 0;
  return rest === parseInt(cleaned[10]);
}

export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) return false;
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0; let pos = size - 7;
  for (let i = size; i >= 1; i--) { sum += parseInt(numbers.charAt(size - i)) * pos--; if (pos < 2) pos = 9; }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  size += 1; numbers = cleaned.substring(0, size); sum = 0; pos = size - 7;
  for (let i = size; i >= 1; i--) { sum += parseInt(numbers.charAt(size - i)) * pos--; if (pos < 2) pos = 9; }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

export function isValidDocument(doc: string): boolean {
  const cleaned = doc.replace(/\D/g, '');
  if (cleaned.length === 11) return isValidCPF(cleaned);
  if (cleaned.length === 14) return isValidCNPJ(cleaned);
  return false;
}
