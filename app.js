const API_BASE_STORAGE_KEY = "fergDesignApiBaseUrl";
const ADMIN_KEY_STORAGE_KEY = "fergDesignAdminApiKey";
const VIDEO_UNLOCK_STORAGE_KEY = "fergDesignUnlockedPrivateVideos";
const VIDEO_PASSWORD_STORAGE_KEY = "fergDesignPrivateVideoPasswords";
const DEFAULT_LOCAL_API_BASE = "http://localhost:8787";

const isAdmin = document.body.dataset.role === "admin";

const photoGalleryGrid = document.querySelector("#gallery-grid");
const photoCardTemplate = document.querySelector("#work-card-template");
const photoForm = document.querySelector("#upload-form");
const photoFilesInput = document.querySelector("#files");
const photoDropZone = document.querySelector("#drop-zone");
const photoDropTitle = document.querySelector("#drop-title");
const photoDropHint = document.querySelector("#drop-hint");
const photoPreviewList = document.querySelector("#preview-list");
const photoResetBtn = document.querySelector("#reset-btn");
const photoUploadProgress = document.querySelector("#photo-upload-progress");
const photoUploadProgressBar = document.querySelector("#photo-upload-progress-bar");
const photoUploadProgressText = document.querySelector("#photo-upload-progress-text");

const photoCountElement = document.querySelector("#photo-count");
const videoCountElement = document.querySelector("#video-count");
const privateCountElement = document.querySelector("#private-count");

const photoViewer = document.querySelector("#viewer");
const photoViewerImage = document.querySelector("#viewer-image");
const photoViewerTitle = document.querySelector("#viewer-title");
const photoViewerDescription = document.querySelector("#viewer-description");
const photoViewerPosition = document.querySelector("#viewer-position");
const photoViewerThumbs = document.querySelector("#viewer-thumbs");
const photoViewerPrev = document.querySelector("#viewer-prev");
const photoViewerNext = document.querySelector("#viewer-next");
const photoViewerClose = document.querySelector("#viewer-close");

const videoViewer = document.querySelector("#video-viewer");
const videoViewerClose = document.querySelector("#video-viewer-close");
const videoViewerPlayer = document.querySelector("#viewer-video");
const videoViewerTitle = document.querySelector("#viewer-video-title");
const videoViewerDescription = document.querySelector("#viewer-video-description");
const videoViewerCategory = document.querySelector("#viewer-video-category");
const videoViewerVisibility = document.querySelector("#viewer-video-visibility");

const tabButtons = Array.from(document.querySelectorAll(".portfolio-tab"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));

const publicVideoCategoryList = document.querySelector("#video-category-list");
const adminVideoList = document.querySelector("#admin-video-list");
const videoCardTemplate = document.querySelector("#video-card-template");

const categoryForm = document.querySelector("#video-category-form");
const categoryNameInput = document.querySelector("#video-category-name");
const categoryColorInput = document.querySelector("#video-category-color");
const categoryAdminList = document.querySelector("#video-category-list-admin");

const videoUploadForm = document.querySelector("#video-upload-form");
const videoTitleInput = document.querySelector("#video-title");
const videoDescriptionInput = document.querySelector("#video-description");
const videoCategorySelect = document.querySelector("#video-category-select");
const videoFileInput = document.querySelector("#video-file");
const videoFileWrap = document.querySelector("#video-file-wrap");
const videoYadiskLinkWrap = document.querySelector("#video-yadisk-link-wrap");
const videoYadiskLinkInput = document.querySelector("#video-yadisk-link");
const videoPreviewInput = document.querySelector("#video-preview-file");
const videoSourceInputs = Array.from(document.querySelectorAll('input[name="video-source"]'));
const videoVisibilityInputs = Array.from(document.querySelectorAll('input[name="video-visibility"]'));
const videoPasswordWrap = document.querySelector("#video-password-wrap");
const videoPasswordInput = document.querySelector("#video-password");
const videoUploadPreview = document.querySelector("#video-upload-preview");
const videoResetBtn = document.querySelector("#video-reset-btn");
const videoUploadProgress = document.querySelector("#video-upload-progress");
const videoUploadProgressBar = document.querySelector("#video-upload-progress-bar");
const videoUploadProgressText = document.querySelector("#video-upload-progress-text");

const adminAuthForm = document.querySelector("#admin-auth-form");
const adminApiBaseInput = document.querySelector("#api-base-url");
const adminApiKeyInput = document.querySelector("#admin-api-key");
const adminAuthStatus = document.querySelector("#admin-auth-status");
const adminAuthResetBtn = document.querySelector("#admin-auth-reset");

let apiBaseUrl = readInitialApiBaseUrl();
let adminApiKey = isAdmin ? readSessionValue(ADMIN_KEY_STORAGE_KEY) : "";

let photoWorks = [];
let videoCategories = [];
let videos = [];

let selectedPhotoFiles = [];
let selectedVideoFile = null;
let selectedVideoPreviewFile = null;

let unlockedPrivateVideoIds = loadUnlockedPrivateVideoIds();
let privateVideoPasswords = loadPrivateVideoPasswords();

let activePhotoWorkId = null;
let activePhotoIndex = 0;
let activeVideoId = null;

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function readLocalValue(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeLocalValue(key, value) {
  try {
    if (!value) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function readSessionValue(key) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeSessionValue(key, value) {
  try {
    if (!value) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function normalizeApiBase(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function readMetaApiBase() {
  const meta = document.querySelector('meta[name="ferg-api-base"]');
  return normalizeApiBase(meta?.content || "");
}

function readInitialApiBaseUrl() {
  const stored = normalizeApiBase(readLocalValue(API_BASE_STORAGE_KEY));
  if (stored) {
    return stored;
  }

  const meta = readMetaApiBase();
  if (meta) {
    return meta;
  }

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_LOCAL_API_BASE;
  }

  return "";
}

function setApiBaseUrl(value, persist = true) {
  apiBaseUrl = normalizeApiBase(value);
  if (persist) {
    writeLocalValue(API_BASE_STORAGE_KEY, apiBaseUrl);
  }
}

function setAdminApiKey(value, persist = true) {
  adminApiKey = String(value || "").trim();
  if (persist) {
    writeSessionValue(ADMIN_KEY_STORAGE_KEY, adminApiKey);
  }
}

function setAdminAuthStatus(message, tone = "info") {
  if (!adminAuthStatus) {
    return;
  }

  adminAuthStatus.textContent = message;
  adminAuthStatus.classList.remove("is-error", "is-success", "is-warning");
  if (tone === "error") {
    adminAuthStatus.classList.add("is-error");
  }
  if (tone === "success") {
    adminAuthStatus.classList.add("is-success");
  }
  if (tone === "warning") {
    adminAuthStatus.classList.add("is-warning");
  }
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

async function apiRequest(path, { method = "GET", body, headers = {}, admin = false } = {}) {
  const requestHeaders = new Headers(headers);

  if (body && !(body instanceof FormData) && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  if (admin && adminApiKey) {
    requestHeaders.set("x-admin-key", adminApiKey);
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers: requestHeaders,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  let payload = null;

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => "");
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      (typeof payload === "string" && payload.trim()) ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function apiUploadRequest(
  path,
  { method = "POST", body, headers = {}, admin = false, onUploadProgress } = {},
) {
  return new Promise((resolve, reject) => {
    const requestHeaders = new Headers(headers);

    if (admin && adminApiKey) {
      requestHeaders.set("x-admin-key", adminApiKey);
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, buildApiUrl(path), true);

    requestHeaders.forEach((value, key) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (typeof onUploadProgress === "function") {
        onUploadProgress(event);
      }
    };

    xhr.onerror = () => {
      const error = new Error("Failed to fetch");
      error.status = 0;
      reject(error);
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") || "";
      const rawText = xhr.responseText || "";

      let payload = rawText;
      if (contentType.includes("application/json")) {
        try {
          payload = JSON.parse(rawText || "{}");
        } catch {
          payload = null;
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const message =
          payload?.error ||
          (typeof payload === "string" && payload.trim()) ||
          `Request failed with status ${xhr.status}`;

        const error = new Error(message);
        error.status = xhr.status;
        error.payload = payload;
        reject(error);
        return;
      }

      resolve(payload);
    };

    xhr.send(body);
  });
}

function toTimestamp(value) {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : Date.now();
}

function normalizeColor(value) {
  if (typeof value !== "string") {
    return "#1b7bd1";
  }

  const trimmed = value.trim();
  const shortHex = /^#([a-fA-F0-9]{3})$/;
  const fullHex = /^#([a-fA-F0-9]{6})$/;

  if (fullHex.test(trimmed)) {
    return trimmed;
  }

  const short = trimmed.match(shortHex);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return "#1b7bd1";
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeColor(hex).replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeXml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeSvg(label, colorA, colorB) {
  const safeLabel = escapeXml(label);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${colorA}'/><stop offset='100%' stop-color='${colorB}'/></linearGradient></defs><rect width='1200' height='900' fill='url(#g)'/><circle cx='960' cy='180' r='180' fill='rgba(255,255,255,.15)'/><circle cx='240' cy='690' r='220' fill='rgba(0,0,0,.12)'/><text x='80' y='780' fill='rgba(255,255,255,.9)' font-family='Arial, sans-serif' font-size='72' letter-spacing='3'>${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeVideoPreviewSvg(title, categoryColor) {
  const safeTitle = escapeXml(`VIDEO ${String(title || "").slice(0, 16).toUpperCase()}`);
  const colorA = normalizeColor(categoryColor);
  const colorB = "#0b3f69";

  return `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${colorA}'/><stop offset='100%' stop-color='${colorB}'/></linearGradient></defs><rect width='1200' height='675' fill='url(#g)'/><circle cx='940' cy='130' r='140' fill='rgba(255,255,255,.14)'/><circle cx='190' cy='560' r='180' fill='rgba(0,0,0,.18)'/><path d='M530 250 L530 430 L710 340 Z' fill='rgba(255,255,255,0.88)'/><text x='70' y='600' fill='rgba(255,255,255,0.93)' font-family='Arial, sans-serif' font-size='58' letter-spacing='3'>${safeTitle}</text></svg>`;
}

function createVideoPreviewFallback(title, categoryColor) {
  const svg = makeVideoPreviewSvg(title, categoryColor);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createFallbackPreviewFile(title, categoryColor) {
  const svg = makeVideoPreviewSvg(title, categoryColor);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  return new File([blob], `preview-${Date.now()}.svg`, { type: "image/svg+xml" });
}

function makeEmptyState(message) {
  const state = document.createElement("div");
  state.className = "empty-state";
  const text = document.createElement("p");
  text.textContent = message;
  state.append(text);
  return state;
}

function normalizePhotoItem(item) {
  return {
    id: String(item?.id || makeId()),
    title: String(item?.title || "Без названия"),
    description: String(item?.description || ""),
    format: item?.format === "group" ? "group" : "single",
    images: Array.isArray(item?.images) ? item.images.filter((src) => typeof src === "string" && src.trim()) : [],
    createdAt: toTimestamp(item?.createdAt),
  };
}

function normalizeCategoryItem(item) {
  return {
    id: String(item?.id || makeId()),
    name: String(item?.name || "Без имени"),
    color: normalizeColor(item?.color),
    createdAt: toTimestamp(item?.createdAt),
  };
}

function normalizeVideoItem(item) {
  const category = item?.category || {};
  return {
    id: String(item?.id || makeId()),
    title: String(item?.title || "Без названия"),
    description: String(item?.description || ""),
    categoryId: String(category?.id || item?.categoryId || ""),
    categoryName: String(category?.name || item?.categoryName || "Без категории"),
    categoryColor: normalizeColor(category?.color || item?.categoryColor || "#2f82ba"),
    visibility: item?.visibility === "private" ? "private" : "public",
    isLocked: Boolean(item?.isLocked),
    sourceType: item?.sourceType === "yadisk" ? "yadisk" : "upload",
    sourceLink: typeof item?.sourceLink === "string" ? item.sourceLink : "",
    previewImage: String(item?.previewUrl || item?.previewImage || ""),
    createdAt: toTimestamp(item?.createdAt),
  };
}

function loadUnlockedPrivateVideoIds() {
  try {
    const raw = sessionStorage.getItem(VIDEO_UNLOCK_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveUnlockedPrivateVideoIds() {
  try {
    sessionStorage.setItem(VIDEO_UNLOCK_STORAGE_KEY, JSON.stringify(Array.from(unlockedPrivateVideoIds)));
  } catch {
    // ignore session storage failures
  }
}

function loadPrivateVideoPasswords() {
  try {
    const raw = sessionStorage.getItem(VIDEO_PASSWORD_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePrivateVideoPasswords() {
  try {
    sessionStorage.setItem(VIDEO_PASSWORD_STORAGE_KEY, JSON.stringify(privateVideoPasswords));
  } catch {
    // ignore session storage failures
  }
}

function getVideoCategoryById(categoryId) {
  return videoCategories.find((item) => item.id === categoryId) || null;
}

function getVideoById(videoId) {
  return videos.find((video) => video.id === videoId) || null;
}

function getActivePhotoWork() {
  return photoWorks.find((item) => item.id === activePhotoWorkId) || null;
}

function getPhotoFormat() {
  if (!photoForm) {
    return "single";
  }
  return photoForm.elements.format.value;
}

function ensureAdminAuth() {
  if (!isAdmin) {
    return true;
  }

  if (adminApiKey) {
    return true;
  }

  alert("Сначала подключи Admin API Key в блоке подключения API.");
  adminApiKeyInput?.focus();
  setAdminAuthStatus("Нужен Admin API Key для операций записи.", "warning");
  return false;
}

function setBusy(button, busy, originalText) {
  if (!button) {
    return;
  }

  button.disabled = busy;
  if (busy) {
    button.dataset.originalText = button.textContent || "";
    button.textContent = originalText;
    return;
  }

  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

function getProgressNodes(type) {
  if (type === "photo") {
    return {
      root: photoUploadProgress,
      bar: photoUploadProgressBar,
      text: photoUploadProgressText,
    };
  }

  if (type === "video") {
    return {
      root: videoUploadProgress,
      bar: videoUploadProgressBar,
      text: videoUploadProgressText,
    };
  }

  return null;
}

function showUploadProgress(type, title = "Загрузка...") {
  const nodes = getProgressNodes(type);
  if (!nodes?.root || !nodes?.bar || !nodes?.text) {
    return;
  }

  nodes.root.classList.remove("is-hidden");
  nodes.root.classList.remove("is-error");
  nodes.bar.style.width = "0%";
  nodes.text.textContent = `${title} 0%`;
}

function updateUploadProgress(type, event, title = "Загрузка...") {
  const nodes = getProgressNodes(type);
  if (!nodes?.root || !nodes?.bar || !nodes?.text) {
    return;
  }

  if (event?.lengthComputable && event.total > 0) {
    const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
    nodes.bar.style.width = `${percent}%`;
    nodes.text.textContent = `${title} ${percent}%`;
    return;
  }

  nodes.text.textContent = `${title}...`;
}

function finishUploadProgress(type, text = "Готово", delayMs = 600) {
  const nodes = getProgressNodes(type);
  if (!nodes?.root || !nodes?.bar || !nodes?.text) {
    return;
  }

  nodes.bar.style.width = "100%";
  nodes.text.textContent = text;

  window.setTimeout(() => {
    nodes.root.classList.add("is-hidden");
  }, delayMs);
}

function failUploadProgress(type, text = "Ошибка загрузки") {
  const nodes = getProgressNodes(type);
  if (!nodes?.root || !nodes?.bar || !nodes?.text) {
    return;
  }

  nodes.root.classList.remove("is-hidden");
  nodes.root.classList.add("is-error");
  nodes.text.textContent = text;
}

function toUserFacingError(prefix, error) {
  if (!error?.status) {
    return `${prefix}: ошибка сети (CORS/API). Проверь API URL и CORS_ORIGIN.`;
  }

  return `${prefix}: ${error.message}`;
}

function renderStats() {
  const privateVideos = videos.filter((item) => item.visibility === "private").length;

  if (photoCountElement) {
    photoCountElement.textContent = String(photoWorks.length);
  }

  if (videoCountElement) {
    videoCountElement.textContent = String(videos.length);
  }

  if (privateCountElement) {
    privateCountElement.textContent = String(privateVideos);
  }
}

function applyCardAspectRatioFromImage(card, imageElement, cssVarName = "--work-ratio") {
  if (!card || !imageElement) {
    return;
  }

  const update = () => {
    const width = Number(imageElement.naturalWidth) || 0;
    const height = Number(imageElement.naturalHeight) || 0;
    if (width > 0 && height > 0) {
      card.style.setProperty(cssVarName, `${width} / ${height}`);
    }
  };

  imageElement.addEventListener("load", update, { once: true });
  if (imageElement.complete) {
    update();
  }
}

function renderPhotoGallery() {
  if (!photoGalleryGrid || !photoCardTemplate) {
    return;
  }

  photoGalleryGrid.innerHTML = "";
  photoGalleryGrid.classList.remove("is-empty");

  if (!photoWorks.length) {
    photoGalleryGrid.classList.add("is-empty");
    photoGalleryGrid.append(makeEmptyState("Фото-портфолио пока пустое."));
    return;
  }

  photoWorks
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((work) => {
      const card = photoCardTemplate.content.firstElementChild.cloneNode(true);
      const cover = card.querySelector(".work-cover");
      const openBtn = card.querySelector(".work-open");
      const badge = card.querySelector(".work-badge");
      const title = card.querySelector(".work-title");
      const description = card.querySelector(".work-description");
      const stack = card.querySelector(".work-stack");
      const deleteBtn = card.querySelector(".work-delete");

      const coverSrc = work.images[0] || encodeSvg("NO IMAGE", "#1b7bd1", "#0b3f69");

      cover.src = coverSrc;
      cover.alt = `Превью ${work.title}`;
      applyCardAspectRatioFromImage(card, cover);

      badge.textContent = work.format === "single" ? "Single" : `Series ${work.images.length} шт.`;

      title.textContent = work.title;
      description.textContent = work.description;

      if (work.format === "group") {
        const previewCount = Math.min(work.images.length, 4);
        for (let i = 0; i < previewCount; i += 1) {
          const mini = document.createElement("img");
          mini.src = work.images[i];
          mini.alt = `Кадр ${i + 1}`;
          stack.append(mini);
        }
        if (work.images.length > previewCount) {
          const more = document.createElement("div");
          more.className = "stack-more";
          more.textContent = `+${work.images.length - previewCount}`;
          stack.append(more);
        }
      }

      if (openBtn) {
        openBtn.addEventListener("click", () => openPhotoViewer(work.id, 0));
      }

      if (deleteBtn) {
        if (isAdmin) {
          deleteBtn.addEventListener("click", () => {
            void removePhotoWork(work.id);
          });
        } else {
          deleteBtn.remove();
        }
      }

      photoGalleryGrid.append(card);
    });
}

function renderPhotoPreview() {
  if (!photoPreviewList) {
    return;
  }

  photoPreviewList.innerHTML = "";
  if (!selectedPhotoFiles.length) {
    return;
  }

  selectedPhotoFiles.forEach((file) => {
    const wrap = document.createElement("div");
    wrap.className = "preview-item";

    const img = document.createElement("img");
    const tag = document.createElement("span");

    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.addEventListener("load", () => URL.revokeObjectURL(img.src));
    tag.textContent = file.name;

    wrap.append(img, tag);
    photoPreviewList.append(wrap);
  });
}

function setSelectedPhotoFiles(fileList) {
  if (!isAdmin) {
    return;
  }

  const format = getPhotoFormat();
  let files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));

  if (format === "single" && files.length > 1) {
    files = [files[0]];
  }

  selectedPhotoFiles = files;
  renderPhotoPreview();
}

function clearPhotoForm() {
  if (!photoForm || !photoFilesInput) {
    return;
  }

  photoForm.reset();
  selectedPhotoFiles = [];
  photoFilesInput.value = "";
  renderPhotoPreview();
  updatePhotoFormatUI();
}

function updatePhotoFormatUI() {
  if (!isAdmin || !photoForm || !photoFilesInput || !photoDropTitle || !photoDropHint) {
    return;
  }

  const isSingle = getPhotoFormat() === "single";
  photoFilesInput.multiple = !isSingle;
  photoFilesInput.value = "";
  selectedPhotoFiles = [];
  renderPhotoPreview();

  photoDropTitle.textContent = "Перетащи фото сюда или нажми для выбора";
  photoDropHint.textContent = isSingle
    ? "Для одиночного формата нужно 1 фото."
    : "Для группы выбери 2 и более фото.";
}

async function onPhotoSubmit(event) {
  event.preventDefault();
  if (!isAdmin || !photoForm) {
    return;
  }

  if (!ensureAdminAuth()) {
    return;
  }

  const format = getPhotoFormat();

  if (!selectedPhotoFiles.length) {
    alert("Добавь минимум одно изображение.");
    return;
  }

  if (format === "single" && selectedPhotoFiles.length !== 1) {
    alert("Для одиночной работы выбери ровно 1 изображение.");
    return;
  }

  if (format === "group" && selectedPhotoFiles.length < 2) {
    alert("Для серии добавь минимум 2 изображения.");
    return;
  }

  const title = String(photoForm.elements.title?.value || "").trim();
  const description = String(photoForm.elements.description?.value || "").trim();

  if (!title || !description) {
    alert("Заполни название и описание.");
    return;
  }

  const submitBtn = photoForm.querySelector('button[type="submit"]');
  setBusy(submitBtn, true, "Загрузка...");
  showUploadProgress("photo", "Загрузка фото");

  try {
    const payload = new FormData();
    payload.append("title", title);
    payload.append("description", description);
    payload.append("format", format);
    selectedPhotoFiles.forEach((file) => {
      payload.append("files", file, file.name);
    });

    const response = await apiUploadRequest("/api/photos", {
      method: "POST",
      body: payload,
      admin: true,
      onUploadProgress: (event) => {
        updateUploadProgress("photo", event, "Загрузка фото");
      },
    });

    const created = normalizePhotoItem(response?.item || {});
    photoWorks = [created, ...photoWorks.filter((item) => item.id !== created.id)];

    renderPhotoGallery();
    renderStats();
    clearPhotoForm();
    finishUploadProgress("photo", "Фото загружены");
    window.location.hash = "gallery";
  } catch (error) {
    if (error.status === 401) {
      setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
    }
    failUploadProgress("photo", "Ошибка загрузки фото");
    alert(toUserFacingError("Не удалось загрузить фото", error));
  } finally {
    setBusy(submitBtn, false, "");
  }
}

async function removePhotoWork(id) {
  if (!isAdmin) {
    return;
  }

  if (!ensureAdminAuth()) {
    return;
  }

  const found = photoWorks.find((item) => item.id === id);
  if (!found) {
    return;
  }

  const ok = window.confirm(`Удалить фото работу "${found.title}"?`);
  if (!ok) {
    return;
  }

  try {
    await apiRequest(`/api/photos/${id}`, {
      method: "DELETE",
      admin: true,
    });

    photoWorks = photoWorks.filter((item) => item.id !== id);

    renderPhotoGallery();
    renderStats();

    if (activePhotoWorkId === id) {
      closePhotoViewer();
    }
  } catch (error) {
    if (error.status === 401) {
      setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
    }
    alert(`Не удалось удалить фото: ${error.message}`);
  }
}

function openPhotoViewer(workId, imageIndex = 0) {
  if (!photoViewer || typeof photoViewer.showModal !== "function") {
    return;
  }

  const work = photoWorks.find((item) => item.id === workId);
  if (!work) {
    return;
  }

  activePhotoWorkId = workId;
  activePhotoIndex = Math.max(0, Math.min(imageIndex, work.images.length - 1));
  updatePhotoViewer();
  photoViewer.showModal();
}

function closePhotoViewer() {
  if (photoViewer && photoViewer.open) {
    photoViewer.close();
  }
  activePhotoWorkId = null;
  activePhotoIndex = 0;
}

function updatePhotoViewer() {
  if (!photoViewerImage || !photoViewerTitle || !photoViewerDescription || !photoViewerPosition || !photoViewerThumbs) {
    return;
  }

  const work = getActivePhotoWork();
  if (!work) {
    return;
  }

  photoViewerTitle.textContent = work.title;
  photoViewerDescription.textContent = work.description;
  photoViewerImage.src = work.images[activePhotoIndex];
  photoViewerImage.alt = `${work.title} (${activePhotoIndex + 1})`;
  photoViewerPosition.textContent = `${activePhotoIndex + 1} / ${work.images.length}`;

  if (photoViewerPrev) {
    photoViewerPrev.disabled = work.images.length <= 1;
  }
  if (photoViewerNext) {
    photoViewerNext.disabled = work.images.length <= 1;
  }

  photoViewerThumbs.innerHTML = "";
  work.images.forEach((src, index) => {
    const thumbBtn = document.createElement("button");
    thumbBtn.type = "button";
    if (index === activePhotoIndex) {
      thumbBtn.classList.add("active");
    }

    const thumbImg = document.createElement("img");
    thumbImg.src = src;
    thumbImg.alt = `Миниатюра ${index + 1}`;

    thumbBtn.append(thumbImg);
    thumbBtn.addEventListener("click", () => {
      activePhotoIndex = index;
      updatePhotoViewer();
    });

    photoViewerThumbs.append(thumbBtn);
  });
}

function stepPhotoViewer(direction) {
  const work = getActivePhotoWork();
  if (!work) {
    return;
  }

  activePhotoIndex = (activePhotoIndex + direction + work.images.length) % work.images.length;
  updatePhotoViewer();
}

function getVideoSource() {
  const checked = videoUploadForm?.querySelector('input[name="video-source"]:checked');
  return checked ? checked.value : "upload";
}

function getVideoVisibility() {
  const checked = videoUploadForm?.querySelector('input[name="video-visibility"]:checked');
  return checked ? checked.value : "public";
}

function updateVideoSourceUI() {
  if (!videoFileInput || !videoFileWrap || !videoYadiskLinkWrap || !videoYadiskLinkInput) {
    return;
  }

  const source = getVideoSource();
  const useUpload = source === "upload";

  videoFileWrap.classList.toggle("is-hidden", !useUpload);
  videoYadiskLinkWrap.classList.toggle("is-hidden", useUpload);

  videoFileInput.required = useUpload;
  videoYadiskLinkInput.required = !useUpload;

  if (!useUpload) {
    videoFileInput.value = "";
    selectedVideoFile = null;
  }

  renderVideoUploadPreview();
}

function updateVideoVisibilityUI() {
  if (!videoPasswordWrap || !videoPasswordInput) {
    return;
  }

  const isPrivate = getVideoVisibility() === "private";
  videoPasswordWrap.classList.toggle("is-hidden", !isPrivate);
  videoPasswordInput.required = isPrivate;
  if (!isPrivate) {
    videoPasswordInput.value = "";
  }
}

function renderVideoCategoryOptions() {
  if (!videoCategorySelect) {
    return;
  }

  const currentValue = videoCategorySelect.value;
  videoCategorySelect.innerHTML = "";

  if (!videoCategories.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Сначала создай категорию";
    videoCategorySelect.append(option);
    videoCategorySelect.disabled = true;
    return;
  }

  videoCategorySelect.disabled = false;

  videoCategories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      videoCategorySelect.append(option);
    });

  if (currentValue && videoCategories.some((item) => item.id === currentValue)) {
    videoCategorySelect.value = currentValue;
  }
}

function renderCategoryAdminList() {
  if (!categoryAdminList) {
    return;
  }

  categoryAdminList.innerHTML = "";

  if (!videoCategories.length) {
    categoryAdminList.append(makeEmptyState("Категории ещё не созданы."));
    return;
  }

  const grid = document.createElement("div");
  grid.className = "category-grid";

  videoCategories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .forEach((category) => {
      const usedBy = videos.filter((video) => video.categoryId === category.id).length;

      const card = document.createElement("article");
      card.className = "category-card";

      const swatch = document.createElement("span");
      swatch.className = "category-swatch";
      swatch.style.background = category.color;

      const title = document.createElement("h3");
      title.textContent = category.name;

      const meta = document.createElement("p");
      meta.textContent = `${category.color.toUpperCase()} · ${usedBy} видео`;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "video-delete";
      deleteBtn.textContent = "Удалить";

      if (usedBy > 0) {
        deleteBtn.disabled = true;
        deleteBtn.title = "Сначала удалите или перенесите видео из этой категории.";
      } else {
        deleteBtn.addEventListener("click", () => {
          void removeVideoCategory(category.id);
        });
      }

      card.append(swatch, title, meta, deleteBtn);
      grid.append(card);
    });

  categoryAdminList.append(grid);
}

async function removeVideoCategory(categoryId) {
  if (!isAdmin) {
    return;
  }

  if (!ensureAdminAuth()) {
    return;
  }

  const category = getVideoCategoryById(categoryId);
  if (!category) {
    return;
  }

  const attached = videos.some((video) => video.categoryId === categoryId);
  if (attached) {
    alert("Нельзя удалить категорию, пока в ней есть видео.");
    return;
  }

  const ok = window.confirm(`Удалить категорию "${category.name}"?`);
  if (!ok) {
    return;
  }

  try {
    await apiRequest(`/api/video-categories/${categoryId}`, {
      method: "DELETE",
      admin: true,
    });

    videoCategories = videoCategories.filter((item) => item.id !== categoryId);

    renderVideoCategoryOptions();
    renderCategoryAdminList();
    renderAllVideoLists();
    renderStats();
  } catch (error) {
    if (error.status === 401) {
      setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
    }
    alert(`Не удалось удалить категорию: ${error.message}`);
  }
}

function renderVideoUploadPreview() {
  if (!videoUploadPreview) {
    return;
  }

  videoUploadPreview.innerHTML = "";

  const source = getVideoSource();
  const yandexLink = String(videoYadiskLinkInput?.value || "").trim();

  if (!selectedVideoFile && !selectedVideoPreviewFile && !(source === "yadisk" && yandexLink)) {
    return;
  }

  const list = document.createElement("div");
  list.className = "upload-preview-grid";

  if (source === "upload" && selectedVideoFile) {
    const videoFileItem = document.createElement("div");
    videoFileItem.className = "upload-file-item";
    videoFileItem.textContent = `Видео: ${selectedVideoFile.name}`;
    list.append(videoFileItem);
  }

  if (source === "yadisk" && yandexLink) {
    const yandexItem = document.createElement("div");
    yandexItem.className = "upload-file-item";
    yandexItem.textContent = `Я.Диск: ${yandexLink}`;
    list.append(yandexItem);
  }

  if (selectedVideoPreviewFile) {
    const previewItem = document.createElement("div");
    previewItem.className = "upload-preview-item";

    const img = document.createElement("img");
    const imgUrl = URL.createObjectURL(selectedVideoPreviewFile);
    img.src = imgUrl;
    img.alt = selectedVideoPreviewFile.name;
    img.addEventListener("load", () => URL.revokeObjectURL(imgUrl));

    const caption = document.createElement("span");
    caption.textContent = `Превью: ${selectedVideoPreviewFile.name}`;

    previewItem.append(img, caption);
    list.append(previewItem);
  }

  videoUploadPreview.append(list);
}

function clearVideoUploadForm() {
  if (!videoUploadForm) {
    return;
  }

  videoUploadForm.reset();
  selectedVideoFile = null;
  selectedVideoPreviewFile = null;
  renderVideoCategoryOptions();
  updateVideoSourceUI();
  updateVideoVisibilityUI();
}

async function onVideoUploadSubmit(event) {
  event.preventDefault();
  if (!isAdmin || !videoUploadForm || !videoTitleInput || !videoDescriptionInput || !videoCategorySelect) {
    return;
  }

  if (!ensureAdminAuth()) {
    return;
  }

  if (!videoCategories.length) {
    alert("Сначала создай минимум одну категорию для видео.");
    return;
  }

  const title = videoTitleInput.value.trim();
  const description = videoDescriptionInput.value.trim();
  const categoryId = videoCategorySelect.value;
  const sourceType = getVideoSource();
  const yandexLink = String(videoYadiskLinkInput?.value || "").trim();
  const visibility = getVideoVisibility();
  const password = String(videoPasswordInput?.value || "").trim();

  if (!title || !description || !categoryId) {
    alert("Заполни название, описание и категорию.");
    return;
  }

  if (sourceType === "upload" && !selectedVideoFile) {
    alert("Выбери файл видео.");
    return;
  }

  if (sourceType === "yadisk" && !yandexLink) {
    alert("Вставь публичную ссылку на видео в Яндекс Диске.");
    return;
  }

  if (visibility === "private" && !password) {
    alert("Для приватного видео нужен пароль.");
    return;
  }

  const category = getVideoCategoryById(categoryId);
  if (!category) {
    alert("Выбранная категория не найдена.");
    return;
  }

  const previewFile = selectedVideoPreviewFile || createFallbackPreviewFile(title, category.color);

  const submitBtn = videoUploadForm.querySelector('button[type="submit"]');
  setBusy(submitBtn, true, "Загрузка...");
  showUploadProgress("video", "Загрузка видео");

  try {
    const payload = new FormData();
    payload.append("title", title);
    payload.append("description", description);
    payload.append("categoryId", categoryId);
    payload.append("visibility", visibility);
    payload.append("sourceType", sourceType);
    payload.append("preview", previewFile, previewFile.name || "preview.svg");

    if (visibility === "private") {
      payload.append("password", password);
    }

    if (sourceType === "upload" && selectedVideoFile) {
      payload.append("video", selectedVideoFile, selectedVideoFile.name);
    }

    if (sourceType === "yadisk") {
      payload.append("sourceLink", yandexLink);
    }

    const response = await apiUploadRequest("/api/videos", {
      method: "POST",
      body: payload,
      admin: true,
      onUploadProgress: (event) => {
        updateUploadProgress("video", event, "Загрузка видео");
      },
    });

    const created = normalizeVideoItem(response?.item || {});
    videos = [created, ...videos.filter((video) => video.id !== created.id)];

    renderAllVideoLists();
    renderCategoryAdminList();
    renderStats();
    clearVideoUploadForm();
    finishUploadProgress("video", "Видео загружено");
    window.location.hash = "video-library";
  } catch (error) {
    if (error.status === 401) {
      setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
    }
    failUploadProgress("video", "Ошибка загрузки видео");
    alert(toUserFacingError("Не удалось загрузить видео", error));
  } finally {
    setBusy(submitBtn, false, "");
  }
}

async function removeVideo(videoId) {
  if (!isAdmin) {
    return;
  }

  if (!ensureAdminAuth()) {
    return;
  }

  const target = videos.find((video) => video.id === videoId);
  if (!target) {
    return;
  }

  const ok = window.confirm(`Удалить видео "${target.title}"?`);
  if (!ok) {
    return;
  }

  try {
    await apiRequest(`/api/videos/${videoId}`, {
      method: "DELETE",
      admin: true,
    });

    videos = videos.filter((video) => video.id !== videoId);
    unlockedPrivateVideoIds.delete(videoId);
    delete privateVideoPasswords[videoId];

    saveUnlockedPrivateVideoIds();
    savePrivateVideoPasswords();

    renderAllVideoLists();
    renderCategoryAdminList();
    renderStats();

    if (activeVideoId === videoId) {
      closeVideoViewer();
    }
  } catch (error) {
    if (error.status === 401) {
      setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
    }
    alert(`Не удалось удалить видео: ${error.message}`);
  }
}

function isVideoLocked(video) {
  if (isAdmin) {
    return false;
  }

  if (video.visibility !== "private") {
    return false;
  }

  return !unlockedPrivateVideoIds.has(video.id);
}

function createVideoCard(video, adminMode) {
  const card = videoCardTemplate.content.firstElementChild.cloneNode(true);

  const openBtn = card.querySelector(".video-open");
  const preview = card.querySelector(".video-preview");
  const playBadge = card.querySelector(".video-play");
  const lockBadge = card.querySelector(".video-lock");
  const categoryBadge = card.querySelector(".video-category-badge");
  const visibilityBadge = card.querySelector(".video-visibility-badge");
  const title = card.querySelector(".video-title");
  const description = card.querySelector(".video-description");
  const deleteBtn = card.querySelector(".video-delete");
  const actionRow = card.querySelector(".video-row-actions");

  const locked = isVideoLocked(video);

  preview.src = video.previewImage || createVideoPreviewFallback(video.title, video.categoryColor);
  preview.alt = `Превью ${video.title}`;
  applyCardAspectRatioFromImage(card, preview, "--video-ratio");

  categoryBadge.textContent = video.categoryName;

  visibilityBadge.textContent = video.visibility === "private" ? "Private" : "Public";
  visibilityBadge.classList.toggle("is-private", video.visibility === "private");

  title.textContent = video.title;
  description.textContent = video.description;

  if (playBadge) {
    playBadge.textContent = locked ? "LOCK" : "▶";
  }

  if (lockBadge) {
    lockBadge.hidden = !locked;
  }

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      void handleVideoOpen(video.id);
    });
  }

  if (deleteBtn) {
    if (adminMode) {
      deleteBtn.addEventListener("click", () => {
        void removeVideo(video.id);
      });
    } else {
      deleteBtn.remove();
    }
  }

  if (!adminMode && actionRow) {
    actionRow.remove();
  }

  return card;
}

function createVideoCategoryBlock(category, categoryVideos, adminMode) {
  const block = document.createElement("section");
  block.className = "video-category-block";
  block.style.setProperty("--category-bg", hexToRgba(category.color, 0.18));
  block.style.setProperty("--category-line", hexToRgba(category.color, 0.62));

  const head = document.createElement("div");
  head.className = "video-category-head";

  const title = document.createElement("h3");
  title.textContent = category.name;

  const count = document.createElement("span");
  count.textContent = `${categoryVideos.length} видео`;

  head.append(title, count);

  const grid = document.createElement("div");
  grid.className = "video-grid";

  categoryVideos.forEach((video) => {
    grid.append(createVideoCard(video, adminMode));
  });

  block.append(head, grid);
  return block;
}

function renderVideoList(container, adminMode) {
  if (!container || !videoCardTemplate) {
    return;
  }

  container.innerHTML = "";

  if (!videos.length) {
    container.append(
      makeEmptyState(
        adminMode ? "Видео пока не добавлены. Загрузи первое видео через форму выше." : "Видео-портфолио пока пустое.",
      ),
    );
    return;
  }

  const sortedVideos = videos.slice().sort((a, b) => b.createdAt - a.createdAt);
  const grouped = new Map();

  sortedVideos.forEach((video) => {
    const key = video.categoryId || "__uncategorized";
    const current = grouped.get(key) || [];
    current.push(video);
    grouped.set(key, current);
  });

  const renderedCategoryIds = new Set();

  videoCategories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .forEach((category) => {
      const group = grouped.get(category.id);
      if (!group || !group.length) {
        return;
      }

      renderedCategoryIds.add(category.id);
      container.append(createVideoCategoryBlock(category, group, adminMode));
    });

  grouped.forEach((group, categoryId) => {
    if (!group.length || renderedCategoryIds.has(categoryId)) {
      return;
    }

    const first = group[0];
    container.append(
      createVideoCategoryBlock(
        {
          id: categoryId,
          name: first?.categoryName || "Без категории",
          color: normalizeColor(first?.categoryColor || "#2f82ba"),
          createdAt: Date.now(),
        },
        group,
        adminMode,
      ),
    );
  });
}

function renderAllVideoLists() {
  renderVideoList(publicVideoCategoryList, false);
  renderVideoList(adminVideoList, true);
}

function openVideoViewer(video, streamUrl) {
  if (!videoViewer || !videoViewerPlayer || typeof videoViewer.showModal !== "function") {
    return;
  }

  activeVideoId = video.id;

  videoViewerPlayer.src = streamUrl;
  videoViewerPlayer.poster = video.previewImage || "";
  videoViewerPlayer.load();

  if (videoViewerTitle) {
    videoViewerTitle.textContent = video.title;
  }

  if (videoViewerDescription) {
    videoViewerDescription.textContent = video.description;
  }

  if (videoViewerCategory) {
    videoViewerCategory.textContent = `Категория: ${video.categoryName}`;
  }

  if (videoViewerVisibility) {
    videoViewerVisibility.textContent =
      video.visibility === "private" ? "Доступ: Private / По паролю" : "Доступ: Public";
  }

  videoViewer.showModal();
}

function closeVideoViewer() {
  if (videoViewer && videoViewer.open) {
    videoViewer.close();
  }

  if (videoViewerPlayer) {
    videoViewerPlayer.pause();
    videoViewerPlayer.removeAttribute("src");
    videoViewerPlayer.load();
  }

  activeVideoId = null;
}

async function requestVideoStream(video, password = "") {
  const body = password ? { password } : {};
  const response = await apiRequest(`/api/videos/${video.id}/play`, {
    method: "POST",
    body: JSON.stringify(body),
    admin: isAdmin,
  });

  if (!response?.streamUrl || typeof response.streamUrl !== "string") {
    throw new Error("API не вернул ссылку для воспроизведения.");
  }

  return response.streamUrl;
}

function isAuthError(error) {
  return error?.status === 401;
}

async function askPrivatePassword(video) {
  const cached = privateVideoPasswords[video.id];
  if (cached) {
    return cached;
  }

  const entered = window.prompt(`Видео "${video.title}" защищено. Введите пароль:`);
  if (entered === null) {
    return null;
  }

  return entered.trim();
}

async function handleVideoOpen(videoId) {
  const video = getVideoById(videoId);
  if (!video) {
    return;
  }

  if (isAdmin && !ensureAdminAuth()) {
    return;
  }

  let password = "";

  if (!isAdmin && video.visibility === "private") {
    password = await askPrivatePassword(video);
    if (password === null) {
      return;
    }
    if (!password) {
      alert("Нужен пароль для приватного видео.");
      return;
    }
  }

  try {
    const streamUrl = await requestVideoStream(video, password);

    if (!isAdmin && video.visibility === "private") {
      unlockedPrivateVideoIds.add(video.id);
      privateVideoPasswords[video.id] = password;
      saveUnlockedPrivateVideoIds();
      savePrivateVideoPasswords();
      renderAllVideoLists();
    }

    openVideoViewer(video, streamUrl);
  } catch (error) {
    if (!isAdmin && video.visibility === "private" && isAuthError(error)) {
      delete privateVideoPasswords[video.id];
      savePrivateVideoPasswords();
      const retry = window.prompt("Неверный пароль. Введите пароль ещё раз:");
      if (retry === null) {
        return;
      }

      try {
        const streamUrl = await requestVideoStream(video, retry.trim());
        unlockedPrivateVideoIds.add(video.id);
        privateVideoPasswords[video.id] = retry.trim();
        saveUnlockedPrivateVideoIds();
        savePrivateVideoPasswords();
        renderAllVideoLists();
        openVideoViewer(video, streamUrl);
      } catch (retryError) {
        alert(`Не удалось открыть видео: ${retryError.message}`);
      }
      return;
    }

    if (isAdmin && isAuthError(error)) {
      setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
    }

    alert(`Не удалось открыть видео: ${error.message}`);
  }
}

function setPortfolioTab(tabName, syncHash = false) {
  if (!tabButtons.length || !tabPanels.length) {
    return;
  }

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  if (syncHash) {
    const hash = tabName === "video" ? "videos" : "photos";
    history.replaceState(null, "", `#${hash}`);
  }
}

function bindPortfolioTabs() {
  if (isAdmin || !tabButtons.length) {
    return;
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPortfolioTab(button.dataset.tabTarget, true);
    });
  });

  const hash = window.location.hash.toLowerCase();
  if (hash === "#videos" || hash === "#video") {
    setPortfolioTab("video", false);
  } else {
    setPortfolioTab("photo", false);
  }
}

function bindPhotoUploadEvents() {
  if (!isAdmin || !photoForm) {
    return;
  }

  photoForm.addEventListener("submit", (event) => {
    void onPhotoSubmit(event);
  });
  photoForm.querySelectorAll('input[name="format"]').forEach((radio) => {
    radio.addEventListener("change", updatePhotoFormatUI);
  });

  if (photoFilesInput) {
    photoFilesInput.addEventListener("change", (event) => {
      setSelectedPhotoFiles(event.target.files);
    });
  }

  if (photoDropZone && photoFilesInput) {
    photoDropZone.addEventListener("click", () => photoFilesInput.click());
    photoDropZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        photoFilesInput.click();
      }
    });

    ["dragenter", "dragover"].forEach((type) => {
      photoDropZone.addEventListener(type, (event) => {
        event.preventDefault();
        photoDropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "dragend", "drop"].forEach((type) => {
      photoDropZone.addEventListener(type, () => {
        photoDropZone.classList.remove("drag-over");
      });
    });

    photoDropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      setSelectedPhotoFiles(event.dataTransfer.files);
    });
  }

  if (photoResetBtn) {
    photoResetBtn.addEventListener("click", clearPhotoForm);
  }

  updatePhotoFormatUI();
}

function bindPhotoViewerEvents() {
  if (!photoViewer) {
    return;
  }

  if (photoViewerClose) {
    photoViewerClose.addEventListener("click", closePhotoViewer);
  }

  if (photoViewerPrev) {
    photoViewerPrev.addEventListener("click", () => stepPhotoViewer(-1));
  }

  if (photoViewerNext) {
    photoViewerNext.addEventListener("click", () => stepPhotoViewer(1));
  }

  photoViewer.addEventListener("click", (event) => {
    const rect = photoViewer.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      closePhotoViewer();
    }
  });
}

function bindVideoViewerEvents() {
  if (!videoViewer) {
    return;
  }

  if (videoViewerClose) {
    videoViewerClose.addEventListener("click", closeVideoViewer);
  }

  videoViewer.addEventListener("click", (event) => {
    const rect = videoViewer.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      closeVideoViewer();
    }
  });
}

function bindVideoCategoryEvents() {
  if (!isAdmin || !categoryForm || !categoryNameInput || !categoryColorInput) {
    return;
  }

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!ensureAdminAuth()) {
      return;
    }

    const name = categoryNameInput.value.trim();
    const color = normalizeColor(categoryColorInput.value);

    if (!name) {
      alert("Введите название категории.");
      return;
    }

    const submitBtn = categoryForm.querySelector('button[type="submit"]');
    setBusy(submitBtn, true, "Создание...");

    try {
      const response = await apiRequest("/api/video-categories", {
        method: "POST",
        body: JSON.stringify({ name, color }),
        admin: true,
      });

      const created = normalizeCategoryItem(response?.item || {});
      videoCategories = [...videoCategories.filter((item) => item.id !== created.id), created];

      categoryForm.reset();
      categoryColorInput.value = "#1b7bd1";

      renderVideoCategoryOptions();
      renderCategoryAdminList();
      renderAllVideoLists();
      renderStats();
    } catch (error) {
      if (error.status === 401) {
        setAdminAuthStatus("Неверный Admin API Key. Обнови ключ и повтори.", "error");
      }
      alert(`Не удалось создать категорию: ${error.message}`);
    } finally {
      setBusy(submitBtn, false, "");
    }
  });
}

function bindVideoUploadEvents() {
  if (!isAdmin || !videoUploadForm) {
    return;
  }

  videoUploadForm.addEventListener("submit", (event) => {
    void onVideoUploadSubmit(event);
  });

  if (videoFileInput) {
    videoFileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      if (file && !file.type.startsWith("video/")) {
        alert("Можно выбрать только видео файл.");
        videoFileInput.value = "";
        selectedVideoFile = null;
      } else {
        selectedVideoFile = file;
      }
      renderVideoUploadPreview();
    });
  }

  if (videoPreviewInput) {
    videoPreviewInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      if (file && !file.type.startsWith("image/")) {
        alert("Превью должно быть изображением.");
        videoPreviewInput.value = "";
        selectedVideoPreviewFile = null;
      } else {
        selectedVideoPreviewFile = file;
      }
      renderVideoUploadPreview();
    });
  }

  if (videoYadiskLinkInput) {
    videoYadiskLinkInput.addEventListener("input", () => {
      renderVideoUploadPreview();
    });
  }

  videoSourceInputs.forEach((radio) => {
    radio.addEventListener("change", updateVideoSourceUI);
  });

  videoVisibilityInputs.forEach((radio) => {
    radio.addEventListener("change", updateVideoVisibilityUI);
  });

  if (videoResetBtn) {
    videoResetBtn.addEventListener("click", clearVideoUploadForm);
  }

  renderVideoCategoryOptions();
  updateVideoSourceUI();
  updateVideoVisibilityUI();
}

function bindGlobalKeyboardEvents() {
  window.addEventListener("keydown", (event) => {
    if (videoViewer?.open && event.key === "Escape") {
      closeVideoViewer();
      return;
    }

    if (!photoViewer?.open) {
      return;
    }

    if (event.key === "Escape") {
      closePhotoViewer();
    }

    if (event.key === "ArrowLeft") {
      stepPhotoViewer(-1);
    }

    if (event.key === "ArrowRight") {
      stepPhotoViewer(1);
    }
  });
}

async function fetchPhotos() {
  const response = await apiRequest("/api/photos");
  const items = Array.isArray(response?.items) ? response.items : [];
  photoWorks = items.map(normalizePhotoItem);
}

async function fetchCategories() {
  const response = await apiRequest("/api/video-categories");
  const items = Array.isArray(response?.items) ? response.items : [];
  videoCategories = items.map(normalizeCategoryItem);
}

async function fetchVideos() {
  const response = await apiRequest("/api/videos", { admin: isAdmin && Boolean(adminApiKey) });
  const items = Array.isArray(response?.items) ? response.items : [];
  videos = items.map(normalizeVideoItem);
}

async function refreshAllContent() {
  await Promise.all([fetchPhotos(), fetchCategories(), fetchVideos()]);

  renderPhotoGallery();
  renderVideoCategoryOptions();
  renderCategoryAdminList();
  renderAllVideoLists();
  renderVideoUploadPreview();
  renderStats();
}

async function verifyAdminCredentials() {
  await apiRequest("/api/admin/check", {
    admin: true,
  });
}

function syncAdminAuthInputs() {
  if (!isAdmin) {
    return;
  }

  if (adminApiBaseInput) {
    adminApiBaseInput.value = apiBaseUrl || "";
  }

  if (adminApiKeyInput) {
    adminApiKeyInput.value = adminApiKey || "";
  }
}

function bindAdminAuthEvents() {
  if (!isAdmin || !adminAuthForm || !adminApiBaseInput || !adminApiKeyInput) {
    return;
  }

  syncAdminAuthInputs();

  if (adminApiKey) {
    setAdminAuthStatus("Ключ найден в текущей сессии. Проверяю подключение...", "warning");
    void (async () => {
      try {
        await verifyAdminCredentials();
        setAdminAuthStatus("Подключено. Админ-операции доступны.", "success");
        await fetchVideos();
        renderAllVideoLists();
        renderCategoryAdminList();
        renderStats();
      } catch (error) {
        setAdminAuthStatus(`Ошибка проверки ключа: ${error.message}`, "error");
      }
    })();
  } else {
    setAdminAuthStatus("Введи API URL и Admin API Key для операций записи.", "warning");
  }

  adminAuthForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const baseUrl = normalizeApiBase(adminApiBaseInput.value);
    const apiKey = String(adminApiKeyInput.value || "").trim();

    if (!baseUrl) {
      setAdminAuthStatus("Укажи API URL.", "error");
      adminApiBaseInput.focus();
      return;
    }

    if (!apiKey) {
      setAdminAuthStatus("Укажи Admin API Key.", "error");
      adminApiKeyInput.focus();
      return;
    }

    const submitBtn = adminAuthForm.querySelector('button[type="submit"]');
    setBusy(submitBtn, true, "Проверка...");

    const prevBase = apiBaseUrl;
    const prevKey = adminApiKey;

    setApiBaseUrl(baseUrl, true);
    setAdminApiKey(apiKey, true);
    setAdminAuthStatus("Проверяю доступ...", "warning");

    try {
      await verifyAdminCredentials();
      setAdminAuthStatus("Подключено. Админ-операции доступны.", "success");
      await refreshAllContent();
    } catch (error) {
      setApiBaseUrl(prevBase, true);
      setAdminApiKey(prevKey, true);
      syncAdminAuthInputs();
      setAdminAuthStatus(`Не удалось подключиться: ${error.message}`, "error");
    } finally {
      setBusy(submitBtn, false, "");
    }
  });

  if (adminAuthResetBtn) {
    adminAuthResetBtn.addEventListener("click", () => {
      setAdminApiKey("", true);
      if (adminApiKeyInput) {
        adminApiKeyInput.value = "";
      }
      setAdminAuthStatus("Ключ очищен. Админ-операции отключены.", "warning");
    });
  }
}

async function init() {
  bindPortfolioTabs();
  bindPhotoUploadEvents();
  bindPhotoViewerEvents();
  bindVideoViewerEvents();
  bindVideoCategoryEvents();
  bindVideoUploadEvents();
  bindGlobalKeyboardEvents();
  bindAdminAuthEvents();

  try {
    await refreshAllContent();
  } catch (error) {
    console.error("Init failed:", error);
    alert(
      `Не удалось загрузить данные с API. Проверь API URL и запуск сервера.\n\nТекущий API URL: ${apiBaseUrl || "(пусто)"}\nОшибка: ${error.message}`,
    );
  }
}

init().catch((error) => {
  console.error("Init fatal error:", error);
});
