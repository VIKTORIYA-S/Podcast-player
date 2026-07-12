import { getPlaylist, removeFromPlaylist } from "../storage.js";
import { formatDate, formatDuration } from "../utils.js";

// Отрисовывает страницу плейлиста внутри container.
// navigate — переход на другую страницу (например, к списку подкастов).
// player — общий плеер, чтобы запускать воспроизведение эпизодов из плейлиста.
function renderPlaylistPage(container, navigate, player) {
  function createPlaylistItem(episode) {
    const item = document.createElement("div");
    item.className = "episode-item";

    const title = document.createElement("h3");
    title.textContent = episode.title || "Без названия";

    const meta = document.createElement("p");
    meta.className = "episode-meta";
    const parts = [
      episode.podcast?.title,
      formatDate(episode.pub_date_ms),
      formatDuration(episode.audio_length_sec),
    ].filter(Boolean);
    meta.textContent = parts.join(" · ");

    const actions = document.createElement("div");
    actions.className = "episode-actions";

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "episode-play-btn";
    playBtn.textContent = "▶ Слушать";
    playBtn.addEventListener("click", () => {
      player.playEpisode(episode);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "playlist-btn in-playlist";
    removeBtn.textContent = "✕ Убрать из плейлиста";
    removeBtn.addEventListener("click", () => {
      removeFromPlaylist(episode.id);
      render(); // перерисовываем список без удалённого эпизода
    });

    actions.appendChild(playBtn);
    actions.appendChild(removeBtn);

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);

    return item;
  }

  function render() {
    const playlist = getPlaylist();

    container.innerHTML = `
      <h1>Мой плейлист</h1>
      <div id="playlist-status"></div>
      <div id="playlist-list"></div>
    `;

    const statusEl = container.querySelector("#playlist-status");
    const listEl = container.querySelector("#playlist-list");

    if (playlist.length === 0) {
      statusEl.textContent =
        "Плейлист пуст. Добавляйте эпизоды со страницы подкаста.";
      return;
    }

    const fragment = document.createDocumentFragment();
    playlist.forEach((episode) => {
      fragment.appendChild(createPlaylistItem(episode));
    });
    listEl.appendChild(fragment);
  }

  render();

  // здесь нечего отменять/чистить — просто заглушка для единообразия с другими страницами
  return function cleanup() {};
}

export { renderPlaylistPage };
