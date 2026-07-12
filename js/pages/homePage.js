import { fetchBestPodcasts, searchPodcasts } from "../api.js";
import { debounce } from "../debounce.js";

// Отрисовывает главную страницу внутри container.
// navigate — функция для перехода на другую "страницу" (передаётся из main.js).
// Возвращает cleanup-функцию, которую main.js вызовет перед уходом с этой страницы.
function renderHomePage(container, navigate) {
  // ==== Состояние страницы ====
  let currentMode = "best"; // "best" или "search"
  let currentQuery = "";
  let currentPage = 1;
  let currentOffset = 0;
  let hasMore = true;
  let isLoading = false;
  let activeController = null;

  // ==== Разметка ====
  container.innerHTML = `
    <input type="search" id="search-input" placeholder="Поиск подкастов..." autocomplete="off" />
     <h2 id="list-heading" class="list-heading">Рекомендуемые подкасты</h2>
    <div id="status-message"></div>
    <div id="podcast-list"></div>
    <button id="load-more-btn" type="button">Загрузить ещё</button>
  `;

  const searchInput = container.querySelector("#search-input");
  const listHeading = container.querySelector("#list-heading");
  const statusMessage = container.querySelector("#status-message");
  const listContainer = container.querySelector("#podcast-list");
  const loadMoreBtn = container.querySelector("#load-more-btn");

  loadMoreBtn.style.display = "none";

  function showStatus(text, isError = false) {
    statusMessage.textContent = text;
    statusMessage.classList.toggle("error", isError);
  }

  function clearStatus() {
    statusMessage.textContent = "";
    statusMessage.classList.remove("error");
  }

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

    // Клик по карточке — переход на страницу подкаста
    card.addEventListener("click", () => {
      navigate("podcast", { id: podcast.id });
    });

    return card;
  }

  function renderPodcasts(podcasts, append) {
    if (!append) {
      listContainer.innerHTML = "";
    }

    if (podcasts.length === 0 && !append) {
      showStatus("Ничего не найдено.");
      return;
    }

    const fragment = document.createDocumentFragment();
    podcasts.forEach((podcast) => {
      fragment.appendChild(createPodcastCard(podcast));
    });
    listContainer.appendChild(fragment);
  }

  function updateLoadMoreButton() {
    loadMoreBtn.style.display = hasMore ? "block" : "none";
    loadMoreBtn.disabled = isLoading;
    loadMoreBtn.textContent = isLoading ? "Загрузка..." : "Загрузить ещё";
  }

  async function loadBestPodcasts(page, append) {
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
      if (err.name === "AbortError") return;
      console.error(err);
      showStatus("Не удалось загрузить подкасты. Попробуйте ещё раз.", true);
      hasMore = false;
    } finally {
      isLoading = false;
      updateLoadMoreButton();
    }
  }

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

  const handleSearchInput = debounce(() => {
    const query = searchInput.value.trim();
    currentQuery = query;

    if (query === "") {
      currentMode = "best";
      currentPage = 1;
      listHeading.textContent = "Рекомендуемые подкасты";
      loadBestPodcasts(currentPage, false);
    } else {
      currentMode = "search";
      currentOffset = 0;
      listHeading.textContent = `Результаты поиска по запросу «${query}»`;
      loadSearchResults(query, currentOffset, false);
    }
  }, 400);

  searchInput.addEventListener("input", handleSearchInput);

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

  // Первая загрузка
  loadBestPodcasts(currentPage, false);

  // cleanup: вызывается перед уходом со страницы,
  // чтобы отменить незавершённый запрос
  return function cleanup() {
    activeController?.abort();
  };
}

export { renderHomePage };
