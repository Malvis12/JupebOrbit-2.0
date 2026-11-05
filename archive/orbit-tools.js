/**
 * JUPEB Orbit - Audio Synthesis & Interactive Tools
 * Zero-dependency Web Audio synthesizer, Floating Scientific Calculator, and Keyboard Shortcuts.
 */

// 1. WEB AUDIO SYNTHESIZER
class OrbitAudio {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('orbit_sound_enabled') !== 'false';
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playCorrect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Pleasant major chord chime (C5 - E5 - G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.12, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.36);
        });
    }

    playIncorrect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Soft low tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('orbit_sound_enabled', this.enabled);
        return this.enabled;
    }
}

window.orbitAudio = new OrbitAudio();

// 2. FLOATING SCIENTIFIC CALCULATOR
function injectCalculator() {
    if (document.getElementById('orbit-calculator')) return;

    const calcHTML = `
    <div id="orbit-calculator" class="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 z-[80] hidden select-none transition-all duration-300">
        <div class="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/90 rounded-[2rem] shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 cursor-move" id="calc-header">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Orbit Calculator</span>
                </div>
                <button onclick="toggleCalculator()" class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-xs transition-all">✕</button>
            </div>

            <!-- Screen -->
            <div class="my-4 p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800 rounded-2xl text-right">
                <div id="calc-history" class="text-[10px] text-slate-400 dark:text-slate-500 h-4 font-mono truncate"></div>
                <div id="calc-display" class="text-2xl font-black text-slate-900 dark:text-white font-mono truncate tracking-tight">0</div>
            </div>

            <!-- Keys Grid -->
            <div class="grid grid-cols-4 gap-2 text-xs font-bold font-mono">
                <!-- Row 1: Scientific / Clear -->
                <button onclick="calcOp('C')" class="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-all font-black">C</button>
                <button onclick="calcOp('sqrt')" class="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all">√</button>
                <button onclick="calcOp('^')" class="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all">xʸ</button>
                <button onclick="calcOp('/')" class="p-3 bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 transition-all font-black">÷</button>

                <!-- Row 2 -->
                <button onclick="calcNum('7')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">7</button>
                <button onclick="calcNum('8')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">8</button>
                <button onclick="calcNum('9')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">9</button>
                <button onclick="calcOp('*')" class="p-3 bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 transition-all font-black">×</button>

                <!-- Row 3 -->
                <button onclick="calcNum('4')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">4</button>
                <button onclick="calcNum('5')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">5</button>
                <button onclick="calcNum('6')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">6</button>
                <button onclick="calcOp('-')" class="p-3 bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 transition-all font-black">−</button>

                <!-- Row 4 -->
                <button onclick="calcNum('1')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">1</button>
                <button onclick="calcNum('2')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">2</button>
                <button onclick="calcNum('3')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">3</button>
                <button onclick="calcOp('+')" class="p-3 bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 transition-all font-black">+</button>

                <!-- Row 5 -->
                <button onclick="calcNum('0')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">0</button>
                <button onclick="calcNum('.')" class="p-3 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">.</button>
                <button onclick="calcOp('pi')" class="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all">π</button>
                <button onclick="calcOp('=')" class="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all shadow-lg shadow-brand-500/20 font-black">=</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', calcHTML);
}

let calcState = {
    display: '0',
    history: '',
    prevVal: null,
    operation: null,
    resetNext: false
};

window.calcNum = function(num) {
    window.orbitAudio?.playClick();
    const disp = document.getElementById('calc-display');
    if (!disp) return;

    if (calcState.display === '0' || calcState.resetNext) {
        calcState.display = num === '.' ? '0.' : num;
        calcState.resetNext = false;
    } else {
        if (num === '.' && calcState.display.includes('.')) return;
        calcState.display += num;
    }
    disp.innerText = calcState.display;
};

window.calcOp = function(op) {
    window.orbitAudio?.playClick();
    const disp = document.getElementById('calc-display');
    const hist = document.getElementById('calc-history');
    if (!disp) return;

    if (op === 'C') {
        calcState = { display: '0', history: '', prevVal: null, operation: null, resetNext: false };
        disp.innerText = '0';
        if (hist) hist.innerText = '';
        return;
    }

    if (op === 'pi') {
        calcState.display = Math.PI.toFixed(6).toString();
        disp.innerText = calcState.display;
        return;
    }

    if (op === 'sqrt') {
        const val = parseFloat(calcState.display);
        if (val < 0) {
            calcState.display = 'Error';
        } else {
            calcState.display = Math.sqrt(val).toFixed(4).replace(/\.?0+$/, '');
        }
        disp.innerText = calcState.display;
        calcState.resetNext = true;
        return;
    }

    const current = parseFloat(calcState.display);

    if (op === '=') {
        if (calcState.operation && calcState.prevVal !== null) {
            let res = 0;
            switch(calcState.operation) {
                case '+': res = calcState.prevVal + current; break;
                case '-': res = calcState.prevVal - current; break;
                case '*': res = calcState.prevVal * current; break;
                case '/': res = current !== 0 ? calcState.prevVal / current : 'Error'; break;
                case '^': res = Math.pow(calcState.prevVal, current); break;
            }
            calcState.history = `${calcState.prevVal} ${calcState.operation} ${current} =`;
            calcState.display = typeof res === 'number' ? Number(res.toFixed(6)).toString() : res;
            calcState.prevVal = null;
            calcState.operation = null;
            calcState.resetNext = true;
        }
    } else {
        calcState.prevVal = current;
        calcState.operation = op;
        calcState.history = `${current} ${op}`;
        calcState.resetNext = true;
    }

    disp.innerText = calcState.display;
    if (hist) hist.innerText = calcState.history;
};

window.toggleCalculator = function() {
    injectCalculator();
    const el = document.getElementById('orbit-calculator');
    if (el) el.classList.toggle('hidden');
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCalculator);
} else {
    injectCalculator();
}
