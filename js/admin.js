(function () {
    'use strict';
    var SD = window.SD;
    if (!SD.requireAdmin()) {
        return;
    }

    function render() {
        var list = SD.loadBookings().slice().sort(function (a, b) { return b.id - a.id; });
        var box = document.getElementById('bookings');
        box.textContent = '';
        document.getElementById('empty').classList.toggle('d-none', list.length > 0);

        list.forEach(function (b) {
            var room = SD.findRoom(b.roomId);
            var cat = room ? SD.findCategory(room.category) : null;
            var approved = b.status === 'approved';
            var badge = SD.el('span', {'class': 'badge text-bg-' + (approved ? 'success' : 'secondary'), text: approved ? 'Одобрена' : 'Новая'});
            var title = SD.el('h5', {text: 'Заявка №' + b.id + ' '});
            title.appendChild(badge);

            var actions = SD.el('div', {'class': 'd-grid gap-2'});
            if (!approved) {
                var ok = SD.el('button', {'class': 'btn btn-success', type: 'button', text: 'Одобрить'});
                ok.addEventListener('click', function () { approve(b.id); });
                actions.appendChild(ok);
            }
            var del = SD.el('button', {'class': 'btn btn-danger', type: 'button', text: 'Удалить'});
            del.addEventListener('click', function () { remove(b.id); });
            actions.appendChild(del);

            box.appendChild(SD.el('div', {'class': 'card'}, [
                SD.el('div', {'class': 'card-body'}, [
                    title,
                    SD.el('h5', {text: 'Фамилия: ' + b.lastName}),
                    SD.el('h5', {text: 'Имя: ' + b.firstName}),
                    SD.el('h5', {text: 'Телефон: ' + b.phone}),
                    SD.el('h5', {text: 'Почта: ' + b.email}),
                    SD.el('h5', {text: 'Номер: ' + (room ? room.number : '?') + (cat ? ', ' + cat.name.toLowerCase() : '')}),
                    SD.el('ul', {'class': 'list-group'}, [
                        SD.el('li', {'class': 'list-group-item', text: 'Дата заезда: ' + SD.formatDate(b.checkIn)}),
                        SD.el('li', {'class': 'list-group-item', text: 'Дата выезда: ' + SD.formatDate(b.checkOut)})
                    ])
                ]),
                actions
            ]));
        });
    }

    function message(type, text) {
        document.getElementById('alerts').textContent = '';
        SD.showAlert(type, text);
    }

    function approve(id) {
        var list = SD.loadBookings();
        var b = list.filter(function (x) { return x.id === id; })[0];
        if (!b) {
            message('danger', 'Заявка не найдена.');
        } else if (SD.roomIsBusy(b.roomId, b.checkIn, b.checkOut, b.id)) {
            message('danger', 'Нельзя одобрить заявку №' + id + ': номер уже занят на эти даты.');
        } else {
            b.status = 'approved';
            SD.saveBookings(list);
            message('success', 'Заявка №' + id + ' одобрена.');
        }
        render();
    }

    function remove(id) {
        if (!window.confirm('Удалить заявку №' + id + '?')) {
            return;
        }
        SD.saveBookings(SD.loadBookings().filter(function (x) { return x.id !== id; }));
        message('success', 'Заявка №' + id + ' удалена.');
        render();
    }

    render();
})();
