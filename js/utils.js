// Убирает HTML-теги из описания (Listen Notes часто присылает
// описание с тегами вроде <p>, <a> и т.д.)
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

// Превращает миллисекунды в читаемую дату, например "10 июля 2026"
function formatDate(pubDateMs) {
  if (!pubDateMs) return "";
  const date = new Date(pubDateMs);
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Превращает секунды в "мм:сс" или "чч:мм:сс"
function formatDuration(sec) {
  if (!sec) return "";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  const pad = (n) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export { stripHtml, formatDate, formatDuration };
