import { renderHomePage } from "./pages/homePage.js";
import { renderPodcastPage } from "./pages/podcastPage.js";

const app = document.getElementById("app");

// cleanup-функция текущей страницы (если есть) —
// вызывается перед тем, как показать другую страницу
let currentCleanup = null;

// navigate — единственная точка входа для смены "экрана".
// view: "home" | "podcast"
// params: дополнительные данные, например { id: "..." } для страницы подкаста
function navigate(view, params = {}) {
  // убираем за собой: отменяем запросы предыдущей страницы
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  if (view === "home") {
    currentCleanup = renderHomePage(app, navigate);
  } else if (view === "podcast") {
    currentCleanup = renderPodcastPage(app, params.id, navigate);
  } else {
    console.error("Неизвестный маршрут:", view);
  }
}

// Открываем главную страницу при первой загрузке приложения
navigate("home");


