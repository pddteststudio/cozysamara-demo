/* Kozy Samara — independent demonstration. Local-only forms and image preview. */
(() => {
  'use strict';
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));
  const state = { item: 'Диван', count: 1, photos: [] };
  const contactURL = 'https://vk.me/cozysamara';
  let toastTimer;

  function notify(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 3900);
  }
  async function clipboardCopy(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:-9000px;left:-9000px;opacity:0';
        document.body.appendChild(area);
        area.focus(); area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('copy unavailable');
      }
      notify('Текст запроса скопирован. Вставьте его в сообщения компании.');
    } catch (_) { notify('Копирование недоступно. Попробуйте открыть сайт через HTTPS.'); }
  }

  // Navigation
  const menu = $('#mobile-nav');
  const menuButton = $('#menu-toggle');
  function setMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    const use = $('use', menuButton);
    if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  $$('#mobile-nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (innerWidth > 950) setMenu(false); });

  // Real interactive comparison, labeled as illustrative SVG content.
  const compareSlider = $('#compare-slider');
  const compareFrame = $('#compare-frame');
  function updateCompare() { compareFrame.style.setProperty('--split', `${compareSlider.value}%`); }
  compareSlider.addEventListener('input', updateCompare);
  updateCompare();

  function updateSummary() {
    const type = state.item === 'Диван' ? `Диван (${ $('#sofa-type').value.toLowerCase() })` : state.item;
    const problems = $$('#problem-choices input:checked').map(item => item.value);
    const area = $('#district').value;
    $('#summary-text').textContent = `${type} · ${state.count} шт. · ${area}${problems.length ? ` · ${problems.join(', ')}` : ''}`;
  }
  function chooseFurniture(item, options = {}) {
    if (!['Диван', 'Кресло', 'Стулья', 'Ковровое покрытие', 'Детская коляска', 'Автокресло'].includes(item)) return;
    state.item = item;
    $$('[data-item]').forEach(button => {
      const selected = button.dataset.item === item;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $('#sofa-type-group').hidden = item !== 'Диван';
    updateSummary();
    if (options.scroll) {
      $('#estimate').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      $('#furniture-choices button[aria-pressed="true"]')?.focus({ preventScroll: true });
      notify(`Выбрано: ${item}. Опишите изделие для оценки.`);
    }
  }
  $$('[data-item]').forEach(button => button.addEventListener('click', () => chooseFurniture(button.dataset.item)));
  $$('[data-service-choice]').forEach(button => button.addEventListener('click', () => chooseFurniture(button.dataset.serviceChoice, {scroll: true})));
  function setCount(num) {
    state.count = Math.max(1, Math.min(8, Math.round(Number(num) || 1)));
    $('#furniture-count').value = state.count;
    $('#count-display').textContent = state.count;
    $('#count-minus').disabled = state.count === 1;
    $('#count-plus').disabled = state.count === 8;
    updateSummary();
  }
  $('#count-minus').addEventListener('click', () => setCount(state.count - 1));
  $('#count-plus').addEventListener('click', () => setCount(state.count + 1));
  $('#furniture-count').addEventListener('change', event => setCount(event.target.value));
  setCount(1);
  ['#sofa-type','#material','#district'].forEach(s => $(s).addEventListener('change', updateSummary));
  $$('#problem-choices input').forEach(input => input.addEventListener('change', updateSummary));
  $('#comment').addEventListener('input', event => { $('#comment-length').textContent = event.target.value.length; });

  // Stains: selecting stain chip adjusts the category in the estimate form.
  const stainToProblem = {
    'Бытовые пятна': 'Повседневные загрязнения',
    'Напитки и еда': 'Пятна от еды и напитков',
    'Воск и чернила': 'Воск или чернила',
    'Следы животных': 'Запахи и следы животных'
  };
  $$('[data-stain]').forEach(button => button.addEventListener('click', () => {
    $$('[data-stain]').forEach(other => {
      const active = other === button;
      other.classList.toggle('active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    $('#selected-stain').textContent = button.dataset.stain;
    const value = stainToProblem[button.dataset.stain];
    const input = $$('#problem-choices input').find(node => node.value === value);
    if (input) { input.checked = true; updateSummary(); }
  }));

  // Local-only image previews, no network uploads or persistence.
  const photosInput = $('#photos');
  const photosView = $('#photo-previews');
  function removePhoto(index) {
    const [entry] = state.photos.splice(index, 1);
    if (entry) URL.revokeObjectURL(entry.url);
    renderPhotos();
  }
  function renderPhotos() {
    photosView.replaceChildren();
    for (let index = 0; index < state.photos.length; index++) {
      const photo = state.photos[index];
      const item = document.createElement('div'); item.className = 'photo-preview';
      const img = document.createElement('img'); img.src = photo.url; img.alt = `Предпросмотр: ${photo.name}`;
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `Удалить фото ${index + 1}: ${photo.name}`);
      button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>';
      button.addEventListener('click', () => removePhoto(index));
      item.append(img, button); photosView.append(item);
    }
  }
  photosInput.addEventListener('change', () => {
    const files = Array.from(photosInput.files || []);
    let skipped = 0;
    for (const file of files) {
      if (state.photos.length >= 3) { skipped++; continue; }
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024 || file.size === 0) { skipped++; continue; }
      state.photos.push({name:file.name,url:URL.createObjectURL(file)});
    }
    photosInput.value = '';
    renderPhotos();
    if (skipped) notify('Можно добавить до трёх JPG/PNG/WebP не больше 8 МБ каждый.');
    else if (files.length) notify('Фото добавлены только для локального просмотра.');
  });
  window.addEventListener('pagehide', () => state.photos.forEach(p => URL.revokeObjectURL(p.url)));

  $('#copy-request').addEventListener('click', () => {
    const problems = $$('#problem-choices input:checked').map(i => i.value);
    const commentary = $('#comment').value.trim();
    const text = [
      'Здравствуйте! Хочу узнать стоимость химчистки в «Кози».',
      `Мебель: ${state.item}${state.item === 'Диван' ? ` (${ $('#sofa-type').value.toLowerCase() })` : ''}.`,
      `Количество: ${state.count} шт.`,
      `Обивка: ${$('#material').value}.`,
      `Загрязнения: ${problems.length ? problems.join(', ') : 'не указаны'}.`,
      `Местоположение: ${$('#district').value}.`,
      commentary ? `Дополнительно: ${commentary}.` : null,
      state.photos.length ? `Есть ${state.photos.length} фото — приложу их к сообщению отдельно.` : 'Могу отправить фотографии отдельно.',
      'Подскажите предварительную стоимость, доступность услуги и условия выезда. Спасибо!'
    ].filter(Boolean).join('\n');
    clipboardCopy(text);
  });
  // VK link is separate from the copy action; the browser never claims it submitted the inquiry.
  $$(`a[href="${contactURL}"]`).forEach(el => { el.rel = 'noopener noreferrer'; });
  updateSummary();

  // Progressive, user-preference-respecting reveals. Site stays visible if JS/observer unavailable.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const nodes = $$('.reveal');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .075, rootMargin: '0px 0px 110px 0px' });
    nodes.forEach(el => observer.observe(el));
    document.documentElement.classList.add('js-reveal');
    // Show in-view nodes immediately even on very short screens.
    nodes.filter(el => el.getBoundingClientRect().top < innerHeight + 80).forEach(el => el.classList.add('is-visible'));
  }
})();
