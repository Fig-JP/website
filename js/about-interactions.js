(() => {
    'use strict';
    const root = document.documentElement;
    const main = document.getElementById('main');
    const highlight = document.getElementById('glass-highlight');
    const arrival = document.getElementById('arrival-glitch');
    const dialogs = [...document.querySelectorAll('dialog')];
    const modalOpen = () => dialogs.some(dialog => dialog.open);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let clientX = 0;
    let clientY = 0;
    let x = 0;
    let y = 0;
    let following = false;
    let arrivalPlayed = false;
    let arrivalTimer;
    const enabled = () => !motion.matches && !root.classList.contains('fx-off');

    function stopReflection() {
        following = false;
        cancelAnimationFrame(frame);
        frame = 0;
        main.classList.remove('is-reflecting');
    }

    function drawReflection() {
        frame = 0;
        if (!following || !enabled() || document.hidden || modalOpen()) {
            stopReflection();
            return;
        }
        const bounds = main.getBoundingClientRect();
        const targetX = clientX - bounds.left;
        const targetY = clientY - bounds.top;
        if (targetX < 0 || targetX > bounds.width || targetY < 0 || targetY > bounds.height) {
            stopReflection();
            return;
        }
        x += (targetX - x) * .16;
        y += (targetY - y) * .16;
        highlight.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        if (Math.abs(targetX - x) + Math.abs(targetY - y) > .4) {
            frame = requestAnimationFrame(drawReflection);
        }
    }

    main.addEventListener('pointermove', event => {
        if (!finePointer.matches || event.pointerType === 'touch' || !enabled() || !root.classList.contains('is-ready') || modalOpen()) return;
        clientX = event.clientX;
        clientY = event.clientY;
        if (!following) {
            const bounds = main.getBoundingClientRect();
            x = clientX - bounds.left;
            y = clientY - bounds.top;
            following = true;
            main.classList.add('is-reflecting');
        }
        if (!frame) frame = requestAnimationFrame(drawReflection);
    }, { passive: true });
    main.addEventListener('pointerleave', stopReflection);
    main.addEventListener('pointercancel', stopReflection);
    window.addEventListener('blur', stopReflection);
    // Let the reflection fade when the page moves beneath a stationary cursor.
    window.addEventListener('scroll', stopReflection, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopReflection();
    });

    window.addEventListener('resize', stopReflection, { passive: true });

    function syncEffects() {
        if (!enabled()) {
            stopReflection();
            clearTimeout(arrivalTimer);
            arrival.classList.remove('is-active');
        }
        if (root.classList.contains('is-ready') && !arrivalPlayed) {
            arrivalPlayed = true;
            if (enabled()) {
                arrival.classList.add('is-active');
                arrivalTimer = window.setTimeout(() => arrival.classList.remove('is-active'), 850);
            }
        }
    }
    new MutationObserver(syncEffects).observe(root, { attributes: true, attributeFilter: ['class'] });
    dialogs.forEach(dialog => new MutationObserver(() => { if (modalOpen()) stopReflection(); }).observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    motion.addEventListener('change', syncEffects);
    finePointer.addEventListener('change', () => { if (!finePointer.matches) stopReflection(); });
    syncEffects();
})();
