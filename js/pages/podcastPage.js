import { fetchPodcastById } from "../api.js";

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

// Превращает секунды в "чч:мм:сс" или "мм:сс"
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

// Отрисовывает страницу подкаста внутри container.
// podcastId — id подкаста, для которого показываем детали.
// navigate — функция для перехода на другую страницу (например, "Назад").
function renderPodcastPage(container, podcastId, navigate, player) {
  let activeController = null;
  let nextEpisodePubDate = null;
  let hasMoreEpisodes = false;
  let isLoadingMore = false;
  let podcastInfo = null; // сохраняем заголовок/обложку подкаста для передачи в плеер

  // ==== Базовая разметка на время загрузки ====
  container.innerHTML = `
    <button id="back-btn" type="button" class="back-btn">&larr; Назад к списку</button>
    <div id="status-message"></div>
    <div id="podcast-header"></div>
    <div id="episode-list"></div>
    <button id="load-more-episodes-btn" type="button">Загрузить ещё эпизоды</button>
  `;

  const statusMessage = container.querySelector("#status-message");
  const headerContainer = container.querySelector("#podcast-header");
  const episodeList = container.querySelector("#episode-list");
  const loadMoreBtn = container.querySelector("#load-more-episodes-btn");
  const backBtn = container.querySelector("#back-btn");

  loadMoreBtn.style.display = "none";

  backBtn.addEventListener("click", () => {
    navigate("home");
  });

  function showStatus(text, isError = false) {
    statusMessage.textContent = text;
    statusMessage.classList.toggle("error", isError);
  }

  function clearStatus() {
    statusMessage.textContent = "";
    statusMessage.classList.remove("error");
  }

  // ==== Отрисовка "шапки" подкаста (картинка, название, издатель, описание) ====
  function renderHeader(podcast) {
    podcastInfo = { title: podcast.title, image: podcast.image };
    headerContainer.innerHTML = "";

    const img = document.createElement("img");
    img.src = podcast.image || podcast.thumbnail || "";
    img.alt = podcast.title || "Podcast cover";
    img.className = "podcast-header-img";

    const info = document.createElement("div");
    info.className = "podcast-header-info";

    const title = document.createElement("h1");
    title.textContent = podcast.title || "Без названия";

    const publisher = document.createElement("p");
    publisher.className = "podcast-header-publisher";
    publisher.textContent = podcast.publisher || "";

    const description = document.createElement("p");
    description.className = "podcast-header-description";
    description.textContent = stripHtml(podcast.description);

    info.appendChild(title);
    info.appendChild(publisher);
    info.appendChild(description);

    headerContainer.appendChild(img);
    headerContainer.appendChild(info);
  }

  // ==== Отрисовка одного эпизода ====
  function createEpisodeItem(episode) {
    const item = document.createElement("div");
    item.className = "episode-item";

    const title = document.createElement("h3");
    title.textContent = episode.title || "Без названия";

    const meta = document.createElement("p");
    meta.className = "episode-meta";
    const parts = [
      formatDate(episode.pub_date_ms),
      formatDuration(episode.audio_length_sec),
    ].filter(Boolean);
    meta.textContent = parts.join(" · ");

    const description = document.createElement("p");
    description.className = "episode-description";
    description.textContent = stripHtml(episode.description);

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(description);

    if (episode.audio) {
      const playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "episode-play-btn";
      playBtn.textContent = "▶ Слушать";

      playBtn.addEventListener("click", () => {
        // Передаём в общий плеер эпизод + информацию о подкасте
        // (название/обложка), чтобы плеер мог их отобразить
        player.playEpisode({ ...episode, podcast: podcastInfo });
      });

      item.appendChild(playBtn);
    }

    return item;
  }

  function renderEpisodes(episodes, append) {
    if (!append) {
      episodeList.innerHTML = "";
    }

    if (episodes.length === 0 && !append) {
      showStatus("У этого подкаста пока нет эпизодов.");
      return;
    }

    const fragment = document.createDocumentFragment();
    episodes.forEach((episode) => {
      fragment.appendChild(createEpisodeItem(episode));
    });
    episodeList.appendChild(fragment);
  }

  function updateLoadMoreButton() {
    loadMoreBtn.style.display = hasMoreEpisodes ? "block" : "none";
    loadMoreBtn.disabled = isLoadingMore;
    loadMoreBtn.textContent = isLoadingMore
      ? "Загрузка..."
      : "Загрузить ещё эпизоды";
  }

  // ==== Загрузка данных подкаста ====
  async function loadPodcast(append) {
    activeController?.abort();
    activeController = new AbortController();

    if (append) {
      isLoadingMore = true;
      updateLoadMoreButton();
    } else {
      clearStatus();
      showStatus("Загрузка...");
    }

    try {
      const data = await fetchPodcastById(
        podcastId,
        append ? nextEpisodePubDate : null,
      );
      clearStatus();

      if (!append) {
        renderHeader(data);
      }
      renderEpisodes(data.episodes || [], append);

      // next_episode_pub_date больше 0 означает, что есть ещё эпизоды
      nextEpisodePubDate = data.next_episode_pub_date;
      hasMoreEpisodes = Boolean(nextEpisodePubDate) && nextEpisodePubDate > 0;
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      showStatus("Не удалось загрузить подкаст. Попробуйте ещё раз.", true);
      hasMoreEpisodes = false;
    } finally {
      isLoadingMore = false;
      updateLoadMoreButton();
    }
  }

  loadMoreBtn.addEventListener("click", () => {
    if (isLoadingMore) return;
    loadPodcast(true);
  });

  // Первая загрузка
  loadPodcast(false);

  // cleanup
  return function cleanup() {
    activeController?.abort();
  };
}

export { renderPodcastPage };
