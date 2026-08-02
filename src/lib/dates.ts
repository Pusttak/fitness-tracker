// Текущая дата в локальном часовом поясе в формате YYYY-MM-DD
export function getLocalToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Форматирование даты для отображения: "2 августа, пятница"
export function formatDateFull(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
}

// Короткий формат: "2 авг"
export function formatDateShort(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

// Формат ДД.ММ.ГГГГ
export function formatDateDot(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}.${month}.${year}`
}

// Парсинг строки YYYY-MM-DD в Date без сдвига часового пояса
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Сдвиг даты на N дней
export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Разница в днях между двумя датами
export function diffDays(dateStr1: string, dateStr2: string): number {
  const d1 = parseLocalDate(dateStr1)
  const d2 = parseLocalDate(dateStr2)
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
}

// Проверка: это сегодня?
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalToday()
}
