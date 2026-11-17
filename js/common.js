/* Общие данные и функции статичной версии. Заявки хранятся в localStorage браузера. */
(function () {
    'use strict';

    var CATEGORIES = [
        {id: 1, name: 'Стандартный', features: ['Полный санузел', 'Двуспальная кровать', 'Телевизор']},
        {id: 2, name: 'Студия', features: ['Кухонный уголок', 'Полный санузел', 'Двуспальная кровать', 'Телевизор', 'Холодильник']},
        {id: 3, name: 'Люкс', features: ['Двухкомнатный', 'Полный санузел', 'Двуспальная кровать', 'Телевизор', 'Холодильник', 'Кондиционер']}
    ];

    var ROOMS = [
        {id: 1, number: '101', category: 1, price: 3000, image: 'standart.jpg'},
        {id: 2, number: '102', category: 1, price: 3400, image: 'standart-king.jpg'},
        {id: 3, number: '103', category: 1, price: 3800, image: 'garden-ring-hotel-moscow-suit-room-01.jpg'},
        {id: 4, number: '201', category: 2, price: 4600, image: 'ee3d8d71bcbd5f9531616f975035f0e9.jpg'},
        {id: 5, number: '202', category: 2, price: 5400, image: 'Vert-16.jpg'},
        {id: 6, number: '203', category: 2, price: 6200, image: '10.jpg'},
        {id: 7, number: '301', category: 3, price: 8500, image: 'lux-1.jpg'},
        {id: 8, number: '302', category: 3, price: 11500, image: '487d7588b2bc7b4066334ea328e7a7bb.jpg'},
        {id: 9, number: '303', category: 3, price: 15000, image: 'ren_037_ren03663_hd.jpg'}
    ];

    var STORE_KEY = 'sd_bookings';
    var ADMIN_KEY = 'sd_admin';
    var FLASH_KEY = 'sd_flash';
    var ADMIN_LOGIN = 'hotel123';
    /* SHA-256 пароля: в коде нет пароля открытым текстом */
    var ADMIN_HASH = '50d7b0785029519e4ae432d18d50c5b1a3393de24ae26e20ca846b30212df246';

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            if (key === 'text') {
                node.textContent = attrs[key];
            } else {
                node.setAttribute(key, attrs[key]);
            }
        });
        (children || []).forEach(function (child) {
            node.appendChild(child);
        });
        return node;
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function isoDate(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function today() {
        return isoDate(new Date());
    }

    function formatDate(iso) {
        var p = iso.split('-');
        return p[2] + '.' + p[1] + '.' + p[0];
    }

    function formatPrice(price) {
        return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
    }

    function findCategory(id) {
        return CATEGORIES.filter(function (c) { return c.id === id; })[0];
    }

    function findRoom(id) {
        return ROOMS.filter(function (r) { return r.id === id; })[0];
    }

    function loadBookings() {
        try {
            var data = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function saveBookings(list) {
        localStorage.setItem(STORE_KEY, JSON.stringify(list));
    }

    /* Ночь занята, если она входит в одобренную бронь: заезд <= ночь < выезд */
    function roomIsBusy(roomId, checkIn, checkOut, exceptId) {
        return loadBookings().some(function (b) {
            return b.roomId === roomId && b.status === 'approved' && b.id !== exceptId &&
                b.checkIn < checkOut && b.checkOut > checkIn;
        });
    }

    function busyRanges(roomId) {
        var now = today();
        return loadBookings().filter(function (b) {
            return b.roomId === roomId && b.status === 'approved' && b.checkOut > now;
        }).map(function (b) {
            return [b.checkIn, b.checkOut];
        });
    }

    function flash(type, message) {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify({type: type, message: message}));
    }

    function showAlert(type, message) {
        var box = document.getElementById('alerts');
        if (!box) {
            return;
        }
        box.appendChild(el('div', {'class': 'alert alert-' + type + ' text-center', role: 'alert', text: message}));
    }

    function isAdmin() {
        return sessionStorage.getItem(ADMIN_KEY) === '1';
    }

    function requireAdmin() {
        if (!isAdmin()) {
            flash('warning', 'Войдите как администратор, чтобы открыть эту страницу.');
            location.replace('login.html');
            return false;
        }
        return true;
    }

    function sha256(text) {
        if (!window.crypto || !window.crypto.subtle) {
            return Promise.reject(new Error('no crypto'));
        }
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buffer) {
            return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
                return ('0' + b.toString(16)).slice(-2);
            }).join('');
        });
    }

    function renderNav() {
        var nav = document.getElementById('nav');
        if (!nav) {
            return;
        }
        function item(href, text) {
            return el('li', {'class': 'nav-item'}, [el('a', {href: href, 'class': 'nav-link', text: text})]);
        }
        nav.appendChild(item('index.html', 'Приезжайте как гости, уезжайте как друзья!'));
        if (isAdmin()) {
            nav.appendChild(item('admin.html', 'Заявки'));
            var out = item('#', 'Выйти');
            out.firstChild.addEventListener('click', function (event) {
                event.preventDefault();
                sessionStorage.removeItem(ADMIN_KEY);
                flash('success', 'Вы вышли из панели администратора.');
                location.href = 'index.html';
            });
            nav.appendChild(out);
        } else {
            nav.appendChild(item('login.html', 'Вход'));
        }
    }

    function showStoredFlash() {
        var raw = sessionStorage.getItem(FLASH_KEY);
        sessionStorage.removeItem(FLASH_KEY);
        if (raw) {
            try {
                var f = JSON.parse(raw);
                showAlert(f.type, f.message);
            } catch (e) { /* игнорируем */ }
        }
    }

    window.SD = {
        CATEGORIES: CATEGORIES, ROOMS: ROOMS, ADMIN_LOGIN: ADMIN_LOGIN, ADMIN_HASH: ADMIN_HASH,
        ADMIN_KEY: ADMIN_KEY, MAX_NIGHTS: 30,
        el: el, today: today, isoDate: isoDate, formatDate: formatDate, formatPrice: formatPrice,
        findCategory: findCategory, findRoom: findRoom,
        loadBookings: loadBookings, saveBookings: saveBookings,
        roomIsBusy: roomIsBusy, busyRanges: busyRanges,
        flash: flash, showAlert: showAlert, isAdmin: isAdmin, requireAdmin: requireAdmin, sha256: sha256
    };

    renderNav();
    showStoredFlash();
})();
