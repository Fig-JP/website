(() => {
    'use strict';
    const dialog = document.getElementById('secret-terminal');
    const trigger = document.getElementById('terminal-trigger');
    const input = document.getElementById('terminal-input');
    const form = document.getElementById('terminal-form');
    const output = document.getElementById('terminal-output');
    const close = document.getElementById('terminal-close');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const history = [];
    let historyIndex = 0;
    let draft = '';
    let typed = '';
    let lastKeyAt = 0;
    let taps = 0;
    let lastTapAt = 0;
    let tapTimer;
    let returnFocus;

    if (typeof dialog.showModal !== 'function') return;
    trigger.disabled = false;
    document.getElementById('terminal-hint').hidden = false;

    function resetTapFeedback() {
        taps = 0;
        trigger.style.setProperty('--tap-charge', '0');
    }

    function openTerminal() {
        if (document.querySelector('dialog[open]') || document.documentElement.classList.contains('is-booting')) return;
        returnFocus = document.activeElement;
        typed = '';
        clearTimeout(tapTimer);
        if (taps >= 5) tapTimer = window.setTimeout(resetTapFeedback, 650);
        else resetTapFeedback();
        taps = 0;
        dialog.showModal();
        input.focus({ preventScroll: true });
    }

    function goTo(id) {
        dialog.close();
        const heading = document.getElementById(id);
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ behavior: motion.matches || document.documentElement.classList.contains('fx-off') ? 'instant' : 'smooth', block: 'start' });
    }

    function appendResult(command, message, error = false) {
        const entry = document.createElement('div');
        entry.className = 'terminal-entry';
        const prompt = document.createElement('p');
        prompt.className = 'terminal-command';
        prompt.textContent = command;
        const response = document.createElement('p');
        response.className = error ? 'terminal-response is-error' : 'terminal-response';
        response.textContent = message;
        entry.append(prompt, response);
        output.append(entry);
        while (output.children.length > 60) output.firstElementChild.remove();
        return entry;
    }

    function handleLs(raw, rest) {
        const tokens = rest ? rest.split(' ').filter(Boolean) : [];
        const flags = new Set();
        const targets = [];

        for (const token of tokens) {
            if (token.startsWith('-') && token.length > 1) {
                for (const ch of token.slice(1)) flags.add(ch);
            } else {
                targets.push(token.replace(/\/+$/, '') || '/');
            }
        }

        const showAll = flags.has('a');
        const showLong = flags.has('l');
        const target = (targets[0] || '').replace(/^\.\//, '');

        if (!target) {
            if (showLong && showAll) {
                appendResult(raw,
                    'drwxr-xr-x  fig  kosen24s   .          いまいる部屋 (/home/fig)\n' +
                    'drwxr-xr-x  root wheel      ..         ひとつ上の階層 (/home)\n' +
                    'drwx------  fig  inner      .inner/    仲いい人だけの最奥エリア\n' +
                    'drwxr-xr-x  fig  kosen24s   profile/   自己紹介と好きなもの\n' +
                    'drwxr-xr-x  fig  kosen24s   setup/     普段使ってるメイン布陣 (14 devices)\n' +
                    'drwxr-xr-x  fig  kosen24s   links/     SNS・連絡先まとめ\n\n' +
                    '// 気になる場所へは cd <名前> か ls <名前> でどうぞ。'
                );
            } else if (showLong) {
                appendResult(raw,
                    'drwxr-xr-x  fig  kosen24s   profile/   自己紹介と好きなもの\n' +
                    'drwxr-xr-x  fig  kosen24s   setup/     普段使ってるメイン布陣 (14 devices)\n' +
                    'drwxr-xr-x  fig  kosen24s   links/     SNS・連絡先まとめ\n\n' +
                    '// 隠しディレクトリまで見るなら -a も付けてみて。'
                );
            } else if (showAll) {
                appendResult(raw, '.    ..    .inner/    profile    setup    links\n\n// 気になる場所へは cd <名前> か ls <名前> でどうぞ。');
            } else {
                appendResult(raw, 'profile    setup    links\n\n// 隠れているものも見てみる？ -a は all のこと。');
            }
            return;
        }

        switch (target) {
            case '.':
            case '~':
            case '/home/fig':
                if (showAll) {
                    appendResult(raw,
                        '.    ..    .inner/    profile/    setup/    links/\n\n' +
                        '// いまいる現在地（/home/fig）の中身ぜんぶ。\n' +
                        '// 散らかって見えるけど、これでも整理してるほう。'
                    );
                } else {
                    appendResult(raw,
                        'profile/    setup/    links/\n\n' +
                        '// いま立っている場所（/home/fig）だよ。\n' +
                        '// 足元の隠しファイルまで探すなら `ls -a .` を試してみて。'
                    );
                }
                break;

            case '..':
            case '/home':
                appendResult(raw,
                    'fig/    toolbox/    lost+found/\n\n' +
                    '// ひとつ上の階層（/home）を覗き見中。\n' +
                    '// 隣には ToolBox の作業場、隅っこにはボツ案の lost+found が転がってるみたい。'
                );
                break;

            case '../..':
            case '/':
                appendResult(raw,
                    'bin/    boot/    dev/    etc/    home/    proc/    usr/    var/\n\n' +
                    '// システムの根っこ（/）までは立ち入り禁止。\n' +
                    '// 壊れると困るから、/home/fig の中で遊んでいってね。'
                );
                break;

            case 'setup':
                appendResult(raw,
                    'apple/\n' +
                    '  iphone-air.conf      ipad-pro-m4.conf     macbook-pro-m5.conf\n' +
                    '  watch-s9.conf        airpods-5.conf       airpods-pro-3.conf\n' +
                    'gadgets/\n' +
                    '  galaxy-z-flip7.conf  smart-band-9-pro.conf  olympus-e-pl10.conf\n' +
                    '  attackshark-x6.conf  viper-v2-pro.conf\n' +
                    'audio/\n' +
                    '  nothing-ear-a.conf   tanchjim-space.conf  moondrop-aria2.conf\n\n' +
                    '// 現在 14 デバイスがメイン布陣として稼働中。\n' +
                    '// 実物の写真つきで見るなら `setup` か `cd setup` でジャンプできるよ。'
                );
                break;

            case 'setup/apple':
                appendResult(raw,
                    'iphone-air  ipad-pro-m4  macbook-pro-m5  watch-s9  airpods-5  airpods-pro-3\n\n' +
                    '// Apple製品だけで6台。すっかりエコシステムの住人。'
                );
                break;

            case 'setup/gadgets':
                appendResult(raw,
                    'galaxy-z-flip7  smart-band-9-pro  olympus-e-pl10  attackshark-x6  viper-v2-pro\n\n' +
                    '// 折りたたみスマホにミラーレス、白で揃えた軽量マウスたち。'
                );
                break;

            case 'setup/audio':
                appendResult(raw,
                    'nothing-ear-a  tanchjim-space  moondrop-aria2\n\n' +
                    '// 音ゲーと普段の音楽リスニングを支えるオーディオ陣。'
                );
                break;

            case 'profile':
                appendResult(raw,
                    'about.md    hobbies.json    kosen24s.txt    rhythm-games.log\n\n' +
                    '// Fig を構成してるデータ一式。\n' +
                    '// 要約を見るなら `whoami`、ページ上で読むなら `cd profile` でどうぞ。'
                );
                break;

            case 'links':
                appendResult(raw,
                    'github.url    x-main.url    x-locked.url    discord.invite\n\n' +
                    '// 外の世界へのショートカット集。\n' +
                    '// `links` か `cd links` で実際のリンク一覧へ移動できるよ。'
                );
                break;

            case '.inner':
                appendResult(raw,
                    'ls: cannot open directory \'.inner\': Permission required\n\n' +
                    '// 外から中身だけ覗くことはできないみたい。\n' +
                    '// 扉を開けて入るなら `cd .inner` を試してみて。',
                    true
                );
                break;

            default:
                appendResult(raw, `ls: cannot access '${targets[0]}': No such file or directory\n\n// そんな場所は見当たらないみたい。\`ls -a\` で周りを確認してみてね。`, true);
                break;
        }
    }

    function execute(raw) {
        const command = raw.toLowerCase().replace(/\s+/g, ' ');
        if (command === 'ls' || command.startsWith('ls ')) {
            handleLs(raw, command.slice(2).trim());
            return;
        }
        switch (command) {
            case 'help':
                appendResult(raw, 'help     コマンド一覧\nwhoami   Figについて\nls       部屋を見渡す（ls . / ls .. / ls setup なども可）\nsetup    メイン布陣へ移動\nlinks    リンク・連絡先へ移動\nclear    画面をクリア\nexit     ターミナルを閉じる\n\nもう少し奥にも、何かあるかも。');
                break;
            case 'whoami':
                appendResult(raw, 'Fig / NITTsuruokaC #kosen24s\nガジェットと音ゲーが好きな高専生です。\n最近はWebサイトとかアプリも作ってます。');
                break;
            case 'setup':
            case 'cd setup':
            case 'cd setup/':
            case 'cd ./setup':
                goTo('devices-title');
                break;
            case 'profile':
            case 'cd profile':
            case 'cd profile/':
            case 'cd ./profile':
                goTo('profile-title');
                break;
            case 'links':
            case 'cd links':
            case 'cd links/':
            case 'cd ./links':
                goTo('links-title');
                break;
            case 'cd':
            case 'cd ~':
            case 'cd .':
            case 'cd ./':
                appendResult(raw, 'いま /home/fig にいるよ。ここがホームポジション。');
                break;
            case 'cd ..':
            case 'cd ../':
            case 'cd /':
            case 'cd /home':
                appendResult(raw, 'このターミナルは /home/fig 専用だから、部屋の外には出られないみたい。\n出るかわりに `ls ..` で外を覗くくらいならできるよ。');
                break;
            case 'clear': output.replaceChildren(); break;
            case 'exit': case 'quit': dialog.close(); break;
            case 'sudo':
                appendResult(raw, 'ここでは sudo は使えないみたい。\nほかのコマンドで遊んでいってね。');
                break;
            case 'pwd': appendResult(raw, '/home/fig'); break;
            case 'cd .inner/':
            case 'cd .inner':
            case 'cd ./.inner':
            case 'cd ./.inner/': {
                const entry = appendResult(raw, 'ここが最奥です。見つけてくれてありがとう。\nメインと鍵垢で仲よくしてる人だけ通してます。\n見つけてくれても必ず通せるわけではないので、そこはごめんね。');
                const link = document.createElement('a');
                link.className = 'terminal-secret-link';
                link.href = 'https://x.com/i/user/2028807946298327040';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = 'X · 最奥垢  ↗';
                entry.append(link);
                break;
            }
            default:
                if (command.startsWith('sudo ')) {
                    appendResult(raw, 'ここでは sudo は使えないみたい。\nほかのコマンドで遊んでいってね。');
                } else {
                    appendResult(raw, 'そのコマンドはまだないみたい。\n「help」で使えるコマンドを見てみてね。', true);
                }
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const raw = input.value.trim().slice(0, 160);
        if (!raw) return;
        history.push(raw);
        if (history.length > 50) history.shift();
        historyIndex = history.length;
        draft = '';
        input.value = '';
        execute(raw);
        if (dialog.open) {
            input.focus({ preventScroll: true });
            input.scrollIntoView({ block: 'nearest' });
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.isComposing || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        if (historyIndex === history.length) draft = input.value;
        historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
        input.value = historyIndex === history.length ? draft : history[historyIndex];
        input.setSelectionRange(input.value.length, input.value.length);
    });

    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        typed = '';
        // Native dialogs restore focus; this also covers keyboard-only discovery.
        if (document.activeElement === document.body && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
    trigger.addEventListener('click', () => {
        if (document.documentElement.classList.contains('is-booting')) return;
        const now = Date.now();
        taps = now - lastTapAt > 3000 ? 1 : taps + 1;
        lastTapAt = now;
        clearTimeout(tapTimer);
        trigger.style.setProperty('--tap-charge', String(taps / 5));
        tapTimer = window.setTimeout(resetTapFeedback, 3000);
        if (taps >= 5) openTerminal();
    });
    document.addEventListener('keydown', (event) => {
        if (document.querySelector('dialog[open]') || event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.isContentEditable || event.target.closest('input, textarea, select, [role="textbox"]')) {
            typed = '';
            return;
        }
        if (event.key.length !== 1) { typed = ''; return; }
        const now = Date.now();
        if (now - lastKeyAt > 1500) typed = '';
        lastKeyAt = now;
        typed = (typed + event.key.toLowerCase()).slice(-3);
        if (typed === 'fig') {
            event.preventDefault();
            openTerminal();
        }
    });
})();
