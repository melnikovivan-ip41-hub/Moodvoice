let mediaRecorder;
    let audioChunks = [];
    let timerInterval = null;
    let timerSeconds = 0;

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
            const response = await fetch("http://localhost:8080/api/auth/register", {
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
    
    function handleLogin(event) {
        event.preventDefault();
        showScreen('dashboard-screen');
    }

    // Функція для обробки реєстрації
    async function handleRegister(event) {
        // 1. Зупиняємо стандартне перезавантаження сторінки
        event.preventDefault();

        // 2. Отримуємо дані з твоїх інпутів (за їхніми ID з HTML)
        const emailValue = document.getElementById('register-email').value;
        const passwordValue = document.getElementById('register-password').value;

        try {
            // 3. Відправляємо POST-запит на наш Java-сервер
            const response = await fetch("http://localhost:8080/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    email: emailValue, 
                    password: passwordValue 
                })
            });

            // 4. Читаємо відповідь від сервера
            const data = await response.json();

            // 5. Перевіряємо статус
            if (data.status === "success") {
                console.log("Відповідь сервера:", data.message);
            
                // Якщо все ок, перекидаємо користувача на головний екран (Дашборд)
                showScreen('dashboard-screen');
            
                // Очищаємо поля вводу, щоб форма була чистою наступного разу
                document.getElementById('register-email').value = '';
                document.getElementById('register-password').value = '';
            } else {
                alert("Виникла помилка: " + data.message);
           }

        } catch (error) {
            console.error("Сервер недоступний:", error);
            alert("Не вдалося підключитися до сервера. Перевірте з'єднання.");
        }
    }

    function togglePassword(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    // ===== ЛОГІКА ЗАПИСУ З МІКРОФОНА =====
    async function startAudioRecording() {
        audioChunks = [];
        try {
            // Запитуємо дозвіл на мікрофон
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.start();
            startTimer();
            updateStopButtonUI(true); // Робимо кнопку червоною
        } catch (err) {
            alert("Помилка доступу до мікрофона: " + err);
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
            alert("Запис порожній!");
            return;
        }

        // === ДЕМО-РЕЖИМ: Імітуємо успішне збереження ===
        console.log("Аудіо успішно записано у браузері. Розмір: " + audioChunks.length + " шматків.");
        alert("Демо-режим: Аудіо успішно збережено! Переходимо до аналітики.");
        showScreen('analytics-screen');

        /* === СПРАВЖНІЙ КОД ДЛЯ JAVA (Закоментовано до кращих часів) ===
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "record.webm");

        try {
            const response = await fetch("http://localhost:8080/api/audio/upload", {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            alert("Успішно: " + data.message);
            showScreen('analytics-screen');
        } catch (error) {
            console.error("Помилка відправки:", error);
            alert("Java-сервер не відповідає. Запустіть Spring Boot!");
        }
        =============================================================== */
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
