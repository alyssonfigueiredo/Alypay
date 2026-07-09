const config = require('../config/env');

/**
 * Normaliza um telefone brasileiro em formatos variados (com máscara,
 * com/sem DDI, com/sem o 9º dígito) para E.164 sem símbolos (ex: 5511999999999).
 * Retorna null se não for possível normalizar com confiança.
 */
function normalizeBrazilianPhone(rawPhone) {
  if (!rawPhone) return null;

  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  const ddi = config.business.defaultCountryCode;

  // Remove zero de tronco eventualmente digitado antes do DDD (ex: 0XX9XXXXXXXX).
  if (digits.startsWith('0') && !digits.startsWith(ddi)) {
    digits = digits.slice(1);
  }

  let withoutDdi;
  if (digits.startsWith(ddi) && (digits.length === 12 || digits.length === 13)) {
    withoutDdi = digits.slice(ddi.length);
  } else if (digits.length === 10 || digits.length === 11) {
    withoutDdi = digits;
  } else {
    return null;
  }

  const areaCode = withoutDdi.slice(0, 2);
  let subscriberNumber = withoutDdi.slice(2);

  if (!/^[1-9]{2}$/.test(areaCode)) return null;

  // Celulares brasileiros têm 9 dígitos e começam com 9. Números com 8
  // dígitos cujo primeiro dígito indica celular (6-9) vieram sem o 9º
  // dígito (comum em planilhas antigas) — adicionamos para bater com o
  // formato que o WhatsApp espera.
  if (subscriberNumber.length === 8 && /^[6-9]/.test(subscriberNumber)) {
    subscriberNumber = `9${subscriberNumber}`;
  }

  if (subscriberNumber.length !== 8 && subscriberNumber.length !== 9) {
    return null;
  }

  return `${ddi}${areaCode}${subscriberNumber}`;
}

module.exports = { normalizeBrazilianPhone };
