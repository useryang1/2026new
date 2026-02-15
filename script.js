// 获取 DOM 元素
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const countdownContainer = document.getElementById('countdown-container');
const countdownEl = document.getElementById('countdown');
const greetingContainer = document.getElementById('greeting-container');
const bgm = document.getElementById('bgm');
const canvas = document.getElementById('fireworks');
const ctx = canvas.getContext('2d');

// 设置画布尺寸
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// 状态变量
let isFireworksActive = false;

// 音频上下文（用于烟花音效）
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playExplosion() {
    if (!audioCtx) return;
    
    // 简单的白噪声模拟爆炸
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5秒
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const gainNode = audioCtx.createGain();
    // 初始音量
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    // 指数衰减模拟爆炸声
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    noise.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
}

// 播放鼓点音效（倒计时）
function playDrum() {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// 语音合成（倒计时喊话）
function speak(text) {
    if ('speechSynthesis' in window) {
        // 停止之前的语音
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        // 尝试设置音色，但这依赖于浏览器
        const voices = speechSynthesis.getVoices();
        // 尝试寻找更有力的男声或女声，如果没有则使用默认
        // 这里只是简单的示例，实际效果因设备而异
        
        utterance.rate = 1.3; // 语速更快，更有紧迫感
        utterance.pitch = 1.1; // 音调稍高
        utterance.volume = 1;
        
        // 播放鼓点增强气势
        playDrum();
        
        speechSynthesis.speak(utterance);
    }
}

// 烟花粒子类
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        // 随机速度
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 4 + 1; // 爆炸力度
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.alpha = 1; // 透明度
        this.friction = 0.98; // 摩擦力
        this.gravity = 0.05; // 重力
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.01; // 慢慢消失
    }
}

// 烟花发射类
class Firework {
    constructor(x, targetY) {
        this.x = x;
        this.y = canvas.height;
        this.targetY = targetY;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.vy = -10; // 上升速度
        this.exploded = false;
        this.particles = [];
    }

    draw() {
        if (!this.exploded) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            this.particles.forEach(p => p.draw());
        }
    }

    update() {
        if (!this.exploded) {
            this.y += this.vy;
            // 到达目标高度或速度减慢到一定程度爆炸
            if (this.y <= this.targetY) {
                this.explode();
            }
        } else {
            this.particles.forEach((p, index) => {
                p.update();
                if (p.alpha <= 0) {
                    this.particles.splice(index, 1);
                }
            });
        }
    }

    explode() {
        this.exploded = true;
        // 播放爆炸音效
        playExplosion();
        // 产生粒子
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
    }
}

const fireworks = [];

function animate() {
    // 拖尾效果
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isFireworksActive) {
        // 随机生成烟花 (基础频率)
        if (Math.random() < 0.1) {
            const x = Math.random() * canvas.width;
            const targetY = Math.random() * (canvas.height / 2);
            fireworks.push(new Firework(x, targetY));
        }
    }

    fireworks.forEach((fw, index) => {
        fw.update();
        fw.draw();
        if (fw.exploded && fw.particles.length === 0) {
            fireworks.splice(index, 1);
        }
    });

    requestAnimationFrame(animate);
}

// 启动动画循环
animate();

// 倒计时逻辑
function startCountdown() {
    startScreen.classList.add('hidden');
    countdownContainer.classList.remove('hidden');
    
    // 初始化音频
    initAudio();
    // 尝试播放背景音乐
    bgm.volume = 0.5; // 设置背景音乐音量，避免盖过烟花声
    bgm.play().catch(e => console.log("请点击页面播放音乐"));

    let count = 5;
    countdownEl.innerText = count;
    speak(count); // 喊出第一个数字

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
            speak(count); // 喊出后续数字
        } else {
            clearInterval(timer);
            showNewYear();
        }
    }, 1000);
}

// 显示新年祝福
function showNewYear() {
    countdownContainer.classList.add('hidden');
    greetingContainer.classList.remove('hidden');
    // 倒计时结束
    isFireworksActive = true; // 开启烟花
    speak("新年快乐！金马奔腾，万事如意！"); // 喊出祝福语
    
    // 增加烟花发射频率，营造欢乐气氛
    setInterval(() => {
        if (isFireworksActive && Math.random() < 0.3) {
            const x = Math.random() * canvas.width;
            const targetY = Math.random() * (canvas.height / 2);
            fireworks.push(new Firework(x, targetY));
        }
    }, 200);
}

// 事件监听
startBtn.addEventListener('click', startCountdown);
