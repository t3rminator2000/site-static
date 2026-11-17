(function () {
    'use strict';
    var SD = window.SD;
    var params = new URLSearchParams(location.search);
    var valid = SD.CATEGORIES.map(function (c) { return c.id; });
    var selected = [];
    var bad = false;

    params.getAll('category[]').forEach(function (raw) {
        var id = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        if (valid.indexOf(id) === -1) {
            bad = true;
        } else if (selected.indexOf(id) === -1) {
            selected.push(id);
        }
    });
    if (bad) {
        selected = [];
        SD.showAlert('warning', 'Выбрана несуществующая категория. Показаны все номера.');
    }

    var list = document.getElementById('filter-list');
    SD.CATEGORIES.forEach(function (c) {
        var id = 'cat' + c.id;
        var input = SD.el('input', {'class': 'form-check-input', type: 'checkbox', name: 'category[]', value: String(c.id), id: id});
        input.checked = selected.indexOf(c.id) !== -1;
        list.appendChild(SD.el('li', {}, [SD.el('div', {'class': 'form-check'}, [
            input, SD.el('label', {'class': 'form-check-label', 'for': id, text: c.name})
        ])]));
    });

    var rooms = SD.ROOMS.filter(function (r) {
        return !selected.length || selected.indexOf(r.category) !== -1;
    });

    var box = document.getElementById('rooms');
    if (!rooms.length) {
        document.getElementById('filter-note').appendChild(SD.el('div', {'class': 'alert alert-info', text: 'Номеров не найдено.'}));
    }
    rooms.forEach(function (room) {
        var cat = SD.findCategory(room.category);
        var features = SD.el('ul', {'class': 'list-group'}, cat.features.map(function (f) {
            return SD.el('li', {'class': 'list-group-item', text: f});
        }));
        box.appendChild(SD.el('div', {'class': 'card'}, [
            SD.el('img', {src: 'img/' + room.image, 'class': 'card-img-top', alt: cat.name + ', номер ' + room.number}),
            SD.el('div', {'class': 'card-body'}, [
                SD.el('h3', {text: 'Категория: ' + cat.name}),
                SD.el('h5', {text: 'Номер: ' + room.number}),
                SD.el('h5', {text: 'Цена: ' + SD.formatPrice(room.price) + ' / сутки'}),
                SD.el('h5', {text: 'Характеристики:'}),
                features
            ]),
            SD.el('div', {'class': 'd-grid gap-2'}, [
                SD.el('a', {href: 'order.html?room=' + room.id, 'class': 'btn btn-success', text: 'Забронировать'})
            ])
        ]));
    });
})();
