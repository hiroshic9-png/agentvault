/**
 * AgentVault Landing Page — Micro-interactions
 */

// Animate stat counters on scroll
function animateCounter(element, target, duration = 1500) {
    let start = 0;
    const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        element.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// IntersectionObserver for scroll animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Animate counters
            if (entry.target.id === 'statServers') animateCounter(entry.target, 21);
            if (entry.target.id === 'statTools') animateCounter(entry.target, 295);
            if (entry.target.id === 'statAvg') animateCounter(entry.target, 89);

            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

// Observe all animated elements
document.querySelectorAll('.hero-stat-value, .product-card, .data-card').forEach(el => {
    observer.observe(el);
});

// Smooth nav background on scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        nav.style.borderBottomColor = 'rgba(30, 30, 53, 0.8)';
    } else {
        nav.style.borderBottomColor = 'rgba(30, 30, 53, 0.3)';
    }
});

// Copy install command on click
document.querySelectorAll('.product-code').forEach(el => {
    el.style.cursor = 'pointer';
    el.title = 'Click to copy';
    el.addEventListener('click', () => {
        const code = el.querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const original = el.querySelector('code').textContent;
            el.querySelector('code').textContent = '✓ Copied!';
            el.querySelector('code').style.color = '#34d399';
            setTimeout(() => {
                el.querySelector('code').textContent = original;
                el.querySelector('code').style.color = '';
            }, 1500);
        });
    });
});

// ========================================
// Live Telemetry Counter
// ========================================
const TELEMETRY_STATS_URL = 'https://agentvault-telemetry.onrender.com/api/stats';
const REFRESH_INTERVAL = 30000; // 30秒ごと

async function fetchTelemetryStats() {
    const el = document.getElementById('statDataPoints');
    if (!el) return;
    
    try {
        const resp = await fetch(TELEMETRY_STATS_URL, { signal: AbortSignal.timeout(10000) });
        const stats = await resp.json();
        const count = stats.total_data_points || 0;
        
        // ライブドットを維持しつつ数値を更新
        const dot = el.querySelector('.live-dot');
        if (count > 0) {
            animateCounter(el, count, 800);
            // アニメーション後にドットを復元
            setTimeout(() => {
                if (!el.querySelector('.live-dot')) {
                    const newDot = document.createElement('span');
                    newDot.className = 'live-dot';
                    el.prepend(newDot);
                }
            }, 900);
        } else {
            el.innerHTML = '<span class="live-dot"></span>0';
        }
    } catch (err) {
        // サーバースリープ中は表示を維持
        console.log('[AgentVault] Telemetry server warming up...');
    }
}

// 初回取得 + 定期更新
fetchTelemetryStats();
setInterval(fetchTelemetryStats, REFRESH_INTERVAL);
