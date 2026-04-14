let mediaRecorder;
    let audioChunks = [];
    let timerInterval = null;
    let timerSeconds = 0;
    const API_BASE_URL = "https://moodvoice-api.onrender.com";

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
        
        // Керування мікрофоном при переході на екран запису
        if (screenId === 'recording-screen') {
            startAudioRecording();
        } else {
            stopAudioRecording();
        }
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

        localStorage.setItem('userEmail', emailValue);
    
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

        localStorage.setItem('userEmail', emailValue);

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
                // Виводимо повідомлення від Java (там буде розмір файлу та ID бази даних)
                showNotification(data.message, "success");
                showScreen('analytics-screen');
            } else {
                showNotification("Помилка: " + data.message, "error");
            }
        } catch (error) {
            console.error("Помилка відправки:", error);
            showNotification("Java-сервер не відповідає. Можливо, він ще 'прокидається'.", "error");
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
