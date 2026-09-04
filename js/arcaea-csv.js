(function (global) {
    'use strict';

    const HEADERS = ['song_id', 'title', 'reading', 'difficulty', 'level', 'constant'];
    const DIFFICULTIES = ['PST', 'PRS', 'FTR', 'ETR', 'BYD', 'INS'];
    const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

    function parseCsv(text) {
        if (typeof text !== 'string') throw new TypeError('CSVは文字列で指定してください');

        const source = text.replace(/^\uFEFF/, '');
        if (source === '') return [];

        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        let closedQuote = false;
        let recordStarted = false;

        for (let i = 0; i < source.length; i++) {
            const char = source[i];

            if (inQuotes) {
                if (char === '"') {
                    if (source[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                        closedQuote = true;
                    }
                } else {
                    field += char;
                }
                recordStarted = true;
                continue;
            }

            if (char === '"') {
                if (field !== '' || closedQuote) {
                    throw new Error(`${rows.length + 1}行目: 引用符の位置が不正です`);
                }
                inQuotes = true;
                recordStarted = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
                closedQuote = false;
                recordStarted = true;
            } else if (char === '\r' || char === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                closedQuote = false;
                recordStarted = false;
                if (char === '\r' && source[i + 1] === '\n') i++;
            } else {
                if (closedQuote) {
                    throw new Error(`${rows.length + 1}行目: 閉じ引用符の後に不正な文字があります`);
                }
                field += char;
                recordStarted = true;
            }
        }

        if (inQuotes) throw new Error(`${rows.length + 1}行目: 引用符が閉じられていません`);
        if (recordStarted || field !== '' || row.length > 0) {
            row.push(field);
            rows.push(row);
        }
        return rows;
    }

    function quoteField(value) {
        const field = String(value ?? '');
        return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
    }

    function serializeCsv(rows) {
        return rows
            .map(row => row.map(quoteField).join(','))
            .join('\r\n');
    }

    function parseDatabase(text) {
        const parsed = parseCsv(text);
        if (parsed.length === 0) throw new Error('CSVが空です');

        const header = parsed[0].map(value => value.trim());
        const indexes = {};
        HEADERS.forEach(name => {
            const index = header.indexOf(name);
            if (index === -1) throw new Error(`必須ヘッダー「${name}」がありません`);
            indexes[name] = index;
        });

        return parsed.slice(1)
            .map((row, index) => {
                if (row.every(value => value === '')) return null;
                const constantText = row[indexes.constant] ?? '';
                return {
                    song_id: (row[indexes.song_id] ?? '').trim(),
                    title: row[indexes.title] ?? '',
                    reading: row[indexes.reading] ?? '',
                    difficulty: (row[indexes.difficulty] ?? '').trim().toUpperCase(),
                    level: row[indexes.level] ?? '',
                    constant: constantText.trim() === '' ? '' : Number(constantText),
                    _row: index + 2
                };
            })
            .filter(Boolean);
    }

    function validateRows(rows) {
        const errors = [];
        const chartKeys = new Map();
        const songMetadata = new Map();

        rows.forEach((row, index) => {
            const rowNumber = row._row || index + 2;
            const prefix = `${rowNumber}行目`;
            const songId = String(row.song_id ?? '').trim();
            const title = String(row.title ?? '');
            const reading = String(row.reading ?? '');
            const difficulty = String(row.difficulty ?? '').trim().toUpperCase();
            const level = String(row.level ?? '');
            const hasLevel = level.trim() !== '';
            const hasConstant = row.constant !== '' && row.constant !== null && row.constant !== undefined;

            if (!songId) {
                errors.push(`${prefix}: song_idが空欄です`);
            } else if (!SAFE_ID_PATTERN.test(songId)) {
                errors.push(`${prefix}: song_id「${songId}」は半角英小文字・数字・_・-で指定してください`);
            }
            if (!title.trim()) errors.push(`${prefix}: titleが空欄です`);
            if (!DIFFICULTIES.includes(difficulty)) {
                errors.push(`${prefix}: difficulty「${difficulty || '(空欄)'}」が不正です`);
            }
            if (!hasLevel && hasConstant) {
                errors.push(`${prefix}: levelが空欄の譜面にはconstantを入力できません`);
            } else if (!hasLevel) {
                errors.push(`${prefix}: 譜面行のlevelとconstantが両方空欄です`);
            }
            if (hasConstant && (typeof row.constant !== 'number' || !Number.isFinite(row.constant))) {
                errors.push(`${prefix}: constant「${row.constant}」は数値ではありません`);
            }

            if (songId && difficulty) {
                const chartKey = `${songId}\u0000${difficulty}`;
                if (chartKeys.has(chartKey)) {
                    errors.push(`${prefix}: song_id + difficultyが重複しています（${songId} / ${difficulty}、${chartKeys.get(chartKey)}行目）`);
                } else {
                    chartKeys.set(chartKey, rowNumber);
                }
            }

            if (songId) {
                const metadata = songMetadata.get(songId);
                if (!metadata) {
                    songMetadata.set(songId, { title, reading, rowNumber });
                } else if (metadata.title !== title || metadata.reading !== reading) {
                    errors.push(`${prefix}: song_id「${songId}」が異なる曲情報と衝突しています（${metadata.rowNumber}行目）`);
                }
            }
        });

        return errors;
    }

    function serializeDatabase(rows) {
        const data = rows.map(row => [
            row.song_id,
            row.title,
            row.reading ?? '',
            String(row.difficulty ?? '').toUpperCase(),
            row.level,
            row.constant
        ]);
        return serializeCsv([HEADERS, ...data]);
    }

    function groupSongs(rows) {
        const songs = new Map();
        rows.forEach(row => {
            let song = songs.get(row.song_id);
            if (!song) {
                song = {
                    song_id: row.song_id,
                    title: row.title,
                    reading: row.reading || '',
                    charts: {}
                };
                songs.set(row.song_id, song);
            }
            song.charts[row.difficulty] = {
                difficulty: row.difficulty,
                level: String(row.level),
                constant: row.constant === '' || row.constant === null || row.constant === undefined
                    ? null
                    : Number(row.constant),
                chartId: `${row.song_id}:${row.difficulty}`
            };
        });
        return Array.from(songs.values());
    }

    function normalizeSearchText(value) {
        return String(value ?? '')
            .normalize('NFKC')
            .toLocaleLowerCase('ja')
            .replace(/[\u30A1-\u30F6]/g, character =>
                String.fromCharCode(character.charCodeAt(0) - 0x60)
            );
    }

    function compactSearchText(value) {
        return normalizeSearchText(value).replace(/[\p{Separator}\p{Punctuation}\p{Symbol}]/gu, '');
    }

    function matchesSearchText(value, query) {
        const target = compactSearchText(value);
        const needle = compactSearchText(query);
        if (!needle) return true;
        if (target.includes(needle)) return true;

        let needleIndex = 0;
        for (const character of target) {
            if (character === needle[needleIndex]) needleIndex++;
            if (needleIndex === needle.length) return true;
        }
        return false;
    }

    function hashString(value) {
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function generateSongId(title, usedIds) {
        const used = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
        const normalized = String(title ?? '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_+/g, '_');
        const base = normalized || `song_${hashString(String(title ?? 'untitled'))}`;
        let candidate = base;
        let suffix = 2;
        while (used.has(candidate)) candidate = `${base}_${suffix++}`;
        return candidate;
    }

    const api = {
        HEADERS,
        DIFFICULTIES,
        SAFE_ID_PATTERN,
        parseCsv,
        serializeCsv,
        parseDatabase,
        serializeDatabase,
        validateRows,
        groupSongs,
        normalizeSearchText,
        matchesSearchText,
        generateSongId
    };

    global.ArcaeaCsv = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
