        // ==================== 全局通用 ====================
        const getTodayDateStr = () => new Date().toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'}).replace(/\//g, '-');
        
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.innerText = message; toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }
        function escapeHTML(value = '') {
            return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        }
        function escapeAttr(value = '') {
            return escapeHTML(value).replace(/`/g, '&#96;');
        }
        function normalizeArray(value, fallback = []) {
            return Array.isArray(value) ? value : fallback;
        }
        function createId(prefix = 'task') {
            return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/[^\w-]/g, '_');
        }
        const TASK_FREQUENCIES = [
            { value: 'daily', label: '每日' },
            { value: 'workday', label: '工作日' },
            { value: 'weekly', label: '每周' },
            { value: 'custom', label: '自定义' }
        ];
        const TASK_DIFFICULTIES = [
            { value: 'easy', label: '低' },
            { value: 'medium', label: '中' },
            { value: 'hard', label: '高' }
        ];
        const TASK_TEMPLATES = {
            bingo: [
                { key: 'tinyStart', label: '2 分钟启动', task: { name: '2 分钟启动', tags: ['启动'], frequency: 'daily', difficulty: 'easy', estimate: 2, minVersion: '打开工具并做第一步' } },
                { key: 'review', label: '晚间复盘', task: { name: '晚间复盘', tags: ['复盘'], frequency: 'daily', difficulty: 'easy', estimate: 5, minVersion: '写一句完成/未完成原因' } },
                { key: 'deepWork', label: '主线推进', task: { name: '推进主线 25 分钟', tags: ['主线'], frequency: 'workday', difficulty: 'medium', estimate: 25, minVersion: '只做 5 分钟启动' } }
            ],
            discipline: [
                { key: 'movement', label: '运动底线', task: { name: '运动底线', if: '到固定运动时间', then: '完成最低版本运动', tags: ['运动'], frequency: 'daily', difficulty: 'medium', estimate: 15, minVersion: '拉伸 3 分钟', schedule: [0,1,2,3,4,5,6], target: 1 } },
                { key: 'sleep', label: '睡眠底线', task: { name: '睡前关机', if: '到睡前 30 分钟', then: '放下屏幕并准备睡觉', tags: ['睡眠'], frequency: 'daily', difficulty: 'medium', estimate: 10, minVersion: '把手机放远 5 分钟', schedule: [0,1,2,3,4,5,6], target: 1 } },
                { key: 'weeklyReview', label: '周复盘', task: { name: '周复盘', if: '周日晚上', then: '记录本周最有效和最卡住的任务', tags: ['复盘'], frequency: 'weekly', difficulty: 'easy', estimate: 15, minVersion: '写 3 行总结', schedule: [0], target: 1 } }
            ]
        };
        function normalizeTags(value) {
            return [...new Set(normalizeArray(value, String(value || '').split(/[，,\s]+/))
                .map(tag => String(tag).trim())
                .filter(Boolean))]
                .slice(0, 8);
        }
        function normalizeFrequency(value = 'daily') {
            return TASK_FREQUENCIES.some(item => item.value === value) ? value : 'daily';
        }
        function normalizeDifficulty(value = 'medium') {
            return TASK_DIFFICULTIES.some(item => item.value === value) ? value : 'medium';
        }
        function normalizeEstimate(value = 10) {
            return Math.min(480, Math.max(1, Number(value) || 10));
        }
        function normalizeTaskRecord(task, fallback = {}) {
            const source = typeof task === 'string' ? { name: task } : (task || {});
            const name = String(source.name || fallback.name || '').trim();
            return {
                id: String(source.id || fallback.id || createId('t')).replace(/[^\w-]/g, '_'),
                name,
                tags: normalizeTags(source.tags || fallback.tags || []),
                frequency: normalizeFrequency(source.frequency || fallback.frequency || 'daily'),
                difficulty: normalizeDifficulty(source.difficulty || fallback.difficulty || 'medium'),
                estimate: normalizeEstimate(source.estimate || fallback.estimate || 10),
                minVersion: String(source.minVersion || fallback.minVersion || '').trim()
            };
        }
        function getTaskName(task) {
            return typeof task === 'string' ? task : String((task && task.name) || '').trim();
        }
        function getTaskMeta(task) {
            return normalizeTaskRecord(task);
        }
        function labelFor(options, value) {
            return (options.find(item => item.value === value) || {}).label || value;
        }
        function renderTemplateButtons(containerId, scope) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            TASK_TEMPLATES[scope].forEach(template => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'task-template-btn btn-press';
                btn.textContent = `套用：${template.label}`;
                btn.onclick = () => scope === 'bingo' ? addBingoTaskTemplate(template.key) : addNewTaskTemplate(template.key);
                container.appendChild(btn);
            });
        }
        function scheduleFromFrequency(frequency) {
            if (frequency === 'workday') return [1, 2, 3, 4, 5];
            if (frequency === 'weekly') return [0];
            return [0, 1, 2, 3, 4, 5, 6];
        }
        function normalizeDiscTask(task, fallback = {}) {
            const base = normalizeTaskRecord(task, fallback);
            const source = typeof task === 'string' ? {} : (task || {});
            const frequency = normalizeFrequency(source.frequency || fallback.frequency || base.frequency);
            return {
                ...base,
                frequency,
                if: String(source.if || fallback.if || '').trim(),
                then: String(source.then || fallback.then || '').trim(),
                schedule: normalizeArray(source.schedule, fallback.schedule || scheduleFromFrequency(frequency)).map(Number).filter(day => day >= 0 && day <= 6),
                target: Math.min(20, Math.max(1, Number(source.target || fallback.target) || 1))
            };
        }
        function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            navigator.serviceWorker.register('./sw.js').catch(() => {
                showToast('离线缓存注册失败，请稍后重试');
            });
        }
        const THEME_KEY = 'executionSystemTheme';
        const THEME_MODES = ['system', 'light', 'dark'];
        const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
        function getSavedThemeMode() {
            const saved = localStorage.getItem(THEME_KEY);
            return THEME_MODES.includes(saved) ? saved : 'system';
        }
        function getEffectiveTheme(mode = getSavedThemeMode()) {
            return mode === 'system' ? (systemDarkQuery.matches ? 'dark' : 'light') : mode;
        }
        function applyThemeMode(mode = getSavedThemeMode(), persist = false) {
            document.documentElement.dataset.theme = mode;
            if (persist) localStorage.setItem(THEME_KEY, mode);
            const effectiveTheme = getEffectiveTheme(mode);
            const themeColor = effectiveTheme === 'dark' ? '#0f172a' : '#ffffff';
            document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
            document.querySelectorAll('.theme-toggle').forEach(btn => {
                btn.setAttribute('title', mode === 'system' ? '跟随系统' : mode === 'dark' ? '深色模式' : '浅色模式');
            });
            if (typeof updateBingoProgress === 'function') updateBingoProgress();
        }
        function cycleThemeMode() {
            const current = getSavedThemeMode();
            const next = THEME_MODES[(THEME_MODES.indexOf(current) + 1) % THEME_MODES.length];
            applyThemeMode(next, true);
            HAPTIC.play(HAPTIC.tap);
            showToast(next === 'system' ? '跟随系统主题' : next === 'dark' ? '已切换深色模式' : '已切换浅色模式');
        }
        systemDarkQuery.addEventListener('change', () => {
            if (getSavedThemeMode() === 'system') applyThemeMode('system');
        });
        function cssVar(name) {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        }
        const HAPTIC = {
            tap: 12,
            success: [25, 30, 45],
            warning: [50, 40, 50],
            complete: [35, 25, 70],
            bingo: [80, 40, 120, 40, 180],
            delete: [70, 35, 35],
            reset: [35, 30, 35, 30, 70],
            streak: [30, 35, 30, 35, 120],
            _lastSource: null,
            play(preset = this.tap, sourceEl = this._lastSource) {
                const pattern = Array.isArray(preset) ? preset : [preset];
                if (navigator.vibrate) {
                    navigator.vibrate(0);
                    if (navigator.vibrate(pattern)) return true;
                }
                this.fallback(sourceEl);
                return false;
            },
            fallback(sourceEl) {
                const target = sourceEl || document.activeElement;
                if (!target || !target.classList) return;
                target.classList.remove('haptic-fallback');
                void target.offsetWidth;
                target.classList.add('haptic-fallback');
                setTimeout(() => target.classList.remove('haptic-fallback'), 140);
            }
        };
        window.HAPTIC = HAPTIC;
        function vibrate(p) { HAPTIC.play(p); }
        function setupButtonHaptics() {
            document.addEventListener('click', event => {
                const target = event.target.closest('button, .grid-item, .task-card');
                if (!target || target.dataset.haptic === 'off') return;
                HAPTIC._lastSource = target;
                playPressAnimation(target, event);
                const preset = target.dataset.haptic && HAPTIC[target.dataset.haptic] ? HAPTIC[target.dataset.haptic] : HAPTIC.tap;
                HAPTIC.play(preset, target);
            }, true);
        }
        function playPressAnimation(target, event) {
            target.classList.remove('micro-bounce');
            void target.offsetWidth;
            target.classList.add('micro-bounce');
            setTimeout(() => target.classList.remove('micro-bounce'), 280);

            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            const ripple = document.createElement('span');
            ripple.className = 'ripple-wave';
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${event.clientX - rect.left}px`;
            ripple.style.top = `${event.clientY - rect.top}px`;
            target.appendChild(ripple);
            setTimeout(() => ripple.remove(), 540);
        }

        function switchTab(tab) {
            HAPTIC.play(HAPTIC.tap);
            const viewBingo = document.getElementById('view-bingo');
            const viewDisc = document.getElementById('view-discipline');
            const navBingo = document.getElementById('nav-bingo');
            const navDisc = document.getElementById('nav-discipline');

            if (tab === 'bingo') {
                viewBingo.classList.remove('hidden'); viewDisc.classList.add('hidden');
                navBingo.className = "flex-1 py-4 flex flex-col items-center text-blue-600 transition";
                navDisc.className = "flex-1 py-4 flex flex-col items-center text-gray-400 transition hover:text-gray-600";
            } else {
                viewBingo.classList.add('hidden'); viewDisc.classList.remove('hidden');
                navBingo.className = "flex-1 py-4 flex flex-col items-center text-gray-400 transition hover:text-gray-600";
                navDisc.className = "flex-1 py-4 flex flex-col items-center text-slate-800 transition";
            }
        }

        function exportData() {
            const exportObj = { bingo: bingoState, discipline: discState };
            const blob = new Blob([JSON.stringify(exportObj)], { type: "application/json" });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `System_Backup_${getTodayDateStr()}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); showToast("已导出全系统数据");
        }
        function sanitizeBingoData(data) {
            const next = { ...bingoState, ...(data || {}) };
            next.gridSize = [3, 4, 5, 6].includes(Number(next.gridSize)) ? Number(next.gridSize) : 4;
            next.taskLibrary = normalizeArray(next.taskLibrary, []).map(task => normalizeTaskRecord(task)).filter(task => task.name);
            next.currentTasks = normalizeArray(next.currentTasks, []).map(task => getTaskName(task));
            next.currentStates = normalizeArray(next.currentStates, []).map(Boolean);
            next.bingoLines = normalizeArray(next.bingoLines, []);
            next.history = next.history && typeof next.history === 'object' ? next.history : {};
            next.todayMood = next.todayMood && typeof next.todayMood === 'object' ? next.todayMood : { start: null, end: null };
            next.todayIntent = { ...createEmptyTodayIntent(), ...(next.todayIntent || {}) };
            next.todayIntent.lightTasks = normalizeArray(next.todayIntent.lightTasks, ['', '', '']).slice(0, 3);
            return next;
        }
        function sanitizeDiscData(data) {
            const next = { ...discState, ...(data || {}) };
            next.tasks = normalizeArray(next.tasks, []).map(task => normalizeDiscTask(task)).filter(task => task.name);
            next.logs = next.logs && typeof next.logs === 'object' ? next.logs : {};
            next.notes = next.notes && typeof next.notes === 'object' ? next.notes : {};
            return next;
        }
        function importData(e) {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = ev => { 
                try { 
                    const data = JSON.parse(ev.target.result); 
                    if(data.bingo) { bingoState = sanitizeBingoData(data.bingo); saveBingo(); }
                    else { bingoState = sanitizeBingoData(data); saveBingo(); }
                    if(data.discipline) { discState = sanitizeDiscData(data.discipline); saveDisc(); }
                    window.location.reload(); 
                } catch (err) { showToast("解析失败"); } 
            };
            r.readAsText(file); e.target.value = '';
        }

        // ==================== BINGO 系统 ====================
        const BINGO_KEY = 'dailyBingoData_pwa';
        const DEFAULT_BINGO_TASKS = ["写今日意图", "选择今日主线", "推进主线任务", "完成轻任务 1", "完成轻任务 2", "完成轻任务 3", "记录完成原因", "记录未完成原因", "记录情绪变化", "早睡", "阅读", "看盘复盘", "整理房间", "冥想", "喝水", "拉伸", "断舍离", "看纪录片"];
        const DEFAULT_BINGO_TASK_LIBRARY = DEFAULT_BINGO_TASKS.map((name, index) => normalizeTaskRecord({ id: `b${index + 1}`, name, tags: index < 9 ? ['意图'] : ['生活'], frequency: 'daily', difficulty: index < 9 ? 'easy' : 'medium', estimate: index < 9 ? 3 : 10, minVersion: index < 9 ? '写一句即可' : '做 2 分钟最低版本' }));
        const MOODS = [{ val: null, icon: '<i class="fas fa-minus-circle"></i>', color: 'text-gray-300', dot: '' }, { val: 'good', icon: '<i class="fas fa-smile"></i>', color: 'text-green-500', dot: 'bg-green-500' }, { val: 'normal', icon: '<i class="fas fa-meh"></i>', color: 'text-yellow-500', dot: 'bg-yellow-500' }, { val: 'bad', icon: '<i class="fas fa-frown"></i>', color: 'text-red-500', dot: 'bg-red-500' }];
        function createEmptyTodayIntent() {
            return { mainTask: '', lightTasks: ['', '', ''], trigger: '', obstacle: '', doneReason: '', undoneReason: '', moodChange: '' };
        }
        let bingoState = { gridSize: 4, taskLibrary: [...DEFAULT_BINGO_TASK_LIBRARY], currentTasks: [], currentStates: [], hasBingo: false, bingoLines: [], lastCompletedIndex: null, lastDate: '', todayMood: { start: null, end: null }, todayIntent: createEmptyTodayIntent(), history: {} };
        let tempGridSize = 4;

        function initBingo() {
            const saved = localStorage.getItem(BINGO_KEY); if (saved) bingoState = { ...bingoState, ...JSON.parse(saved) };
            if (!bingoState.todayMood) bingoState.todayMood = { start: null, end: null }; if (!bingoState.history) bingoState.history = {};
            bingoState.gridSize = [3, 4, 5, 6].includes(Number(bingoState.gridSize)) ? Number(bingoState.gridSize) : 4;
            bingoState.taskLibrary = normalizeArray(bingoState.taskLibrary, []).map(task => normalizeTaskRecord(task)).filter(task => task.name);
            bingoState.currentTasks = normalizeArray(bingoState.currentTasks, []).map(task => getTaskName(task));
            bingoState.currentStates = normalizeArray(bingoState.currentStates, []).map(Boolean);
            bingoState.todayIntent = { ...createEmptyTodayIntent(), ...(bingoState.todayIntent || {}) };
            if (!Array.isArray(bingoState.todayIntent.lightTasks)) bingoState.todayIntent.lightTasks = ['', '', ''];
            bingoState.todayIntent.lightTasks = bingoState.todayIntent.lightTasks.slice(0, 3);
            if (!Array.isArray(bingoState.bingoLines)) bingoState.bingoLines = [];
            bingoState.lastCompletedIndex = null;
            let migratedTaskLibrary = false;
            DEFAULT_BINGO_TASK_LIBRARY.forEach(task => {
                if (!bingoState.taskLibrary.some(item => item.name === task.name)) {
                    bingoState.taskLibrary.push({ ...task, tags: [...task.tags] });
                    migratedTaskLibrary = true;
                }
            });
            document.getElementById('bingoDateDisplay').innerText = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\//g, '·');
            document.getElementById('gridSizeBadge').innerText = `${bingoState.gridSize}x${bingoState.gridSize}`;
            const expectedTotal = bingoState.gridSize ** 2;
            if (bingoState.lastDate !== getTodayDateStr() || bingoState.currentTasks.length !== expectedTotal || bingoState.currentStates.length !== expectedTotal) generateBingoGrid();
            else { if (migratedTaskLibrary) saveBingo(); renderBingoGrid(); updateBingoProgress(); updateMoodUI(); updateTodayIntentUI(); }
        }
        function saveBingo() { localStorage.setItem(BINGO_KEY, JSON.stringify(bingoState)); }
        function buildBingoTaskPool(total) {
            const uniqueTasks = [...new Set(bingoState.taskLibrary.map(task => getTaskName(task)).filter(Boolean))];
            const pool = [...uniqueTasks].sort(() => Math.random() - 0.5);
            const missing = Math.max(0, total - pool.length);
            for (let i = 1; i <= missing; i++) pool.push(`自选补位 ${i}`);
            if (missing > 0) showToast(`任务库不足，已补 ${missing} 个自选格`);
            return pool;
        }
        function generateBingoGrid() {
            let total = bingoState.gridSize ** 2; let pool = buildBingoTaskPool(total);
            bingoState.currentTasks = pool.slice(0, total); bingoState.currentStates = new Array(total).fill(false);
            bingoState.hasBingo = false; bingoState.bingoLines = []; bingoState.lastCompletedIndex = null; bingoState.lastDate = getTodayDateStr(); bingoState.todayMood = { start: null, end: null }; bingoState.todayIntent = createEmptyTodayIntent();
            document.getElementById('gridSizeBadge').innerText = `${bingoState.gridSize}x${bingoState.gridSize}`;
            saveBingo(); renderBingoGrid(); updateBingoProgress(); updateMoodUI(); updateTodayIntentUI();
        }
        function renderBingoGrid() {
            const n = bingoState.gridSize; const container = document.getElementById('gridContainer');
            container.style.gridTemplateColumns = `repeat(${n}, 1fr)`; container.dataset.size = String(n); container.innerHTML = '';
            const highlighted = new Set((bingoState.bingoLines || []).flat());
            bingoState.currentTasks.forEach((task, i) => {
                const item = document.createElement('div');
                const isPlaceholder = /^自选补位\s+\d+$/.test(task);
                item.className = `grid-item ${isPlaceholder ? 'placeholder-task' : ''} ${bingoState.currentStates[i] ? 'active' : ''} ${highlighted.has(i) ? 'bingo-line' : ''} ${i === bingoState.lastCompletedIndex ? 'just-completed' : ''}`;
                item.dataset.haptic = 'off';
                item.dataset.index = String(i);
                item.dataset.size = String(n);
                item.title = task;
                item.innerText = task;
                item.onclick = (event) => { playPressAnimation(item, event); toggleBingoCell(i); };
                container.appendChild(item);
            });
            if (bingoState.lastCompletedIndex !== null) {
                const animatedIndex = bingoState.lastCompletedIndex;
                setTimeout(() => {
                    if (bingoState.lastCompletedIndex !== animatedIndex) return;
                    bingoState.lastCompletedIndex = null;
                    const animatedCell = container.querySelector(`[data-index="${animatedIndex}"]`);
                    if (animatedCell) animatedCell.classList.remove('just-completed');
                }, 560);
            }
        }
        function getSelectableBingoTasks(source = 'library') {
            const base = source === 'board' ? bingoState.currentTasks : bingoState.taskLibrary;
            return [...new Set(normalizeArray(base, [])
                .map(task => getTaskName(task))
                .filter(task => task && !/^自选补位\s+\d+$/.test(task)))];
        }
        function renderBingoTaskOptions() {
            const list = document.getElementById('bingoTaskOptions');
            if (!list) return;
            list.innerHTML = '';
            const options = [...new Set([...getSelectableBingoTasks('board'), ...getSelectableBingoTasks('library')])];
            options.forEach(task => {
                const option = document.createElement('option');
                option.value = task;
                list.appendChild(option);
            });
        }
        function getBingoLines() {
            const n = bingoState.gridSize; let lines = [];
            for (let r=0; r<n; r++) lines.push(Array.from({length:n}, (_,i)=>r*n+i));
            for (let c=0; c<n; c++) lines.push(Array.from({length:n}, (_,i)=>i*n+c));
            lines.push(Array.from({length:n}, (_,i)=>i*n+i), Array.from({length:n}, (_,i)=>i*n+(n-1-i)));
            return lines;
        }
        function getLineCounts() {
            return getBingoLines().map(line => line.filter(i => bingoState.currentStates[i]).length);
        }
        function toggleBingoCell(index) {
            const wasDone = bingoState.currentStates[index];
            const previousCounts = getLineCounts();
            bingoState.currentStates[index] = !wasDone;
            bingoState.lastCompletedIndex = bingoState.currentStates[index] ? index : null;
            HAPTIC.play(bingoState.currentStates[index] ? 24 : HAPTIC.tap);
            checkBingoWin(previousCounts, bingoState.currentStates[index]);
            renderBingoGrid();
        }
        function checkBingoWin(previousCounts = [], justCompleted = false) {
            const n = bingoState.gridSize, s = bingoState.currentStates;
            const lines = getBingoLines();
            const winningLines = lines.filter(line => line.every(i => s[i]));
            const isWin = winningLines.length > 0;
            bingoState.bingoLines = winningLines;
            if (justCompleted) {
                const nextCounts = lines.map(line => line.filter(i => s[i]).length);
                const nearBingo = !isWin && nextCounts.some((count, i) => count === n - 1 && (previousCounts[i] || 0) < n - 1);
                const formedTwo = !isWin && nextCounts.some((count, i) => count >= Math.min(2, n - 1) && (previousCounts[i] || 0) < Math.min(2, n - 1));
                if (nearBingo || formedTwo) {
                    HAPTIC.play(HAPTIC.streak);
                    showToast(nearBingo ? "差一步就 Bingo" : "两连！节奏起来了");
                }
            }
            if (isWin && !bingoState.hasBingo) { bingoState.hasBingo = true; triggerConfetti(); showToast("BINGO! 整条线已点亮"); }
            if (!isWin) { bingoState.hasBingo = false; bingoState.bingoLines = []; }
            updateBingoHistory(); updateBingoProgress();
        }
        function updateBingoHistory() {
            const n = bingoState.gridSize; const completedCount = bingoState.currentStates.filter(Boolean).length;
            const percent = Math.floor((completedCount / (n * n)) * 100); const todayStr = getTodayDateStr();
            bingoState.history[todayStr] = {
                percent: bingoState.hasBingo ? 100 : percent,
                isBingo: bingoState.hasBingo,
                moodStart: bingoState.todayMood.start,
                moodEnd: bingoState.todayMood.end,
                gridSize: bingoState.gridSize,
                tasks: [...bingoState.currentTasks],
                states: [...bingoState.currentStates],
                intent: { ...bingoState.todayIntent, lightTasks: [...(bingoState.todayIntent.lightTasks || [])] }
            };
            saveBingo();
        }
        function updateBingoProgress() {
            const p = Math.floor((bingoState.currentStates.filter(Boolean).length / (bingoState.gridSize**2)) * 100);
            const ring = document.getElementById('progressRing'), text = document.getElementById('progressText'), stat = document.getElementById('progressStatusText');
            ring.style.strokeDashoffset = 263.89 - ((bingoState.hasBingo ? 100 : p) / 100) * 263.89; ring.setAttribute('stroke', bingoState.hasBingo ? cssVar('--gold') : cssVar('--primary'));
            text.innerText = `${bingoState.hasBingo ? 100 : p}%`; text.style.color = bingoState.hasBingo ? cssVar('--gold-text') : cssVar('--text-main');
            stat.innerText = bingoState.hasBingo ? "BINGO! 任务达成" : "打卡进行中"; stat.className = bingoState.hasBingo ? "text-base font-bold text-yellow-600" : "text-base font-bold text-gray-900";
        }
        function shuffleGrid() { HAPTIC.play(HAPTIC.reset); generateBingoGrid(); showToast("已重新生成"); }
        function resetBingoGrid() { HAPTIC.play(HAPTIC.reset); bingoState.currentStates.fill(false); bingoState.hasBingo = false; bingoState.bingoLines = []; bingoState.lastCompletedIndex = null; checkBingoWin(); renderBingoGrid(); showToast("状态已清空"); }
        function cycleMood(type) { HAPTIC.play(HAPTIC.tap); let idx = MOODS.findIndex(m => m.val === bingoState.todayMood[type]); bingoState.todayMood[type] = MOODS[(idx + 1) % MOODS.length].val; updateBingoHistory(); updateMoodUI(); }
        function updateMoodUI() { ['start', 'end'].forEach(type => { const mood = MOODS.find(m => m.val === bingoState.todayMood[type]) || MOODS[0]; const el = document.getElementById(type === 'start' ? 'moodStartIcon' : 'moodEndIcon'); el.innerHTML = mood.icon; el.className = `text-lg ${mood.color}`; }); }
        function updateTodayIntent(field, value) {
            if (!bingoState.todayIntent) bingoState.todayIntent = createEmptyTodayIntent();
            if (field.startsWith('lightTask')) {
                const index = Number(field.replace('lightTask', ''));
                bingoState.todayIntent.lightTasks[index] = value;
            } else {
                bingoState.todayIntent[field] = value;
            }
            updateBingoHistory();
        }
        function updateTodayIntentUI() {
            const intent = bingoState.todayIntent || createEmptyTodayIntent();
            renderBingoTaskOptions();
            document.getElementById('intentMainTask').value = intent.mainTask || '';
            for (let i = 0; i < 3; i++) document.getElementById(`intentLightTask${i}`).value = (intent.lightTasks || [])[i] || '';
            document.getElementById('intentTrigger').value = intent.trigger || '';
            document.getElementById('intentObstacle').value = intent.obstacle || '';
            document.getElementById('intentDoneReason').value = intent.doneReason || '';
            document.getElementById('intentUndoneReason').value = intent.undoneReason || '';
            document.getElementById('intentMoodChange').value = intent.moodChange || '';
        }
        function quickFillIntent(field, value) {
            const current = (bingoState.todayIntent && bingoState.todayIntent[field]) || '';
            updateTodayIntent(field, current ? `${current}；${value}` : value);
            updateTodayIntentUI();
            HAPTIC.play(HAPTIC.success);
        }
        function fillIntentFromTaskPool(source = 'board') {
            const boardTasks = getSelectableBingoTasks(source);
            const fallbackTasks = getSelectableBingoTasks('library');
            const pool = (boardTasks.length >= 4 ? boardTasks : [...new Set([...boardTasks, ...fallbackTasks])])
                .sort(() => Math.random() - 0.5);
            if (pool.length === 0) return showToast('任务池还没有可选任务');
            if (!bingoState.todayIntent) bingoState.todayIntent = createEmptyTodayIntent();
            bingoState.todayIntent.mainTask = pool[0] || bingoState.todayIntent.mainTask || '';
            bingoState.todayIntent.lightTasks = [
                pool[1] || '',
                pool[2] || '',
                pool[3] || ''
            ];
            updateBingoHistory();
            updateTodayIntentUI();
            HAPTIC.play(HAPTIC.success);
            showToast(source === 'board' ? '已从今日盘面生成意图' : '已从任务池随机生成意图');
        }
        function triggerConfetti() {
            HAPTIC.play(HAPTIC.bingo);
            const grid = document.getElementById('gridContainer');
            grid.classList.remove('bingo-glow');
            void grid.offsetWidth;
            grid.classList.add('bingo-glow');
            setTimeout(() => grid.classList.remove('bingo-glow'), 1300);
            if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        function openBingoHistory() { HAPTIC.play(HAPTIC.tap); renderBingoCalendar(); document.getElementById('bingoHistoryModal').classList.add('show'); }
        function closeBingoHistory() { document.getElementById('bingoHistoryModal').classList.remove('show'); }
        function renderBingoCalendar() {
            const now = new Date(); 
            const year = now.getFullYear(), month = now.getMonth(); 
            
            document.getElementById('calMonthDisplay').innerText = `${year}年 ${month + 1}月 打卡记录`;
            const firstDayOfMonth = new Date(year, month, 1).getDay(); 
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const calContainer = document.getElementById('calendarContainer'); 
            calContainer.innerHTML = '';
            
            // 【核心修复：数据清洗】
            // 提取库中所有记录的纯净日期（消除不可见字符和补零差异）
            const normalizedHistory = {};
            for (const key in bingoState.history) {
                // 用正则提取出连续的年份、月份、日期数字
                const match = key.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
                if (match) {
                    const y = parseInt(match[1]);
                    const m = parseInt(match[2]);
                    const d = parseInt(match[3]);
                    // 统一转成 "2026-5-15" 的标准格式作为查找字典
                    normalizedHistory[`${y}-${m}-${d}`] = bingoState.history[key];
                }
            }

            for (let i = 0; i < firstDayOfMonth; i++) { 
                const emptyCell = document.createElement('div'); emptyCell.className = 'cal-cell cal-empty'; calContainer.appendChild(emptyCell); 
            }
            
            let monthBingoCount = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                // 生成当前格子的标准查找格式
                const currentCellKey = `${year}-${month + 1}-${i}`;
                
                // 去清洗后的字典里找数据，百发百中
                const record = normalizedHistory[currentCellKey];
                
                let cellClass = 'cal-cell cal-no-data';
                if (record) {
                    if (record.isBingo) { cellClass = 'cal-cell cal-bingo'; monthBingoCount++; }
                    else if (record.percent > 0 || record.moodStart || record.moodEnd) { cellClass = 'cal-cell cal-partial'; }
                }

                const cell = document.createElement('div'); 
                cell.className = cellClass;
                cell.dataset.date = currentCellKey;
                const dayLabel = document.createElement('span');
                dayLabel.textContent = String(i);
                cell.appendChild(dayLabel);
                if (record && record.isBingo) {
                    const star = document.createElement('i');
                    star.className = 'fas fa-star text-[8px] mt-0.5';
                    cell.appendChild(star);
                }
                if (record) {
                    const getDotColor = (val) => (MOODS.find(m => m.val === val) || {}).dot || '';
                    if (record.moodStart) {
                        const dot = document.createElement('div');
                        dot.className = `mood-dot-start ${getDotColor(record.moodStart)}`;
                        cell.appendChild(dot);
                    }
                    if (record.moodEnd) {
                        const dot = document.createElement('div');
                        dot.className = `mood-dot-end ${getDotColor(record.moodEnd)}`;
                        cell.appendChild(dot);
                    }
                }
                if (year === now.getFullYear() && month === now.getMonth() && i === now.getDate()) {
                    const todayDot = document.createElement('span');
                    todayDot.className = 'cal-today-indicator';
                    cell.appendChild(todayDot);
                }
                cell.onclick = () => showBingoDayDetail(currentCellKey, record, cell);
                calContainer.appendChild(cell);
            }
            
            document.getElementById('statTotalBingo').innerText = Object.values(bingoState.history).filter(r => r.isBingo).length;
            document.getElementById('statMonthBingo').innerText = monthBingoCount;
            showBingoDayDetail(`${year}-${month + 1}-${now.getDate()}`, normalizedHistory[`${year}-${month + 1}-${now.getDate()}`]);
        }
        function showBingoDayDetail(dateKey, record, cellEl = null) {
            document.querySelectorAll('#calendarContainer .selected-day').forEach(cell => cell.classList.remove('selected-day'));
            if (cellEl) cellEl.classList.add('selected-day');
            const detail = document.getElementById('bingoDayDetail');
            if (!record) {
                detail.innerHTML = `<strong>${escapeHTML(dateKey)}</strong><br>暂无 Bingo 记录。`;
                return;
            }
            const intent = { ...createEmptyTodayIntent(), ...(record.intent || {}) };
            const lightTasks = normalizeArray(intent.lightTasks, []).filter(Boolean).map(escapeHTML).join(' / ') || '未填写';
            const taskSummary = normalizeArray(record.tasks, [])
                .map((task, index) => normalizeArray(record.states, [])[index] ? `✓ ${task}` : null)
                .filter(Boolean)
                .slice(0, 6)
                .map(escapeHTML)
                .join('，') || '暂无已完成任务';
            const moodStart = (MOODS.find(m => m.val === record.moodStart) || {}).val ? record.moodStart : '未记录';
            const moodEnd = (MOODS.find(m => m.val === record.moodEnd) || {}).val ? record.moodEnd : '未记录';
            detail.innerHTML = `
                <strong>${escapeHTML(dateKey)}</strong> · ${record.isBingo ? 'Bingo 达成' : `${Number(record.percent || 0)}% 完成`}<br>
                主线：${escapeHTML(intent.mainTask || '未填写')}<br>
                轻任务：${lightTasks}<br>
                已完成：${taskSummary}<br>
                触发：${escapeHTML(intent.trigger || '未填写')}<br>
                障碍：${escapeHTML(intent.obstacle || '未填写')}<br>
                复盘：${escapeHTML(intent.doneReason || '未填写')} / ${escapeHTML(intent.undoneReason || '未填写')}<br>
                情绪：${escapeHTML(moodStart)} → ${escapeHTML(moodEnd)}，${escapeHTML(intent.moodChange || '未填写')}
            `;
        }
        function openBingoSettings() { HAPTIC.play(HAPTIC.tap); tempGridSize = bingoState.gridSize; renderBingoSettingsPanel(); document.getElementById('bingoSettingsModal').classList.add('show'); }
        function closeBingoSettings() { document.getElementById('bingoSettingsModal').classList.remove('show'); }
        function renderBingoSettingsPanel() {
            renderTemplateButtons('bingoTemplateList', 'bingo');
            const sizeSelector = document.getElementById('gridSizeSelector'); sizeSelector.innerHTML = '';
            [3, 4, 5, 6].forEach(size => {
                const btn = document.createElement('button'); btn.className = `flex-1 py-2 rounded-lg text-sm font-semibold transition btn-press ${size === tempGridSize ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
                const missing = Math.max(0, size * size - bingoState.taskLibrary.length);
                btn.innerText = `${size}x${size}`;
                btn.title = missing > 0 ? `任务库不足时会补 ${missing} 个自选格` : '任务库容量充足';
                btn.onclick = () => { tempGridSize = size; HAPTIC.play(HAPTIC.tap); renderBingoSettingsPanel(); }; sizeSelector.appendChild(btn);
            });
            const missing = Math.max(0, tempGridSize * tempGridSize - bingoState.taskLibrary.length);
            document.getElementById('taskCount').innerText = missing > 0 ? `共 ${bingoState.taskLibrary.length} 项，需补 ${missing} 格` : `共 ${bingoState.taskLibrary.length} 项`;
            const list = document.getElementById('taskLibraryList'); list.innerHTML = '';
            bingoState.taskLibrary.forEach((task, index) => {
                const normalized = normalizeTaskRecord(task);
                bingoState.taskLibrary[index] = normalized;
                const div = document.createElement('div');
                div.className = 'task-system-card';
                const header = document.createElement('div');
                header.className = 'flex items-center gap-2 mb-2';
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.value = normalized.name;
                nameInput.placeholder = '任务名称';
                nameInput.className = 'font-bold text-gray-800';
                nameInput.oninput = () => updateBingoTask(index, 'name', nameInput.value);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'text-gray-400 hover:text-red-500 p-2 flex-shrink-0';
                removeBtn.setAttribute('aria-label', `删除 ${normalized.name}`);
                removeBtn.innerHTML = '<i class="fas fa-trash-alt text-xs"></i>';
                removeBtn.onclick = () => removeBingoTask(index);
                header.append(nameInput, removeBtn);

                const meta = document.createElement('div');
                meta.className = 'task-meta-grid';
                const frequencySelect = createMetaSelect(TASK_FREQUENCIES, normalized.frequency, value => updateBingoTask(index, 'frequency', value));
                const difficultySelect = createMetaSelect(TASK_DIFFICULTIES, normalized.difficulty, value => updateBingoTask(index, 'difficulty', value));
                const estimateInput = createMetaInput('number', normalized.estimate, value => updateBingoTask(index, 'estimate', value), '预计分钟');
                estimateInput.min = '1';
                estimateInput.max = '480';
                const tagsInput = createMetaInput('text', normalized.tags.join('，'), value => updateBingoTask(index, 'tags', value), '标签，用逗号分隔');
                tagsInput.classList.add('full');
                const minInput = createMetaInput('text', normalized.minVersion, value => updateBingoTask(index, 'minVersion', value), '最低可接受版本');
                minInput.classList.add('full');
                meta.append(wrapMetaField('频率', frequencySelect), wrapMetaField('难度', difficultySelect), wrapMetaField('预计时间', estimateInput), wrapMetaField('标签', tagsInput), wrapMetaField('最低版本', minInput));
                div.append(header, meta);
                list.appendChild(div);
            });
        }
        function createMetaSelect(options, value, onChange) {
            const select = document.createElement('select');
            options.forEach(option => {
                const item = document.createElement('option');
                item.value = option.value;
                item.textContent = option.label;
                select.appendChild(item);
            });
            select.value = value;
            select.onchange = () => onChange(select.value);
            return select;
        }
        function createMetaInput(type, value, onInput, placeholder = '') {
            const input = document.createElement('input');
            input.type = type;
            input.value = value || '';
            input.placeholder = placeholder;
            input.oninput = () => onInput(input.value);
            return input;
        }
        function wrapMetaField(labelText, control) {
            const wrap = document.createElement('label');
            wrap.className = control.classList.contains('full') ? 'full' : '';
            const label = document.createElement('span');
            label.className = 'block text-[9px] text-gray-400 font-bold mb-1';
            label.textContent = labelText;
            wrap.append(label, control);
            return wrap;
        }
        function updateBingoTask(index, field, value) {
            const task = normalizeTaskRecord(bingoState.taskLibrary[index]);
            if (field === 'tags') task.tags = normalizeTags(value);
            else if (field === 'frequency') task.frequency = normalizeFrequency(value);
            else if (field === 'difficulty') task.difficulty = normalizeDifficulty(value);
            else if (field === 'estimate') task.estimate = normalizeEstimate(value);
            else task[field] = String(value || '').trim();
            bingoState.taskLibrary[index] = normalizeTaskRecord(task);
            renderBingoTaskOptions();
            saveBingo();
        }
        function addBingoTask() { const input = document.getElementById('newTaskInput'); const val = input.value.trim(); if (!val) return; if (bingoState.taskLibrary.some(task => getTaskName(task) === val)) return showToast("任务已存在"); bingoState.taskLibrary.unshift(normalizeTaskRecord({ name: val, tags: [], frequency: 'daily', difficulty: 'medium', estimate: 10, minVersion: '做 2 分钟最低版本' })); input.value = ''; HAPTIC.play(HAPTIC.success); renderBingoSettingsPanel(); renderBingoTaskOptions(); saveBingo(); }
        function addBingoTaskTemplate(key) {
            const template = TASK_TEMPLATES.bingo.find(item => item.key === key);
            if (!template) return;
            const task = normalizeTaskRecord(template.task);
            if (bingoState.taskLibrary.some(item => getTaskName(item) === task.name)) return showToast("模板任务已存在");
            bingoState.taskLibrary.unshift(task);
            HAPTIC.play(HAPTIC.success);
            renderBingoSettingsPanel();
            renderBingoTaskOptions();
            saveBingo();
        }
        function removeBingoTask(i) { bingoState.taskLibrary.splice(i, 1); HAPTIC.play(HAPTIC.delete); renderBingoSettingsPanel(); renderBingoTaskOptions(); saveBingo(); }
        function applyBingoSettings() { HAPTIC.play(HAPTIC.success); bingoState.gridSize = tempGridSize; generateBingoGrid(); closeBingoSettings(); showToast("设置已应用"); }


        // ==================== 纪律系统 (DISCIPLINE) 升级版(支持次数) ====================
        const DISC_KEY = 'discipline_system_data';
        
        const DEFAULT_DISC_TASKS = [
            normalizeDiscTask({ id: 't1', name: "进食比例", if: "开始吃正餐", then: "按 1/2蔬菜、1/4蛋白质、1/4碳水装盘", tags: ['饮食'], frequency: 'daily', difficulty: 'medium', estimate: 5, minVersion: '先补一份蔬菜或蛋白质', schedule: [0,1,2,3,4,5,6], target: 2 }),
            normalizeDiscTask({ id: 't2', name: "液体规则", if: "口渴", then: "只喝水、茶或黑咖啡", tags: ['饮食'], frequency: 'daily', difficulty: 'easy', estimate: 1, minVersion: '先喝一杯水', schedule: [0,1,2,3,4,5,6], target: 1 }),
            normalizeDiscTask({ id: 't3', name: "有氧心率", if: "做有氧运动", then: "保持 Zone 2 心率持续 >40 分钟", tags: ['运动'], frequency: 'custom', difficulty: 'hard', estimate: 40, minVersion: '走路 10 分钟', schedule: [1,3,5], target: 1 }) 
        ];

        let discState = { tasks: DEFAULT_DISC_TASKS.map(task => ({ ...task, tags: [...task.tags], schedule: [...task.schedule] })), logs: {}, notes: {} };
        let justCompletedDiscTaskId = null;

        function isTaskActiveOnDate(task, dateObj) {
            if (!task.schedule) return true; 
            const dayOfWeek = dateObj.getDay(); 
            return task.schedule.includes(dayOfWeek);
        }

        function initDiscipline() {
            const saved = localStorage.getItem(DISC_KEY);
            if (saved) discState = JSON.parse(saved);
            discState.tasks = normalizeArray(discState.tasks, []).map(task => normalizeDiscTask(task)).filter(task => task.name);
            discState.logs = discState.logs && typeof discState.logs === 'object' ? discState.logs : {};
            discState.notes = discState.notes && typeof discState.notes === 'object' ? discState.notes : {};
            // 兼容迁移：旧数据补充 target 与 schedule
            discState.tasks.forEach(t => { 
                if(!t.schedule) t.schedule = [0,1,2,3,4,5,6]; 
                if(!t.target) t.target = 1;
            });

            document.getElementById('discDateDisplay').innerText = new Date().toDateString();
            document.getElementById('dailyNote').value = discState.notes[getTodayDateStr()] || '';
            
            renderDiscDashboard(); 
            renderHeatmap();
        }
        
        function saveDisc() { 
            localStorage.setItem(DISC_KEY, JSON.stringify(discState)); 
        }
        function renderTaskMetaPills(task) {
            const meta = normalizeTaskRecord(task);
            const tags = meta.tags.map(tag => `<span class="task-meta-pill">#${escapeHTML(tag)}</span>`).join('');
            return `
                <div class="task-meta-pills">
                    <span class="task-meta-pill"><i class="fas fa-repeat"></i>${escapeHTML(labelFor(TASK_FREQUENCIES, meta.frequency))}</span>
                    <span class="task-meta-pill"><i class="fas fa-signal"></i>${escapeHTML(labelFor(TASK_DIFFICULTIES, meta.difficulty))}</span>
                    <span class="task-meta-pill"><i class="fas fa-clock"></i>${Number(meta.estimate || 0)}m</span>
                    ${tags}
                </div>
                ${meta.minVersion ? `<div class="minimum-version">最低版本：${escapeHTML(meta.minVersion)}</div>` : ''}
            `;
        }

        function renderDiscDashboard() {
            const container = document.getElementById('dashboardList');
            const todayStr = getTodayDateStr(); 
            const todayObj = new Date();
            const todayLogs = discState.logs[todayStr] || {};
            
            const activeTasks = discState.tasks.filter(t => isTaskActiveOnDate(t, todayObj));
            document.getElementById('discTodayLabel').innerText = `今日必做程序 (${activeTasks.length})`;

            if (activeTasks.length === 0) {
                container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs font-mono">今日为系统调整日<br>无需执行任何核心纪律</div>`;
                return;
            }

            container.innerHTML = activeTasks.map(task => {
                const target = task.target || 1;
                let current = todayLogs[task.id];
                
                // 兼容历史的布尔值记录
                if (typeof current === 'boolean') current = current ? target : 0;
                if (typeof current !== 'number') current = 0;

                const isCompleted = current >= target;

                // 动态渲染状态图标
                let checkUI = '';
                if (target === 1) {
                    checkUI = isCompleted ? '<i class="fas fa-check text-xs"></i>' : '';
                } else {
                    checkUI = isCompleted ? '<i class="fas fa-check text-xs"></i>' : `<span class="text-[10px] font-bold text-slate-400">${current}/${target}</span>`;
                }

                return `
                <div class="task-card bg-white p-4 rounded-xl flex items-center justify-between" onclick="toggleDiscTask('${escapeAttr(task.id)}')">
                    <div class="flex-1 pr-3">
                        <h4 class="text-xs font-black text-slate-800 mb-1 tracking-wide">${escapeHTML(task.name)}</h4>
                        <div class="text-[10px] leading-snug">
                            <span class="text-slate-400 font-bold">IF:</span> <span class="text-slate-500">${escapeHTML(task.if)}</span><br>
                            <span class="text-blue-500 font-bold">THEN:</span> <span class="text-slate-700 font-medium">${escapeHTML(task.then)}</span>
                        </div>
                        ${renderTaskMetaPills(task)}
                    </div>
                    <div class="checkbox-custom ${isCompleted ? 'checked' : ''} ${justCompletedDiscTaskId === task.id ? 'just-checked' : ''}">${checkUI}</div>
                </div>
                `;
            }).join('');
        }

        function toggleDiscTask(id) {
            const streakBefore = calculateCurrentStreak();
            const today = getTodayDateStr();
            if (!discState.logs[today]) discState.logs[today] = {};
            
            const task = discState.tasks.find(t => t.id === id);
            if (!task) return;
            const target = task.target || 1;
            
            let current = discState.logs[today][id];
            // 兼容旧布尔值
            if (typeof current === 'boolean') current = current ? target : 0;
            if (typeof current !== 'number') current = 0;
            
            // 点击循环逻辑： 0 -> 1 -> ... -> target -> 0
            current = (current + 1) % (target + 1);
            
            discState.logs[today][id] = current;
            justCompletedDiscTaskId = current === target ? id : null;
            HAPTIC.play(current === target ? HAPTIC.complete : HAPTIC.tap);
            
            saveDisc(); 
            renderDiscDashboard(); 
            justCompletedDiscTaskId = null;
            const streakAfter = renderHeatmap();
            if (streakAfter > streakBefore && current === target) HAPTIC.play(HAPTIC.streak);
        }

        function updateNote() { 
            discState.notes[getTodayDateStr()] = document.getElementById('dailyNote').value; 
            saveDisc(); 
        }

        function calculateCurrentStreak() {
            let streak = 0; let streakBroken = false;
            for (let i = 83; i >= 0; i--) {
                const d = new Date(); d.setDate(new Date().getDate() - i);
                const key = d.toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'}).replace(/\//g, '-');
                const log = discState.logs[key] || {};
                const requiredTasks = discState.tasks.filter(t => isTaskActiveOnDate(t, d));
                const totalRequired = requiredTasks.length;
                let completedCount = 0;
                requiredTasks.forEach(t => {
                    let val = log[t.id];
                    let tTarget = t.target || 1;
                    if (typeof val === 'boolean') val = val ? tTarget : 0;
                    if (val >= tTarget) completedCount++;
                });
                const ratio = totalRequired > 0 ? completedCount / totalRequired : 1;
                if (ratio === 1 && !streakBroken) streak++;
                else if (i > 0) { streak = 0; if (ratio < 1) streakBroken = true; }
            }
            return streak;
        }

        function renderHeatmap() {
            const grid = document.getElementById('heatmapGrid'); grid.innerHTML = '';
            let streak = 0; let streakBroken = false;
            
            for (let i = 83; i >= 0; i--) { 
                const d = new Date(); d.setDate(new Date().getDate() - i);
                const key = d.toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'}).replace(/\//g, '-');
                const log = discState.logs[key] || {};
                
                const requiredTasks = discState.tasks.filter(t => isTaskActiveOnDate(t, d));
                const totalRequired = requiredTasks.length;
                
                let completedCount = 0;
                requiredTasks.forEach(t => { 
                    let val = log[t.id];
                    let tTarget = t.target || 1;
                    if (typeof val === 'boolean') val = val ? tTarget : 0;
                    if (val >= tTarget) completedCount++; 
                });

                let ratio = 1; 
                if (totalRequired > 0) ratio = completedCount / totalRequired;
                
                let level = '';
                if (totalRequired === 0) level = 'level-4'; 
                else if (ratio > 0 && ratio <= 0.3) level = 'level-1';
                else if (ratio > 0.3 && ratio <= 0.6) level = 'level-2';
                else if (ratio > 0.6 && ratio < 1) level = 'level-3';
                else if (ratio === 1) level = 'level-4';

                if (ratio === 1 && !streakBroken) streak++;
                else if (i > 0) { streak = 0; if (ratio < 1) streakBroken = true; }

                const cell = document.createElement('div'); 
                cell.className = `heatmap-cell ${level}`;
                cell.dataset.date = key;
                cell.title = `${key}: ${completedCount}/${totalRequired} ${totalRequired === 0 ? '(休)' : ''}`;
                cell.onclick = () => showHeatmapDetail(key, requiredTasks, log, completedCount, totalRequired, cell);
                grid.appendChild(cell);
            }
            document.getElementById('streakCount').innerText = `${streak} Streaks`;
            grid.scrollLeft = grid.scrollWidth;
            const today = getTodayDateStr();
            const todayCell = grid.querySelector(`[data-date="${today}"]`);
            if (todayCell) {
                const todayLog = discState.logs[today] || {};
                const todayTasks = discState.tasks.filter(t => isTaskActiveOnDate(t, new Date()));
                let todayCompleted = 0;
                todayTasks.forEach(t => {
                    let val = todayLog[t.id];
                    const target = t.target || 1;
                    if (typeof val === 'boolean') val = val ? target : 0;
                    if ((Number(val) || 0) >= target) todayCompleted++;
                });
                showHeatmapDetail(today, todayTasks, todayLog, todayCompleted, todayTasks.length, todayCell);
            }
            return streak;
        }
        function showHeatmapDetail(key, requiredTasks, log, completedCount, totalRequired, cellEl) {
            document.querySelectorAll('#heatmapGrid .selected-day').forEach(cell => cell.classList.remove('selected-day'));
            if (cellEl) cellEl.classList.add('selected-day');
            const detail = document.getElementById('heatmapDetail');
            if (totalRequired === 0) {
                detail.innerHTML = `<strong>${escapeHTML(key)}</strong><br>系统调整日，无核心纪律。`;
                return;
            }
            const items = requiredTasks.map(task => {
                const target = task.target || 1;
                let val = log[task.id];
                if (typeof val === 'boolean') val = val ? target : 0;
                val = Number(val) || 0;
                return `${val >= target ? '已完成' : '未完成'} ${escapeHTML(task.name)} (${val}/${target})`;
            }).join('<br>');
            const note = discState.notes[key] ? `<br>备注：${escapeHTML(discState.notes[key])}` : '';
            detail.innerHTML = `<strong>${escapeHTML(key)}</strong> · ${completedCount}/${totalRequired}<br>${items}${note}`;
        }

        // --- 纪律设置 ---
        function openDiscSettings() { 
            HAPTIC.play(HAPTIC.tap);
            renderDiscSettings(); 
            document.getElementById('discSettingsModal').classList.add('show'); 
        }
        
        function closeDiscSettings() { 
            document.getElementById('discSettingsModal').classList.remove('show'); 
            renderDiscDashboard(); 
            renderHeatmap(); 
            showToast("系统纪律已更新");
        }
        
        function renderDiscSettings() {
            renderTemplateButtons('discTemplateList', 'discipline');
            const list = document.getElementById('settingsTaskList');
            const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

            list.innerHTML = discState.tasks.map((t, i) => {
                const task = normalizeDiscTask(t);
                discState.tasks[i] = task;
                const sched = task.schedule || [0,1,2,3,4,5,6];
                const target = task.target || 1;
                
                const safeName = escapeAttr(task.name || '');
                const safeIf = escapeAttr(task.if || '');
                const safeThen = escapeAttr(task.then || '');
                const safeTags = escapeAttr(task.tags.join('，'));
                const safeMinVersion = escapeAttr(task.minVersion || '');
                const frequencyOptions = TASK_FREQUENCIES.map(option => `<option value="${option.value}" ${option.value === task.frequency ? 'selected' : ''}>${option.label}</option>`).join('');
                const difficultyOptions = TASK_DIFFICULTIES.map(option => `<option value="${option.value}" ${option.value === task.difficulty ? 'selected' : ''}>${option.label}</option>`).join('');

                const dayButtons = dayNames.map((dName, dIdx) => `
                    <button onclick="toggleDiscSchedule(${i}, ${dIdx})" class="w-6 h-6 rounded-full text-[10px] font-bold transition flex items-center justify-center ${sched.includes(dIdx) ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}">${dName}</button>
                `).join('');

                return `
                <div class="task-system-card relative">
                    <input type="text" value="${safeName}" oninput="updateDiscTask(${i}, 'name', this.value)" class="w-[85%] font-black text-xs mb-2 text-slate-800" placeholder="程序名称...">
                    <div class="task-meta-grid">
                        <label class="full"><span class="block text-[9px] text-slate-400 font-bold mb-1">IF 触发条件</span><input type="text" value="${safeIf}" oninput="updateDiscTask(${i}, 'if', this.value)" placeholder="触发条件..."></label>
                        <label class="full"><span class="block text-[9px] text-blue-500 font-bold mb-1">THEN 客观动作</span><input type="text" value="${safeThen}" oninput="updateDiscTask(${i}, 'then', this.value)" placeholder="客观动作..."></label>
                        <label><span class="block text-[9px] text-slate-400 font-bold mb-1">频率</span><select onchange="updateDiscFrequency(${i}, this.value)">${frequencyOptions}</select></label>
                        <label><span class="block text-[9px] text-slate-400 font-bold mb-1">难度</span><select onchange="updateDiscTask(${i}, 'difficulty', this.value)">${difficultyOptions}</select></label>
                        <label><span class="block text-[9px] text-slate-400 font-bold mb-1">预计分钟</span><input type="number" min="1" max="480" value="${task.estimate}" oninput="updateDiscTask(${i}, 'estimate', this.value)"></label>
                        <label><span class="block text-[9px] text-slate-400 font-bold mb-1">目标次数</span><input type="number" min="1" max="20" value="${target}" oninput="updateDiscTask(${i}, 'target', parseInt(this.value) || 1)"></label>
                        <label class="full"><span class="block text-[9px] text-slate-400 font-bold mb-1">标签</span><input type="text" value="${safeTags}" oninput="updateDiscTask(${i}, 'tags', this.value)" placeholder="运动，饮食，睡眠"></label>
                        <label class="full"><span class="block text-[9px] text-slate-400 font-bold mb-1">最低可接受版本</span><input type="text" value="${safeMinVersion}" oninput="updateDiscTask(${i}, 'minVersion', this.value)" placeholder="状态差时也能完成的最小动作"></label>
                    </div>
                    
                    <div class="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Schedule</span>
                        <div class="flex space-x-1">${dayButtons}</div>
                    </div>

                    <button onclick="removeDiscTask(${i})" class="absolute top-3 right-3 text-slate-300 hover:text-red-400 transition"><i class="fas fa-trash text-sm"></i></button>
                </div>
                `;
            }).join('');
        }

        function toggleDiscSchedule(taskIdx, dayIdx) {
            HAPTIC.play(HAPTIC.tap);
            let sched = discState.tasks[taskIdx].schedule || [0,1,2,3,4,5,6];
            if (sched.includes(dayIdx)) {
                sched = sched.filter(d => d !== dayIdx);
            } else {
                sched.push(dayIdx);
            }
            discState.tasks[taskIdx].schedule = sched;
            discState.tasks[taskIdx].frequency = 'custom';
            saveDisc();
            renderDiscSettings(); 
        }

        function updateDiscTask(idx, field, val) {
            const task = normalizeDiscTask(discState.tasks[idx]);
            if (field === 'tags') task.tags = normalizeTags(val);
            else if (field === 'frequency') task.frequency = normalizeFrequency(val);
            else if (field === 'difficulty') task.difficulty = normalizeDifficulty(val);
            else if (field === 'estimate') task.estimate = normalizeEstimate(val);
            else if (field === 'target') task.target = Math.min(20, Math.max(1, Number(val) || 1));
            else task[field] = String(val || '').trim();
            discState.tasks[idx] = normalizeDiscTask(task);
            saveDisc(); 
        }
        function updateDiscFrequency(idx, frequency) {
            const task = normalizeDiscTask(discState.tasks[idx]);
            task.frequency = normalizeFrequency(frequency);
            if (task.frequency !== 'custom') task.schedule = scheduleFromFrequency(task.frequency);
            discState.tasks[idx] = normalizeDiscTask(task);
            saveDisc();
            renderDiscSettings();
        }
        
        function addNewTaskTemplate(key = '') {
            const template = TASK_TEMPLATES.discipline.find(item => item.key === key);
            const task = template ? normalizeDiscTask(template.task) : normalizeDiscTask({ id: createId('t'), name: "新纪律程序", if: "", then: "", tags: [], frequency: 'daily', difficulty: 'medium', estimate: 10, minVersion: '做 2 分钟最低版本', schedule: [0,1,2,3,4,5,6], target: 1 });
            if (template && discState.tasks.some(item => item.name === task.name)) return showToast("模板程序已存在");
            discState.tasks.push(task); 
            HAPTIC.play(HAPTIC.success);
            saveDisc(); 
            renderDiscSettings(); 
            const list = document.getElementById('settingsTaskList');
            setTimeout(() => { list.parentElement.scrollTop = list.parentElement.scrollHeight; }, 50);
        }
        
        function removeDiscTask(idx) { 
            discState.tasks.splice(idx, 1); 
            HAPTIC.play(HAPTIC.delete);
            saveDisc(); 
            renderDiscSettings(); 
        }

        // ==================== 启动 ====================
        window.addEventListener('DOMContentLoaded', () => {
            applyThemeMode();
            registerServiceWorker();
            setupButtonHaptics();
            initBingo();
            initDiscipline();
            document.getElementById('newTaskInput').addEventListener('keypress', e => e.key === 'Enter' && addBingoTask());
        });
