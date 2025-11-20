// === Навигация ===
function goHome() { location.href = "http://stasssercheff.github.io/shbb25/"; }
function goBack() {
  const currentPath = window.location.pathname;
  const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
  const upperPath = parentPath.substring(0, parentPath.lastIndexOf("/"));
  window.location.href = upperPath + "/index.html";
}

// === Автоподстановка даты ===
document.addEventListener("DOMContentLoaded", () => {
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    dateEl.textContent = `${day}.${month}.${year}`;
  }
});

// === Переключение языка ===
function switchLanguage(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[key] && translations[key][lang]) {
      el.textContent = translations[key][lang];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (translations[key] && translations[key][lang]) {
      el.setAttribute("placeholder", translations[key][lang]);
    }
  });
}

// === Сохранение/восстановление данных формы ===
function saveFormData() {
  const data = {};
  document.querySelectorAll("select").forEach(select => { data[select.name || select.id] = select.value; });
  document.querySelectorAll("textarea.comment").forEach(textarea => { data[textarea.name || textarea.id] = textarea.value; });
  document.querySelectorAll("input").forEach(input => { data[input.name || input.id] = input.value; });
  localStorage.setItem("formData", JSON.stringify(data));
}

function restoreFormData() {
  const saved = localStorage.getItem("formData");
  if (!saved) return;
  const data = JSON.parse(saved);
  document.querySelectorAll("select").forEach(select => {
    if (data[select.name || select.id] !== undefined) select.value = data[select.name || select.id];
  });
  document.querySelectorAll("textarea.comment").forEach(textarea => {
    if (data[textarea.name || textarea.id] !== undefined) textarea.value = data[textarea.name || textarea.id];
  });
  document.querySelectorAll("input").forEach(input => {
    if (data[input.name || input.id] !== undefined) input.value = data[input.name || input.id];
  });
}

// === Карта ===
let map, marker, selectedCoords;
document.addEventListener("DOMContentLoaded", () => {
  // Инициализация карты
  map = L.map("map").setView([12.2388, 109.1967], 13); // Нячанг
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  map.on("click", e => {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map);
    selectedCoords = `https://maps.google.com/?q=${lat},${lng}`;
    document.getElementById("coords").textContent = selectedCoords;
  });
});

// === DOMContentLoaded ===
document.addEventListener("DOMContentLoaded", () => {
  const lang = localStorage.getItem("lang") || "ru";
  restoreFormData();
  switchLanguage(lang);

  document.querySelectorAll("select, textarea.comment, input").forEach(el => {
    el.addEventListener("input", saveFormData);
  });

  const buildMessage = lang => {
    let message = `🧾 <b>${lang === "en" ? "PRODUCT ORDER" : "ЗАКАЗ ПРОДУКТОВ"}</b>\n\n`;

    const date = document.getElementById("current-date")?.textContent || "—";
    message += `📅 ${lang === "en" ? "Date" : "Дата"}: ${date}\n`;

    const userName = document.getElementById("userName")?.value || "—";
    const userContact = document.getElementById("userContact")?.value || "—";
    message += `${translations["user_name"][lang]}: ${userName}\n`;
    message += `${translations["user_contact"][lang]}: ${userContact}\n`;

    if (selectedCoords) {
      message += `📍 ${translations["user_location"][lang]}: ${selectedCoords}\n\n`;
    }

    document.querySelectorAll(".menu-section").forEach(section => {
      const sectionTitle = section.querySelector(".section-title");
      const titleKey = sectionTitle?.dataset.i18n;
      const title = translations[titleKey]?.[lang] || sectionTitle?.textContent || "";
      let sectionContent = "";

      const dishes = Array.from(section.querySelectorAll(".dish")).filter(dish => {
        const select = dish.querySelector("select.qty");
        return select && select.value;
      });

      dishes.forEach((dish, index) => {
        const label = dish.querySelector("label");
        const labelKey = label?.dataset.i18n;
        const labelText = translations[labelKey]?.[lang] || label?.textContent || "—";
        sectionContent += `${index + 1}. ${labelText}\n`;
      });

      const commentField = section.querySelector("textarea.comment");
      if (commentField && commentField.value.trim()) {
        sectionContent += `💬 ${lang === "en" ? "Comment" : "Комментарий"}: ${commentField.value.trim()}\n`;
      }

      if (sectionContent.trim()) message += `${title}\n${sectionContent}\n`;
    });

    return message;
  };

  // === Кнопка отправки ===
  const button = document.getElementById("sendToTelegram");
  button.addEventListener("click", async () => {
    const chat_id = "НОВЫЙ_CHAT_ID"; // сюда твой актуальный chat_id
    const worker_url = "https://shbb1.stassser.workers.dev/";
    const accessKey = "14d92358-9b7a-4e16-b2a7-35e9ed71de43";

    const sendMessage = msg => fetch(worker_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text: msg })
    }).then(res => res.json());

    const sendAllParts = async text => {
      let start = 0;
      while (start < text.length) {
        const chunk = text.slice(start, start + 4000);
        await sendMessage(chunk);
        start += 4000;
      }
    };

    const clearForm = () => {
      document.querySelectorAll("select, textarea.comment, input").forEach(el => el.value = "");
      document.getElementById("coords").textContent = "—";
      if (marker) marker.remove();
      selectedCoords = null;
      localStorage.clear();
    };

    try {
      for (const lang of window.sendLangs) {
        const msg = buildMessage(lang);
        await sendAllParts(msg);
      }
      alert("✅ ОТПРАВЛЕНО");
      clearForm();
    } catch (err) {
      alert("❌ Ошибка при отправке: " + err.message);
      console.error(err);
    }
  });
});
