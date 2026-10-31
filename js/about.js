(() => {
    'use strict';
    const root = document.documentElement;
    const intro = document.getElementById('boot-screen');
    const toggle = document.getElementById('fx-toggle');
    const bootStage = document.getElementById('win-boot-stage');
    const signinStage = document.getElementById('win-signin-stage');
    const unlockBtn = document.getElementById('win-unlock-btn');
    const signingInBox = document.getElementById('win-signing-in');
    const signingInText = document.getElementById('win-signing-in-text');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const storageKey = 'fig-about-effects';
    const surfaces = [...document.querySelectorAll('main, nav, footer, .skip-link')].map(element => ({ element, inert: element.inert }));
    const cleanup = [];
    let effectsDisabled = false;
    let bootSequenceDone = false;
    let pageLoaded = document.readyState === 'complete';
    let inSigninStage = false;
    let unlocking = false;
    let deadlineTimer;
    let stageTimer;
    let welcomeTimer;
    let unlockTimer;
    let fadeTimer;

    try { effectsDisabled = localStorage.getItem(storageKey) === 'off'; } catch { /* Storage is optional. */ }

    function updateEffects() {
        const off = effectsDisabled || motion.matches;
        root.classList.toggle('fx-off', off);
        toggle.setAttribute('aria-pressed', String(!off));
        toggle.textContent = off ? 'FX / OFF' : 'FX / ON';
        toggle.disabled = motion.matches;
        toggle.title = motion.matches ? '端末の「視差効果を減らす」設定に合わせて演出を停止しています' : '背景と文字のアニメーションを切り替える';
    }

    function revealPage() {
        clearTimeout(deadlineTimer);
        clearTimeout(stageTimer);
        clearTimeout(welcomeTimer);
        clearTimeout(unlockTimer);
        clearTimeout(fadeTimer);
        root.classList.remove('is-booting');
        root.classList.add('is-ready');
        intro.hidden = true;
        surfaces.forEach(({ element, inert }) => { element.inert = inert; });
        document.getElementById('main').removeAttribute('aria-busy');
    }

    function showSigninScreen() {
        if (inSigninStage) return;
        inSigninStage = true;
        clearTimeout(deadlineTimer);
        cleanup.forEach(remove => remove());
        bootStage.classList.add('is-leaving');
        stageTimer = window.setTimeout(() => {
            bootStage.hidden = true;
            intro.dataset.phase = 'signin';
            signinStage.hidden = false;
            unlockBtn.focus({ preventScroll: true });
        }, 320);
    }

    function completeBootWhenReady() {
        if (inSigninStage || !pageLoaded || !bootSequenceDone) return;
        showSigninScreen();
    }

    function pageReady() {
        if (inSigninStage) return;
        pageLoaded = true;
        completeBootWhenReady();
    }

    function playBootSequence() {
        const bootDuration = motion.matches ? 600 : 1900;
        const timer = window.setTimeout(() => {
            bootSequenceDone = true;
            completeBootWhenReady();
        }, bootDuration);
        cleanup.push(() => clearTimeout(timer));
    }

    unlockBtn.addEventListener('click', () => {
        if (unlocking) return;
        unlocking = true;
        intro.dataset.phase = 'unlocking';
        unlockBtn.hidden = true;
        signingInBox.hidden = false;
        signingInText.textContent = 'サインインしています...';

        welcomeTimer = window.setTimeout(() => {
            signingInText.textContent = 'ようこそ';
        }, 650);

        unlockTimer = window.setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
            intro.classList.add('loaded');
            fadeTimer = window.setTimeout(revealPage, 550);
        }, 1250);
    });

    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        effectsDisabled = !effectsDisabled;
        updateEffects();
        try { localStorage.setItem(storageKey, effectsDisabled ? 'off' : 'on'); } catch { /* Keep the in-memory preference. */ }
    });
    motion.addEventListener('change', updateEffects);
    updateEffects();

    intro.hidden = false;
    root.classList.add('is-booting');
    surfaces.forEach(({ element }) => { element.inert = true; });
    document.getElementById('main').setAttribute('aria-busy', 'true');
    // Failsafe so slow external assets never block reaching the sign-in screen.
    deadlineTimer = window.setTimeout(showSigninScreen, 3800);
    window.addEventListener('load', pageReady, { once: true });
    cleanup.push(() => window.removeEventListener('load', pageReady));
    if (pageLoaded) pageReady();
    playBootSequence();
})();
