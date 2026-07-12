import { renderHomePage } from "./pages/homePage.js";
import { renderPodcastPage } from "./pages/podcastPage.js";
import { renderPlaylistPage } from "./pages/playlistPage.js";
import { createPlayer } from "./player.js";

const navBar = document.getElementById("app-nav");
const pageContent = document.getElementById("page-content");
const playerBar = document.getElementById("player-bar");

// Плеер создаётся один раз и живёт независимо от того,
// какая страница сейчас отрисована в pageContent
const player = createPlayer(playerBar);

// cleanup-функция текущей страницы
let currentCleanup = null;

// navigate — единственная точка входа для смены "экрана".
// view: "home" | "podcast" | "playlist"
// params: дополнительные данные, например { id: "..." } для страницы подкаста
function navigate(view, params = {}) {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  if (view === "home") {
    currentCleanup = renderHomePage(pageContent, navigate);
  } else if (view === "podcast") {
    currentCleanup = renderPodcastPage(
      pageContent,
      params.id,
      navigate,
      player,
    );
  } else if (view === "playlist") {
    currentCleanup = renderPlaylistPage(pageContent, navigate, player);
  } else {
    console.error("Неизвестный маршрут:", view);
    return;
  }

  updateNavActiveState(view);
  window.scrollTo(0, 0);
}

// ==== Постоянная навигационная панель ====
navBar.innerHTML = `
  <button id="nav-home-btn" type="button" class="nav-btn">Подкасты</button>
  <button id="nav-playlist-btn" type="button" class="nav-btn">Мой плейлист</button>
`;

const navHomeBtn = navBar.querySelector("#nav-home-btn");
const navPlaylistBtn = navBar.querySelector("#nav-playlist-btn");

navHomeBtn.addEventListener("click", () => navigate("home"));
navPlaylistBtn.addEventListener("click", () => navigate("playlist"));

// Подсвечиваем активный раздел (страница подкаста считается частью "Подкасты")
function updateNavActiveState(view) {
  navHomeBtn.classList.toggle("active", view === "home" || view === "podcast");
  navPlaylistBtn.classList.toggle("active", view === "playlist");
}

// Открываем главную страницу при первой загрузке приложения
navigate("home");
