// КОД, ПРИ КОТОРОМ ПЕРЕСТАЛИ ЗАГРУЖАТЬСЯ ДАННЫЕ ПО ЗАПРОСУ ИЗИНПУТА

import { fetchBestPodcasts, searchPodcasts } from "./api.js";
import { debounce } from "./debounce.js";

const app = document.getElementById("app");

// ==== Простое "состояние" страницы ====
let currentMode = "best"; // "best" или "search"
let currentQuery = "";
let currentPage = 1; // для best_podcasts (номер страницы)
let currentOffset = 0; // для search (смещение)
let hasMore = true;
let isLoading = false;

// Чтобы не путать ответы от "устаревших" запросов при быстром вводе
let activeController = null;

// ==== Разметка страницы (создаём один раз) ====
app.innerHTML = `
  <input type="search" id="search-input" placeholder="Поиск подкастов..." autocomplete="off" />
  <div id="status-message"></div>
  <div id="podcast-list"></div>
  <button id="load-more-btn" type="button">Загрузить ещё</button>
`;

const searchInput = document.getElementById("search-input");
const statusMessage = document.getElementById("status-message");
const listContainer = document.getElementById("podcast-list");
const loadMoreBtn = document.getElementById("load-more-btn");

loadMoreBtn.style.display = "none";

// ==== Вспомогательные функции отображения статуса ====
function showStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.classList.toggle("error", isError);
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.classList.remove("error");
}

// ==== Создание карточки подкаста ====
function createPodcastCard(podcast) {
  const card = document.createElement("div");
  card.className = "podcast-card";

  const img = document.createElement("img");
  img.src = podcast.image || podcast.thumbnail || "";
  img.alt = podcast.title || "Podcast cover";
  img.loading = "lazy";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.textContent = podcast.title || "Без названия";

  const publisher = document.createElement("p");
  publisher.textContent = podcast.publisher || "";

  body.appendChild(title);
  body.appendChild(publisher);

  card.appendChild(img);
  card.appendChild(body);

  // Пока страницы деталей подкаста ещё нет (будет в следующем разделе)
  card.addEventListener("click", () => {
    console.log("Открыт подкаст:", podcast.id, podcast.title);
  });

  return card;
}

// ==== Отрисовка списка карточек ====
function renderPodcasts(podcasts, append) {
  if (!append) {
    listContainer.innerHTML = "";
  }

  if (podcasts.length === 0 && !append) {
    showStatus("Ничего не найдено.");
    return;
  }

  // DocumentFragment — чтобы вставить все карточки за один раз,
  // а не дёргать DOM по одной карточке
  const fragment = document.createDocumentFragment();
  podcasts.forEach((podcast) => {
    fragment.appendChild(createPodcastCard(podcast));
  });
  listContainer.appendChild(fragment);
}

// ==== Управление состоянием кнопки "Загрузить ещё" ====
function updateLoadMoreButton() {
  loadMoreBtn.style.display = hasMore ? "block" : "none";
  loadMoreBtn.disabled = isLoading;
  loadMoreBtn.textContent = isLoading ? "Загрузка..." : "Загрузить ещё";
}

// ==== Загрузка best_podcasts ====
async function loadBestPodcasts(page, append) {
  // отменяем предыдущий незавершённый запрос, если есть
  activeController?.abort();
  activeController = new AbortController();

  isLoading = true;
  updateLoadMoreButton();
  if (!append) {
    clearStatus();
    showStatus("Загрузка...");
  }

  try {
    const data = await fetchBestPodcasts(page);
    if (!append) clearStatus();
    renderPodcasts(data.podcasts || [], append);
    hasMore = Boolean(data.next_page_number);
  } catch (err) {
    if (err.name === "AbortError") return; // это ожидаемо, не настоящая ошибка
    console.error(err);
    showStatus("Не удалось загрузить подкасты. Попробуйте ещё раз.", true);
    hasMore = false;
  } finally {
    isLoading = false;
    updateLoadMoreButton();
  }
}

// ==== Поиск подкастов ====
async function loadSearchResults(query, offset, append) {
  activeController?.abort();
  activeController = new AbortController();

  isLoading = true;
  updateLoadMoreButton();
  if (!append) {
    clearStatus();
    showStatus("Поиск...");
  }

  try {
    const data = await searchPodcasts(query, offset);
    if (!append) clearStatus();
    renderPodcasts(data.results || [], append);
    hasMore = Boolean(data.next_offset);
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error(err);
    showStatus("Не удалось выполнить поиск. Попробуйте ещё раз.", true);
    hasMore = false;
  } finally {
    isLoading = false;
    updateLoadMoreButton();
  }
}

// ==== Обработчик ввода в поле поиска (с debounce) ====
const handleSearchInput = debounce(() => {
  const query = searchInput.value.trim();
  currentQuery = query;

  if (query === "") {
    currentMode = "best";
    currentPage = 1;
    loadBestPodcasts(currentPage, false);
  } else {
    currentMode = "search";
    currentOffset = 0;
    loadSearchResults(query, currentOffset, false);
  }
}, 400);

searchInput.addEventListener("input", handleSearchInput);

// ==== Обработчик кнопки "Загрузить ещё" ====
loadMoreBtn.addEventListener("click", () => {
  if (isLoading) return;

  if (currentMode === "best") {
    currentPage += 1;
    loadBestPodcasts(currentPage, true);
  } else {
    currentOffset += 10;
    loadSearchResults(currentQuery, currentOffset, true);
  }
});

// ==== Первая загрузка при открытии страницы ====
loadBestPodcasts(currentPage, false);
