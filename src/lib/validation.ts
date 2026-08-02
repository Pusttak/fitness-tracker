const NON_NEGATIVE_RE = /^\d+([.,]\d+)?$/
const ONE_DECIMAL_RE = /^\d+([.,]\d)?$/

export interface NumberInputOptions {
  min: number
  max: number
  /** Ограничивает ввод одним знаком после запятой (вес, замеры) */
  oneDecimal?: boolean
}

/**
 * Проверяет строковый ввод числового поля: запрещает отрицательные значения
 * и (опционально) более одного знака после запятой, проверяет диапазон.
 */
export function isValidNumberInput(raw: string, { min, max, oneDecimal }: NumberInputOptions): boolean {
  const trimmed = raw.trim()
  if (trimmed === '') return false

  const pattern = oneDecimal ? ONE_DECIMAL_RE : NON_NEGATIVE_RE
  if (!pattern.test(trimmed)) return false

  const value = parseFloat(trimmed.replace(',', '.'))
  return !Number.isNaN(value) && value >= min && value <= max
}

export function parseNumberInput(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}
