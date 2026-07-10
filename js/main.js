import { renderHomePage } from "./pages/homePage.js";
import { renderPodcastPage } from "./pages/podcastPage.js";
import { createPlayer } from "./player.js";

const pageContent = document.getElementById("page-content");
const playerBar = document.getElementById("player-bar");

// Плеер создаётся один раз и живёт независимо от того,
// какая страница сейчас отрисована в pageContent
const player = createPlayer(playerBar);

// cleanup-функция текущей страницы
let currentCleanup = null;

// navigate — единственная точка входа для смены "экрана".
// view: "home" | "podcast"
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
  } else {
    console.error("Неизвестный маршрут:", view);
  }
}

// Открываем главную страницу при первой загрузке приложения
navigate("home");
