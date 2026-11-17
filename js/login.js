(function () {
    'use strict';
    var SD = window.SD;
    if (SD.isAdmin()) {
        location.replace('admin.html');
        return;
    }
    document.getElementById('login-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var login = document.getElementById('username').value.trim();
        var password = document.getElementById('password').value;
        var box = document.getElementById('alerts');
        box.textContent = '';
        if (login === '' || password === '') {
            SD.showAlert('danger', 'Введите логин и пароль.');
            return;
        }
        SD.sha256(password).then(function (hash) {
            if (login === SD.ADMIN_LOGIN && hash === SD.ADMIN_HASH) {
                sessionStorage.setItem(SD.ADMIN_KEY, '1');
                location.href = 'admin.html';
            } else {
                SD.showAlert('danger', 'Неверный логин или пароль.');
            }
        }).catch(function () {
            SD.showAlert('danger', 'Вход работает только по https или на localhost.');
        });
    });
})();
