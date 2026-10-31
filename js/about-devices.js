(() => {
    'use strict';
    const dialog = document.getElementById('device-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const devices = JSON.parse(document.getElementById('device-data').textContent);
    const title = document.getElementById('device-dialog-title');
    const image = document.getElementById('device-dialog-image');
    const specs = document.getElementById('device-dialog-specs');
    let opener;
    document.querySelectorAll('[data-device]').forEach(button => {
        button.addEventListener('click', () => {
            if (document.querySelector('dialog[open]')) return;
            const index = devices.findIndex(device => device.id === button.dataset.device);
            const device = devices[index];
            if (!device) return;
            opener = button;
            dialog.dataset.device = device.id;
            title.textContent = device.name;
            image.src = device.image;
            image.alt = `${device.name} / ${device.color}`;
            document.getElementById('device-dialog-category').textContent = device.category.toLowerCase().replaceAll(' ', '-');
            document.getElementById('device-dialog-number').textContent = `${String(index + 1).padStart(2, '0')} / ${devices.length}`;
            document.getElementById('device-dialog-color').textContent = device.color;
            document.getElementById('device-image-source').href = device.source;
            specs.replaceChildren();
            device.specs.forEach(([label, value]) => {
                const dt = document.createElement('dt');
                const dd = document.createElement('dd');
                dt.textContent = label;
                dd.textContent = value;
                specs.append(dt, dd);
            });
            dialog.showModal();
            dialog.scrollTop = 0;
        });
    });
    dialog.querySelector('.device-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
})();
