(function () {
    'use strict';
    var SD = window.SD;
    var NAME_ALLOWED = /^[А-Яа-яЁё .\-]+$/;
    var NAME_HAS_LETTER = /[А-Яа-яЁё]/;
    var PHONE_FORMAT = /^\+7\(\d{3}\)\d{3}-\d{2}-\d{2}$/;
    var EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    var rawRoom = new URLSearchParams(location.search).get('room');
    var room = /^\d+$/.test(rawRoom || '') ? SD.findRoom(parseInt(rawRoom, 10)) : null;
    var form = document.getElementById('booking-form');

    if (!room) {
        var main = document.querySelector('main');
        main.textContent = '';
        main.appendChild(SD.el('div', {'class': 'alert alert-danger', text: 'Номер не выбран. Выберите номер в каталоге.'}));
        main.appendChild(SD.el('a', {'class': 'btn btn-primary', href: 'index.html', text: 'Вернуться в каталог'}));
        return;
    }

    var cat = SD.findCategory(room.category);
    document.getElementById('room-info').textContent =
        'Номер ' + room.number + ', ' + cat.name.toLowerCase() + ', ' + SD.formatPrice(room.price) + ' / сутки';

    var todayIso = SD.today();
    var lastDate = new Date();
    lastDate.setFullYear(lastDate.getFullYear() + 2);
    var lastIso = SD.isoDate(lastDate);

    var calendar = document.getElementById('calendar');
    calendar.dataset.busy = JSON.stringify(SD.busyRanges(room.id));
    calendar.dataset.today = todayIso;
    calendar.dataset.lastDay = lastIso;
    calendar.dataset.maxNights = String(SD.MAX_NIGHTS);

    ['validationCustom04', 'validationCustom05'].forEach(function (id) {
        var input = document.getElementById(id);
        input.min = todayIso;
        input.max = lastIso;
    });

    function parseDate(value) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!m) {
            return null;
        }
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        return d.toISOString().slice(0, 10) === value ? d : null;
    }

    function nights(a, b) {
        return Math.round((parseDate(b) - parseDate(a)) / 86400000);
    }

    function validate(data) {
        var errors = {};
        [['first_name', 'Имя', 'имя'], ['last_name', 'Фамилия', 'фамилию']].forEach(function (f) {
            var v = data[f[0]];
            if (v === '') {
                errors[f[0]] = 'Введите ' + f[2] + '.';
            } else if (v.length > 50) {
                errors[f[0]] = f[1] + ': не больше 50 символов.';
            } else if (!NAME_ALLOWED.test(v) || !NAME_HAS_LETTER.test(v)) {
                errors[f[0]] = f[1] + ': допустимы кириллица, пробелы, точки и тире.';
            }
        });
        if (data.phone === '') {
            errors.phone = 'Введите номер телефона.';
        } else if (!PHONE_FORMAT.test(data.phone)) {
            errors.phone = 'Телефон должен быть в формате +7(XXX)XXX-XX-XX.';
        }
        if (data.email === '') {
            errors.email = 'Введите email.';
        } else if (data.email.length > 100 || !EMAIL_FORMAT.test(data.email)) {
            errors.email = 'Введите email в формате name@example.ru.';
        }

        var inD = data.check_in === '' ? null : parseDate(data.check_in);
        var outD = data.check_out === '' ? null : parseDate(data.check_out);
        if (data.check_in === '') {
            errors.check_in = 'Введите дату заезда.';
        } else if (!inD) {
            errors.check_in = 'Дата заезда указана неверно.';
        } else if (data.check_in < todayIso) {
            errors.check_in = 'Дата заезда не может быть в прошлом.';
        } else if (data.check_in > lastIso) {
            errors.check_in = 'Бронирование доступно не дальше чем на 2 года вперёд.';
        }
        if (data.check_out === '') {
            errors.check_out = 'Введите дату выезда.';
        } else if (!outD) {
            errors.check_out = 'Дата выезда указана неверно.';
        } else if (inD && data.check_out <= data.check_in) {
            errors.check_out = 'Дата выезда должна быть позже даты заезда.';
        } else if (inD && nights(data.check_in, data.check_out) > SD.MAX_NIGHTS) {
            errors.check_out = 'Срок проживания не больше ' + SD.MAX_NIGHTS + ' суток.';
        }
        if (!errors.check_in && !errors.check_out && SD.roomIsBusy(room.id, data.check_in, data.check_out, 0)) {
            errors.check_in = 'Номер уже занят на эти даты. Выберите другие даты или другой номер.';
        }
        return errors;
    }

    var fields = {
        first_name: 'validationCustom01', last_name: 'validationCustom02', phone: 'validationCustomPhone',
        email: 'validationCustom03', check_in: 'validationCustom04', check_out: 'validationCustom05'
    };

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var data = {};
        Object.keys(fields).forEach(function (key) {
            data[key] = document.getElementById(fields[key]).value.trim();
        });
        var errors = validate(data);

        document.getElementById('alerts').textContent = '';
        Object.keys(fields).forEach(function (key) {
            var input = document.getElementById(fields[key]);
            var message = input.parentNode.querySelector('.invalid-feedback');
            input.classList.toggle('is-invalid', !!errors[key]);
            message.textContent = errors[key] || '';
        });

        if (Object.keys(errors).length) {
            SD.showAlert('danger', 'Заявка не отправлена. Исправьте ошибки в форме.');
            return;
        }

        var list = SD.loadBookings();
        var nextId = list.reduce(function (max, b) { return Math.max(max, b.id); }, 0) + 1;
        list.push({
            id: nextId, roomId: room.id, firstName: data.first_name, lastName: data.last_name,
            phone: data.phone, email: data.email, checkIn: data.check_in, checkOut: data.check_out, status: 'new'
        });
        SD.saveBookings(list);
        SD.flash('success', 'Заявка успешно отправлена!');
        location.href = 'order.html?room=' + room.id;
    });
})();
