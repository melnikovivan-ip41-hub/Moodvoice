let mediaRecorder;
    let audioChunks = [];
    let timerInterval = null;
    let timerSeconds = 0;
    const API_BASE_URL = "https://moodvoice-api.onrender.com";

    let userHistoryRecords = [];

    // ===== КАСТОМНІ СПОВІЩЕННЯ (ПЛАШКИ) =====
    function showNotification(message, type = 'error') {
        const container = document.getElementById('notification-container');
        if (!container) return; // Захист, якщо контейнер ще не завантажився
    
        // Створюємо нову плашку
        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        toast.textContent = message;
    
        // Додаємо її на сторінку
        container.appendChild(toast);
    
        // Плавно показуємо (анімація появи)
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
    
        // Ховаємо і видаляємо через 4 секунди
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); // Чекаємо, поки закінчиться анімація зникнення
        }, 4000);
    }

    // ===== НАВІГАЦІЯ =====
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        window.scrollTo(0, 0);
        
        // Керування мікрофоном
        if (screenId === 'recording-screen') {
            startAudioRecording();
        } else {
            stopAudioRecording();
        }

        // Завантажуємо історію
        if (screenId === 'dashboard-screen') {
            loadUserHistory();
        }

        // --- НОВЕ: ЗУПИНЯЄМО ПЛЕЄР ПРИ ВИХОДІ З АНАЛІТИКИ ---
        const player = document.querySelector('#custom-audio-player audio');
        if (player && screenId !== 'analytics-screen') {
            player.pause(); // Ставимо на паузу, якщо ми пішли з екрану
        }
        // ----------------------------------------------------
    }

    // ===== АВТОРИЗАЦІЯ =====
    async function sendAuthRequest(email, password) {
        try {
            // Отправляем POST запрос на наш запущенный Spring Boot
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                   "Content-Type": "application/json"
                },
                // Превращаем данные в JSON строку
                body: JSON.stringify({ 
                    email: email, 
                    password: password 
                })
            });

            // Ждем и читаем ответ от сервера
            const data = await response.json();

            // Проверяем статус (помнишь, мы на сервере прописали "status": "success"?)
            if (data.status === "success") {
                console.log("Ура! Сервер ответил:", data.message);
                alert("Авторизация прошла успешно!");
            
                // ТУТ БУДЕТ ТВОЙ КОД: 
                // Например, закрыть окно авторизации, показать кнопку "Записать голос"
                // document.getElementById('authModal').style.display = 'none';
            }

        } catch (error) {
            console.error("Сервер недоступен или произошла ошибка:", error);
            alert("Не удалось подключиться к серверу!");
        }
    }
    
    async function handleLogin(event) {
        event.preventDefault();
    
        // 1. Знаходимо кнопку і запам'ятовуємо її оригінальний текст
        const submitBtn = event.submitter;
        const originalText = submitBtn.textContent;

        const emailValue = document.getElementById('login-email').value;
        const passwordValue = document.getElementById('login-password').value;
    
        if (passwordValue.length === 0 || emailValue.length === 0) {
             showNotification("Будь ласка, заповніть всі поля.", "error");
             return;
        }

        // 2. БЛОКУЄМО КНОПКУ
        submitBtn.disabled = true;
        submitBtn.textContent = "Завантаження...";
    
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailValue, password: passwordValue })
            });
    
            if (response.ok) {
                localStorage.setItem('userEmail', emailValue);
                showNotification("Вхід успішний!", "success");
                showScreen('dashboard-screen');
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
            } else {
                showNotification("Неправильний email або пароль.", "error");
            }
        } catch (error) {
            console.error("Сервер недоступний:", error);
            showNotification("Не вдалося підключитися до сервера.", "error");
        } finally {
            // 3. РОЗБЛОКОВУЄМО КНОПКУ ЗАВЖДИ (навіть якщо була помилка)
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async function handleRegister(event) {
        event.preventDefault();

        // 1. Знаходимо кнопку і запам'ятовуємо її оригінальний текст
        const submitBtn = event.submitter;
        const originalText = submitBtn.textContent;

        const emailValue = document.getElementById('register-email').value;
        const passwordValue = document.getElementById('register-password').value;

        const emailLower = emailValue.toLowerCase();
        const emailRegex = /^[a-z0-9._-]{6,30}@(gmail\.com|ukr\.net|kpi\.ua|student\.kpi\.ua)$/;
        
        if (!emailRegex.test(emailLower)) {
            showNotification("Логін має бути від 6 до 30 символів без спецсимволів. Дозволені домени: @gmail.com, @ukr.net, @kpi.ua", "error");
            return; 
        }

        const passwordCheck = validatePassword(passwordValue);
        if (passwordCheck !== "ok") {
            showNotification(passwordCheck, "error"); 
            return; 
        }

        // 2. БЛОКУЄМО КНОПКУ
        submitBtn.disabled = true;
        submitBtn.textContent = "Зачекайте...";

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailValue, password: passwordValue })
            });

            const data = await response.json();

            if (data.status === "success") {
                localStorage.setItem('userEmail', emailValue);
                showNotification("Реєстрація успішна!", "success");
                showScreen('dashboard-screen');
                document.getElementById('register-email').value = '';
                document.getElementById('register-password').value = '';
            } else {
                showNotification(data.message, "error");
            }
        } catch (error) {
            console.error("Сервер недоступний:", error);
            showNotification("Не вдалося підключитися до сервера.", "error");
        } finally {
            // 3. РОЗБЛОКОВУЄМО КНОПКУ ЗАВЖДИ
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    function togglePassword(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    // Функція для перевірки надійності пароля
    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        // НОВЕ: Перевірка на відсутність спецсимволів (знаходить все, що НЕ є літерою або цифрою)
        const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);

        if (password.length < minLength) {
            return "Пароль має містити щонайменше 8 символів.";
        }
        if (!hasUpperCase) {
            return "Пароль має містити хоча б одну велику літеру.";
        }
        if (!hasLowerCase) {
            return "Пароль має містити хоча б одну маленьку літеру.";
        }
        if (!hasNumbers) {
            return "Пароль має містити хоча б одну цифру.";
        }
        if (hasSpecialChars) {
            return "Пароль не повинен містити спецсимволів (лише англійські літери та цифри).";
        }
        
        return "ok"; 
    }

    // ===== ЛОГІКА ЗАПИСУ З МІКРОФОНА =====
    async function startAudioRecording() {
        audioChunks = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.start();
            startTimer();
            updateStopButtonUI(true); 
        } catch (err) {
            showNotification("Помилка доступу до мікрофона: " + err, "error");
            showScreen('dashboard-screen');
        }
    }

    function stopAudioRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            // Відключаємо мікрофон, щоб не світився індикатор у браузері
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        stopTimer();
        updateStopButtonUI(false); // Робимо кнопку фіолетовою
    }

    function toggleRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopAudioRecording();
        } else {
            startAudioRecording();
        }
    }

    function updateStopButtonUI(isRecording) {
        const stopBtn = document.querySelector('.stop-button');
        if (!stopBtn) return;

        if (isRecording) {
            stopBtn.style.background = "var(--color-danger)"; // Червоний квадрат
            stopBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
        } else {
            stopBtn.style.background = "var(--brand-gradient)"; // Фіолетове коло
            stopBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg>';
        }
    }

    function toggleMusic(btn) {
        btn.classList.toggle('playing');
        
        const textSpan = btn.querySelector('span');
        
        if (btn.classList.contains('playing')) {
            textSpan.textContent = 'Музика грає...';
        } else {
            textSpan.textContent = 'Музика під настрій';
        }
    }

    // ===== ЛОГІКА ІСТОРІЇ ЗАПИСІВ =====
    async function loadUserHistory() {
        const savedEmail = localStorage.getItem('userEmail');
        if (!savedEmail) return;

        const historyList = document.querySelector('.history-list');
        if (!historyList) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/audio/history?email=${savedEmail}`);
            if (!response.ok) throw new Error('Помилка завантаження історії');
            
            // Зберігаємо записи в глобальну змінну!
            userHistoryRecords = await response.json();
            
            historyList.innerHTML = '';

            if (userHistoryRecords.length === 0) {
                historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">У вас поки немає записів. Створіть перший!</p>';
                document.querySelector('[data-testid="stat-records"] .stat-number').textContent = '0';
                return;
            }

            document.querySelector('[data-testid="stat-records"] .stat-number').textContent = userHistoryRecords.length;

            userHistoryRecords.forEach((record, index) => {
                const dateObj = new Date(record.createdAt);
                const dateStr = dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                
                // ЗВЕРНИ УВАГУ: тепер onclick викликає openAnalytics(index)
                const recordHtml = `
                    <div class="history-item" onclick="openAnalytics(${index})">
                        <div class="history-header">
                            <div class="history-meta">
                                <div class="history-date">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    ${dateStr}
                                </div>
                                <div class="history-time">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                    ${timeStr}
                                </div>
                            </div>
                            <span class="mood-tag tag-calm">${Math.round(record.fileSize / 1024)} KB</span>
                        </div>
                        <p class="history-preview">Натисніть, щоб відкрити аналітику та прослухати 🎵</p>
                    </div>
                `;
                historyList.insertAdjacentHTML('beforeend', recordHtml);
            });
        } catch (error) {
            console.error(error);
            showNotification("Не вдалося завантажити історію записів", "error");
        }
    }

    function openAnalytics(index) {
        const record = userHistoryRecords[index];

        // Перемикаємо на екран аналітики
        showScreen('analytics-screen');

        const dateObj = new Date(record.createdAt);
        const dateStr = dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

        document.querySelector('.analytics-date').innerHTML = `
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${dateStr}</span>
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> ${timeStr}</span>
        `;

        const artSection = document.querySelector('.mood-art');
        
        // Видаляємо старий плеєр
        const oldPlayer = document.getElementById('custom-audio-player');
        if (oldPlayer) oldPlayer.remove();

        // МАЛЮЄМО СВІЙ ВЛАСНИЙ ІНТЕРФЕЙС ПЛЕЄРА
        const playerHtml = `
            <div id="custom-audio-player" class="sleek-player">
                <audio id="real-audio" style="display: none;">
                    <source src="${API_BASE_URL}/api/audio/play/${record.id}" type="audio/webm">
                </audio>
                
                <button id="play-pause-btn" class="sleek-play-btn">
                    <svg id="icon-play" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg id="icon-pause" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                
                <div class="sleek-progress-bg" id="progress-bg">
                    <div class="sleek-progress-fill" id="progress-fill"></div>
                </div>
                
                <div class="sleek-time" id="time-display">0:00 / 0:00</div>
            </div>
        `;
        artSection.insertAdjacentHTML('beforebegin', playerHtml);

        // --- ЛОГІКА ДЛЯ НАШОГО КРАСИВОГО ПЛЕЄРА ---
        const audioEl = document.getElementById('real-audio');
        const playBtn = document.getElementById('play-pause-btn');
        const iconPlay = document.getElementById('icon-play');
        const iconPause = document.getElementById('icon-pause');
        const progressBg = document.getElementById('progress-bg');
        const progressFill = document.getElementById('progress-fill');
        const timeDisplay = document.getElementById('time-display');

        // Кнопка Пауза/Плей
        playBtn.onclick = () => {
            if (audioEl.paused) {
                audioEl.play();
                iconPlay.style.display = 'none';
                iconPause.style.display = 'block';
            } else {
                audioEl.pause();
                iconPlay.style.display = 'block';
                iconPause.style.display = 'none';
            }
        };

        // Форматування часу (з 65 секунд робить 1:05)
        const formatTime = (time) => {
            if (isNaN(time)) return "0:00";
            const m = Math.floor(time / 60);
            const s = Math.floor(time % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        // Рух полоси прогресу і зміна цифр
        audioEl.ontimeupdate = () => {
            if (!audioEl.duration) return;
            const percent = (audioEl.currentTime / audioEl.duration) * 100;
            progressFill.style.width = `${percent}%`;
            timeDisplay.textContent = `${formatTime(audioEl.currentTime)} / ${formatTime(audioEl.duration)}`;
        };

        // Перемотка при кліку на полосу
        progressBg.onclick = (e) => {
            const rect = progressBg.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = clickX / rect.width;
            audioEl.currentTime = percent * audioEl.duration;
        };

        // Коли музика закінчилася - міняємо іконку на Плей
        audioEl.onended = () => {
            iconPlay.style.display = 'block';
            iconPause.style.display = 'none';
            progressFill.style.width = '0%';
        };

        // --- ПРИВ'ЯЗУЄМО КНОПКУ ВИДАЛЕННЯ ---
        const deleteBtn = document.querySelector('[data-testid="delete-btn"]');
        if (deleteBtn) {
            // При кліку викликаємо нашу нову функцію з ID поточного запису
            deleteBtn.onclick = () => deleteRecord(record.id);
        }

        // 1. Оновлюємо текст транскрипції
        const transcriptionBox = document.querySelector('[data-testid="transcription-text"]');
        if (transcriptionBox) {
            transcriptionBox.textContent = record.transcription || "Транскрипція не знайдена...";
        }

        // 2. Оновлюємо теги настрою
        const reflectionTags = document.querySelector('.reflection-tags');
        if (reflectionTags) {
            // Очищаємо старі теги і вставляємо той, що прийшов з бази
            reflectionTags.innerHTML = `
                <span class="mood-tag tag-calm" style="background: var(--brand-purple);">${record.moodType || "Аналіз"}</span>
            `;
        }

        // 3. (Бонус) Імітація зміни відсотків емоцій
        // Щоб повзунки не були завжди однаковими, трохи їх "оживимо" на основі розміру файлу
        const seed = record.fileSize ? record.fileSize % 100 : 50;
        document.querySelector('[data-testid="emotion-calm"] .progress-fill').style.width = `${Math.min(100, seed + 20)}%`;
        document.querySelector('[data-testid="emotion-calm"] .progress-value').textContent = `${Math.min(100, seed + 20)}%`;
        
        document.querySelector('[data-testid="emotion-joy"] .progress-fill').style.width = `${Math.abs(80 - seed)}%`;
        document.querySelector('[data-testid="emotion-joy"] .progress-value').textContent = `${Math.abs(80 - seed)}%`;
    }

    // ===== ТАЙМЕР =====
    function startTimer() {
        timerSeconds = 0;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        const display = document.getElementById('recording-timer');
        if (display) display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // ===== ЗБЕРЕЖЕННЯ / СКАСУВАННЯ =====
    function cancelRecording() {
        stopAudioRecording();
        timerSeconds = 0;
        showScreen('dashboard-screen');
    }

    async function saveRecording() {
        stopAudioRecording();
        
        if (audioChunks.length === 0) {
            showNotification("Запис порожній!", "error");
            return;
        }

        showNotification("Відправляємо аудіо на сервер...", "success");

        // 1. Збираємо аудіо в файл
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // --- ФОКУС: Прослуховування себе ---
        // Відразу вмикаємо запис, щоб ти почув, що мікрофон реально працює!
        //const audioUrl = URL.createObjectURL(audioBlob);
        //const player = new Audio(audioUrl);
        //player.play();
        // -----------------------------------

        // 2. Пакуємо файл і пошту для відправки
        const formData = new FormData();
        formData.append("file", audioBlob, "record.webm");
        
        // Дістаємо пошту з пам'яті браузера (або ставимо аноніма, якщо забули)
        const savedEmail = localStorage.getItem('userEmail') || "anonymous@kpi.ua";
        formData.append("email", savedEmail);

        try {
            // 3. Відправляємо на Java
            const response = await fetch(`${API_BASE_URL}/api/audio/upload`, {
                method: "POST",
                body: formData // headers тут не потрібні, браузер все зробить сам
            });
            
            const data = await response.json();
            
            if (response.ok && data.status === "success") {
                // Виводимо повідомлення від Java
                showNotification(data.message, "success");
                
                // --- ВИПРАВЛЕННЯ БАГУ ТУТ ---
                // Оновлюємо масив записів з бази (новий стане найпершим)
                await loadUserHistory(); 
                // Відкриваємо екран аналітики саме для цього найновішого запису!
                openAnalytics(0);        
                // ----------------------------
                
            } else {
                showNotification("Помилка: " + data.message, "error");
            }
        } catch (error) {
            console.error("Помилка відправки:", error);
            showNotification("Java-сервер не відповідає. Можливо, він ще 'прокидається'.", "error");
        }
    }

    // ===== ЛОГІКА ВИДАЛЕННЯ ЗАПИСУ =====
    async function deleteRecord(recordId) {
        // Запитуємо підтвердження у користувача (захист від випадкового кліку)
        if (!confirm("Ви впевнені, що хочете назавжди видалити цей запис?")) {
            return;
        }

        showNotification("Видалення...", "success");

        try {
            const response = await fetch(`${API_BASE_URL}/api/audio/delete/${recordId}`, {
                method: "DELETE"
            });
            
            const data = await response.json();
            
            if (response.ok && data.status === "success") {
                showNotification(data.message, "success");
                
                // Якщо видалили успішно - повертаємося на Дашборд
                // Функція showScreen('dashboard-screen') автоматично підтягне оновлений список без цього файлу
                showScreen('dashboard-screen');
            } else {
                showNotification("Помилка: " + data.message, "error");
            }
        } catch (error) {
            console.error("Помилка видалення:", error);
            showNotification("Сервер не відповідає.", "error");
        }
    }

    // ===== ВКЛАДКИ ПІДТРИМКИ =====
    function switchSupportTab(tab) {
        const tabs = document.querySelectorAll('#support-tabs .tab');
        const findContent = document.getElementById('find-support-content');
        const chatsContent = document.getElementById('my-chats-content');
        
        tabs.forEach(t => t.classList.remove('active'));
        
        if (tab === 'find') {
            tabs[0].classList.add('active');
            findContent.style.display = 'block';
            chatsContent.style.display = 'none';
        } else {
            tabs[1].classList.add('active');
            findContent.style.display = 'none';
            chatsContent.style.display = 'block';
        }
    }

    // ===== ЛОГІКА АНОНІМНОГО ПОШУКУ =====
    function startAnonymousSearch() {
        // Ховаємо велику картку
        document.getElementById('search-card').style.display = 'none';
        // Показуємо результати
        document.getElementById('search-results-area').style.display = 'block';
    }

    function stopAnonymousSearch() {
        // Ховаємо результати
        document.getElementById('search-results-area').style.display = 'none';
        // Знову показуємо велику картку
        document.getElementById('search-card').style.display = 'block';
    }

    // ===== ІНІЦІАЛІЗАЦІЯ (Анімація хвиль) =====
    document.addEventListener('DOMContentLoaded', () => {
        const waveBars = document.querySelectorAll('.wave-bar');
        waveBars.forEach((bar, index) => {
            const delay = (index * 0.05) + (Math.random() * 0.1);
            const duration = 0.6 + (Math.random() * 0.4);
            bar.style.animationDelay = `${delay}s`;
            bar.style.animationDuration = `${duration}s`;
        });
    });
