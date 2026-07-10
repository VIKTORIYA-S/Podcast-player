// ==== Настройки API ====
//
// Сейчас используется ТЕСТОВЫЙ режим (без ключа, фейковые данные).
// Когда придёт настоящий API-ключ:
//   1. Замените BASE_URL на "https://listen-api.listennotes.com/api/v2"
//   2. Впишите ключ в API_KEY
//
const BASE_URL = "https://listen-api-test.listennotes.com/api/v2";
const API_KEY = ""; // в тестовом режиме ключ не нужен

// Общая функция для запросов к API
async function request(path) {
  const headers = {
    Accept: "application/json",
  };

  // Заголовок с ключом добавляем только если он есть
  // (в тестовом режиме без ключа запрос тоже работает)
  if (API_KEY) {
    headers["X-ListenAPI-Key"] = API_KEY;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Ошибка запроса: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Получить список лучших/недавних подкастов
// page: номер страницы (начиная с 1)
async function fetchBestPodcasts(page = 1) {
  const path = `/best_podcasts?sort=recent_published_first&page=${page}`;
  return request(path);
}

// Поиск подкастов по тексту
// query: поисковый запрос
// offset: смещение для пагинации (0 для первой страницы)
async function searchPodcasts(query, offset = 0) {
  const path = `/search?q=${encodeURIComponent(query)}&type=podcast&offset=${offset}`;
  return request(path);
}

// Получить детальную информацию о подкасте + его эпизоды
// id: идентификатор подкаста (podcast.id из результатов поиска/списка)
// nextEpisodePubDate: для пагинации эпизодов (необязательный параметр).
//   Берём это значение из ответа предыдущего запроса и передаём дальше,
//   чтобы получить следующую "порцию" эпизодов (обычно API отдаёт их по 10 штук).
async function fetchPodcastById(id, nextEpisodePubDate) {
  let path = `/podcasts/${id}`;
  if (nextEpisodePubDate) {
    path += `?next_episode_pub_date=${nextEpisodePubDate}`;
  }
  return request(path);
}

export { fetchBestPodcasts, searchPodcasts, fetchPodcastById };
