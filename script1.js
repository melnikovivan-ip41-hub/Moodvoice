// ===== SCREEN NAVIGATION =====
        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            document.getElementById(screenId).classList.add('active');
            window.scrollTo(0, 0);
            
            // Start timer when entering recording screen
            if (screenId === 'recording-screen') {
                startRecordingTimer();
            } else {
                stopRecordingTimer();
            }
        }

        // ===== AUTH HANDLERS =====
        function handleLogin(event) {
            event.preventDefault();
            // Here will be backend call for Spring Boot
            showScreen('dashboard-screen');
        }

        function handleRegister(event) {
            event.preventDefault();
            // Here will be backend call for Spring Boot
            showScreen('dashboard-screen');
        }

        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        // ===== RECORDING TIMER =====
        let timerInterval = null;
        let timerSeconds = 0;

        function startRecordingTimer() {
            timerSeconds = 0;
            updateTimerDisplay();
            timerInterval = setInterval(() => {
                timerSeconds++;
                updateTimerDisplay();
            }, 1000);
        }

        function stopRecordingTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(timerSeconds / 60);
            const seconds = timerSeconds % 60;
            document.getElementById('recording-timer').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        function toggleRecording() {
            // Toggle pause/resume - for now just visual feedback
            const stopBtn = document.querySelector('.stop-button');
            stopBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                stopBtn.style.transform = 'scale(1)';
            }, 100);
        }

        function cancelRecording() {
            stopRecordingTimer();
            timerSeconds = 0;
            showScreen('dashboard-screen');
        }

        function saveRecording() {
            stopRecordingTimer();
            // Here will be backend call for Spring Boot
            alert('Тут буде виклик бекенду для збереження аудіо!');
            showScreen('analytics-screen');
        }

        // ===== SUPPORT TABS =====
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

        // ===== INITIALIZE =====
        document.addEventListener('DOMContentLoaded', () => {
            // Add random animation delays to wave bars for more natural effect
            const waveBars = document.querySelectorAll('.wave-bar');
            waveBars.forEach((bar, index) => {
                const delay = (index * 0.05) + (Math.random() * 0.1);
                const duration = 0.6 + (Math.random() * 0.4);
                bar.style.animationDelay = `${delay}s`;
                bar.style.animationDuration = `${duration}s`;
            });
        });