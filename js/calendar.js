/*
 * Календарь бронирования. Занятые даты (одобренные заявки) неактивны.
 * Данные приходят с сервера в data-атрибутах, итоговую проверку делает сервер.
 */
(function () {
    'use strict';

    var root = document.getElementById('calendar');
    var inInput = document.getElementById('validationCustom04');
    var outInput = document.getElementById('validationCustom05');
    if (!root || !inInput || !outInput) {
        return;
    }

    var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август',
        'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    var WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    var MAX_NIGHTS = parseInt(root.dataset.maxNights, 10) || 30;
    var today = root.dataset.today;
    var lastDay = root.dataset.lastDay;
    var busyRanges = [];

    try {
        busyRanges = JSON.parse(root.dataset.busy || '[]');
    } catch (e) {
        busyRanges = [];
    }

    function toDate(iso) {
        var p = iso.split('-');
        return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    }

    function toIso(date) {
        return date.toISOString().slice(0, 10);
    }

    function addDays(iso, count) {
        var date = toDate(iso);
        date.setUTCDate(date.getUTCDate() + count);
        return toIso(date);
    }

    function nightsBetween(a, b) {
        return Math.round((toDate(b) - toDate(a)) / 86400000);
    }

    function isValidIso(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(toDate(value)) === value;
    }

    /* Ночь занята, если она входит в одобренную бронь: заезд <= ночь < выезд */
    function isBusyNight(iso) {
        return busyRanges.some(function (range) {
            return iso >= range[0] && iso < range[1];
        });
    }

    function rangeIsFree(from, to) {
        for (var day = from; day < to; day = addDays(day, 1)) {
            if (isBusyNight(day)) {
                return false;
            }
        }
        return true;
    }

    function formatRu(iso) {
        var p = iso.split('-');
        return p[2] + '.' + p[1] + '.' + p[0];
    }

    function pluralNights(n) {
        var last = n % 10;
        var tail = n % 100;
        if (last === 1 && tail !== 11) {
            return n + ' сутки';
        }
        return n + ' суток';
    }

    var checkIn = isValidIso(inInput.value) ? inInput.value : '';
    var checkOut = isValidIso(outInput.value) ? outInput.value : '';
    var shown = (checkIn || today).slice(0, 7);

    /* Можно ли выбрать день как дату выезда при выбранном заезде */
    function canBeCheckOut(iso) {
        return checkIn !== '' && checkOut === '' && iso > checkIn && iso <= lastDay &&
            nightsBetween(checkIn, iso) <= MAX_NIGHTS && rangeIsFree(checkIn, iso);
    }

    function canBeCheckIn(iso) {
        return iso >= today && iso <= lastDay && !isBusyNight(iso);
    }

    function setValue(input, value) {
        input.value = value;
        input.classList.remove('is-invalid');
    }

    function pick(iso) {
        if (canBeCheckOut(iso)) {
            checkOut = iso;
            setValue(outInput, iso);
        } else if (canBeCheckIn(iso)) {
            checkIn = iso;
            checkOut = '';
            setValue(inInput, iso);
            setValue(outInput, '');
        }
        render();
    }

    function hint() {
        if (checkIn && checkOut) {
            return 'Заезд ' + formatRu(checkIn) + ', выезд ' + formatRu(checkOut) +
                ' (' + pluralNights(nightsBetween(checkIn, checkOut)) + ')';
        }
        if (checkIn) {
            return 'Выберите дату выезда. Срок проживания не больше ' + MAX_NIGHTS + ' суток.';
        }
        return 'Выберите дату заезда.';
    }

    function shiftMonth(step) {
        var p = shown.split('-');
        var date = new Date(Date.UTC(+p[0], +p[1] - 1 + step, 1));
        var next = toIso(date).slice(0, 7);
        if (next >= today.slice(0, 7) && next <= lastDay.slice(0, 7)) {
            shown = next;
            render();
        }
    }

    function render() {
        var p = shown.split('-');
        var year = +p[0];
        var month = +p[1] - 1;
        var first = new Date(Date.UTC(year, month, 1));
        var offset = (first.getUTCDay() + 6) % 7;
        var days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

        var html = '<div class="cal-head">' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" data-step="-1" aria-label="Предыдущий месяц"' +
            (shown <= today.slice(0, 7) ? ' disabled' : '') + '>&larr;</button>' +
            '<strong>' + MONTHS[month] + ' ' + year + '</strong>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm" data-step="1" aria-label="Следующий месяц"' +
            (shown >= lastDay.slice(0, 7) ? ' disabled' : '') + '>&rarr;</button></div>';

        html += '<div class="cal-grid">';
        WEEKDAYS.forEach(function (name) {
            html += '<div class="cal-week">' + name + '</div>';
        });
        for (var i = 0; i < offset; i++) {
            html += '<div></div>';
        }
        for (var d = 1; d <= days; d++) {
            var iso = shown + '-' + (d < 10 ? '0' + d : d);
            var classes = 'cal-day';
            var active = canBeCheckOut(iso) || canBeCheckIn(iso);
            if (!active) {
                classes += ' is-inactive';
            }
            if (iso === checkIn) {
                classes += ' is-start';
            } else if (iso === checkOut) {
                classes += ' is-end';
            } else if (checkIn && checkOut && iso > checkIn && iso < checkOut) {
                classes += ' is-range';
            }
            html += '<button type="button" class="' + classes + '" data-date="' + iso + '"' +
                (active ? '' : ' disabled') + '>' + d + '</button>';
        }
        html += '</div><p class="cal-hint">' + hint() + '</p>' +
            '<p class="cal-legend"><span class="cal-day is-inactive">1</span> дата занята или недоступна</p>';
        root.innerHTML = html;
    }

    root.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button || button.disabled) {
            return;
        }
        if (button.dataset.step) {
            shiftMonth(parseInt(button.dataset.step, 10));
        } else if (button.dataset.date) {
            pick(button.dataset.date);
        }
    });

    /* Ручной ввод в поля тоже обновляет календарь */
    function syncFromInputs() {
        checkIn = isValidIso(inInput.value) ? inInput.value : '';
        checkOut = isValidIso(outInput.value) ? outInput.value : '';
        if (checkIn) {
            shown = checkIn.slice(0, 7);
        }
        render();
    }
    inInput.addEventListener('change', syncFromInputs);
    outInput.addEventListener('change', syncFromInputs);

    render();
})();
