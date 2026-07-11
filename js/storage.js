const PLAYLIST_KEY = "podcast-player:playlist";
const POSITIONS_KEY = "podcast-player:positions";

// ==== Плейлист ====

// Возвращает массив эпизодов, сохранённых в плейлисте
function getPlaylist() {
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Не удалось прочитать плейлист из localStorage:", err);
    return [];
  }
}

function savePlaylist(playlist) {
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlist));
  } catch (err) {
    console.error("Не удалось сохранить плейлист в localStorage:", err);
  }
}

function isInPlaylist(episodeId) {
  return getPlaylist().some((ep) => ep.id === episodeId);
}

function addToPlaylist(episode) {
  const playlist = getPlaylist();
  if (playlist.some((ep) => ep.id === episode.id)) return; // уже добавлен
  playlist.push(episode);
  savePlaylist(playlist);
}

function removeFromPlaylist(episodeId) {
  const playlist = getPlaylist().filter((ep) => ep.id !== episodeId);
  savePlaylist(playlist);
}

// ==== Позиции воспроизведения (сколько секунд прослушано в каждом эпизоде) ====

function getPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(
      "Не удалось прочитать позиции воспроизведения из localStorage:",
      err,
    );
    return {};
  }
}

function savePosition(episodeId, seconds) {
  const positions = getPositions();
  positions[episodeId] = seconds;
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch (err) {
    console.error(
      "Не удалось сохранить позицию воспроизведения в localStorage:",
      err,
    );
  }
}

function getPosition(episodeId) {
  const positions = getPositions();
  return positions[episodeId] || 0;
}

function clearPosition(episodeId) {
  const positions = getPositions();
  delete positions[episodeId];
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch (err) {
    console.error(
      "Не удалось обновить позиции воспроизведения в localStorage:",
      err,
    );
  }
}

export {
  getPlaylist,
  isInPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  getPosition,
  savePosition,
  clearPosition,
};
