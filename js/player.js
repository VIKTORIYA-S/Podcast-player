import { getPosition, savePosition, clearPosition } from "./storage.js";

// ==== Вспомогательная функция: секунды -> "мм:сс" или "чч:мм:сс" ====
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

// Создаёт плеер внутри container. Вызывается один раз при старте приложения.
// Возвращает объект с методом playEpisode(episode) — его дальше
// используют страницы, чтобы запустить воспроизведение конкретного эпизода.
function createPlayer(container) {
  // Настоящий проигрыватель звука — обычный HTML5 Audio,
  // никак не связанный с DOM страниц. Именно поэтому смена
  // страниц (перерисовка #page-content) на него не влияет.
  const audio = new Audio();
  let currentEpisode = null;
  let isSeeking = false; // true, пока пользователь тащит/кликает по полосе прогресса
  let lastSavedSecond = 0; // чтобы не писать в localStorage на каждый timeupdate

  // ==== Разметка плеера (создаётся один раз) ====
  container.innerHTML = `
    <div class="player-info">
      <img id="player-cover" class="player-cover" alt="" />
      <div class="player-text">
        <div id="player-title" class="player-title">Ничего не выбрано</div>
        <div id="player-podcast" class="player-podcast"></div>
      </div>
    </div>

    <div class="player-controls">
      <button id="player-toggle-btn" type="button" class="player-toggle-btn" disabled>▶</button>

      <span id="player-current-time" class="player-time">0:00</span>

      <div id="player-progress" class="player-progress">
        <div id="player-progress-fill" class="player-progress-fill"></div>
      </div>

      <span id="player-duration" class="player-time">0:00</span>
    </div>
  `;

  const coverImg = container.querySelector("#player-cover");
  const titleEl = container.querySelector("#player-title");
  const podcastEl = container.querySelector("#player-podcast");
  const toggleBtn = container.querySelector("#player-toggle-btn");
  const currentTimeEl = container.querySelector("#player-current-time");
  const durationEl = container.querySelector("#player-duration");
  const progressBar = container.querySelector("#player-progress");
  const progressFill = container.querySelector("#player-progress-fill");

  // Плеер по умолчанию скрыт, пока не выбран первый эпизод
  container.classList.remove("player-active");

  // ==== Play / Pause ====
  function togglePlayPause() {
    if (!currentEpisode) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  toggleBtn.addEventListener("click", togglePlayPause);

  audio.addEventListener("play", () => {
    toggleBtn.textContent = "⏸";
  });

  audio.addEventListener("pause", () => {
    toggleBtn.textContent = "▶";
  });

  // ==== Обновление полосы прогресса и времени + сохранение позиции ====
  audio.addEventListener("timeupdate", () => {
    if (isSeeking) return; // пока перематываем сами — не перетираем позицию
    updateProgressUI();

    // Пишем в localStorage не каждую секунду, а раз в ~5 секунд,
    // чтобы не дёргать хранилище слишком часто
    const currentSecond = Math.floor(audio.currentTime);
    if (currentEpisode && currentSecond - lastSavedSecond >= 5) {
      savePosition(currentEpisode.id, audio.currentTime);
      lastSavedSecond = currentSecond;
    }
  });

  audio.addEventListener("pause", () => {
    if (currentEpisode) {
      savePosition(currentEpisode.id, audio.currentTime);
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("ended", () => {
    toggleBtn.textContent = "▶";
    progressFill.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    // Эпизод прослушан полностью — сохранённая позиция больше не нужна,
    // при следующем запуске он начнётся сначала
    if (currentEpisode) {
      clearPosition(currentEpisode.id);
    }
  });

  // Сохраняем позицию, если пользователь закрывает вкладку/страницу во время прослушивания
  window.addEventListener("beforeunload", () => {
    if (currentEpisode && !audio.paused) {
      savePosition(currentEpisode.id, audio.currentTime);
    }
  });

  function updateProgressUI() {
    const duration = audio.duration || 0;
    const current = audio.currentTime || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    progressFill.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(current);
    durationEl.textContent = formatTime(duration);
  }

  // ==== Перемотка по клику на полосу прогресса ====
  function seekToEvent(event) {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1,
    );
    audio.currentTime = ratio * audio.duration;
    updateProgressUI();
  }

  progressBar.addEventListener("click", (event) => {
    seekToEvent(event);
  });

  // ==== Запуск эпизода ====
  function playEpisode(episode) {
    // Если это тот же самый эпизод — просто переключаем play/pause
    if (currentEpisode && currentEpisode.id === episode.id) {
      togglePlayPause();
      return;
    }

    // Перед переключением сохраняем позицию предыдущего эпизода
    if (currentEpisode) {
      savePosition(currentEpisode.id, audio.currentTime);
    }

    currentEpisode = episode;
    lastSavedSecond = 0;

    titleEl.textContent = episode.title || "Без названия";
    podcastEl.textContent = episode.podcast?.title || "";
    coverImg.src =
      episode.image || episode.thumbnail || episode.podcast?.image || "";

    progressFill.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";

    audio.src = episode.audio;
    toggleBtn.disabled = false;

    container.classList.add("player-active");
    document.body.classList.add("has-player");

    // Как только браузер узнает длительность файла, можно безопасно
    // переставить currentTime — до этого момента браузер может его игнорировать
    const resumePlayback = () => {
      const savedSeconds = getPosition(episode.id);
      // Отступаем на 10 секунд назад от сохранённой позиции,
      // чтобы пользователь не потерял контекст
      const resumeFrom = savedSeconds > 10 ? savedSeconds - 10 : 0;
      if (resumeFrom > 0) {
        audio.currentTime = resumeFrom;
      }
      audio.play();
    };

    audio.addEventListener("loadedmetadata", resumePlayback, { once: true });
  }

  return { playEpisode };
}

export { createPlayer };
