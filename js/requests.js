
// копирование ссылки в буфер обмена
document.querySelector('.menu_copy').addEventListener('click', () => {
    menuUrl.select();
    document.execCommand('copy');
});

// обработка ответа, пришедшего от сервера по Ajax
function treatAjaxServerAnswer(res) {
    // переключение режима меню
    menu.dataset.state = 'selected';
    mode.forEach(elem => elem.dataset.state = '');
    share.dataset.state = 'selected';
    // формирование ссылки
    const url = document.location.href.split('?')[0] + `?id=${res.id}`;
    menuUrl.value = url;
    currentImage.addEventListener('load', () => {
        createCommentsWrap();
        createCanvas();
        createUserImg();
        updateComments(res.comments);
        drawUsersStrokes(res.mask);
        currentImage.dataset.load = 'load';
    });
    currentImage.src = res.url;
    window.history.pushState(null, null, url);
    // создаем соединение вэбсокет
    const ws = new WebSocket(`wss://neto-api.herokuapp.com/pic/${res.id}`);
    ws.addEventListener('open', () => {
        console.log('web socket is open');
    });
    ws.addEventListener('message', event => {
        console.log(`пришло сообщение через вэбсокет:\n${event.data}`);
        const wsData = JSON.parse(event.data);
        if (wsData.event === 'comment') {
            insertWSComment(wsData.comment);
        }
        if (wsData.event === 'mask') {
            drawUsersStrokes(wsData.url);
        }
    });
    ws.addEventListener('error', error => {
        console.log('ошибка вэбсокета');
    });
    wsGlobal = ws;
}

// отправка изображения на сервер и получение данных от сервера
function publishImage(file) {
    if (!file) return;

    function fileTypeCheck(fileType) {
        let isIncorrect = false;
        fileType.split('/').forEach(type => {
            if ( !(type === 'image' || type === 'png' || type === 'jpeg') ) {
                isIncorrect = true;
            }
        });
        return isIncorrect;
    }

    if (fileTypeCheck(file.type)) {
        errorMessage.textContent = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
        errorNode.style.display = '';
        return;
    }

    const formData = new FormData();
    formData.append('title', file.name);
    formData.append('image', file);

    errorNode.style.display = 'none';
    menu.style.display = 'none';
    imageLoader.style.display = '';

    fetch('https://neto-api.herokuapp.com/pic', {
        body: formData,
        credentials: 'same-origin',
        method: 'POST',
    })
        .then(res => {
            document.querySelectorAll('.comments__form').forEach(form => form.remove());
            if (userImg) userImg.src = './pic/back.png';

            menu.style.display = '';
            imageLoader.style.display = 'none';
            if (res.status >= 400) throw res.statusText;
            return res.json();
        })
        .then(res => {
            picID = res.id;
            return fetch(`https://neto-api.herokuapp.com/pic/${res.id}`);
        })
        .then(res => {
            if (res.status >= 400) throw res.statusText;
            return res.json();
        })
        .then(res => {
            treatAjaxServerAnswer(res);
        })
        .catch(err => {
            menu.style.display = 'none';
            imageLoader.style.display = 'none';
            errorMessage.textContent = err;
            errorNode.style.display = '';
            console.log(err);
        });
}

// загрузка изображения через меню
const fileInput = document.createElement('input');
fileInput.setAttribute('type', 'file');
fileInput.setAttribute('accept', 'image/jpeg, image/png');
fileInput.classList.add('menu__fileloader');

fileInput.addEventListener('change', event => {
    const file = event.currentTarget.files[0];
    publishImage(file);
    burger.style.display = '';
});
document.querySelector('.new').insertBefore(fileInput, document.querySelector('.new').firstElementChild);

// загрузка изображения через дроп
wrap.addEventListener('drop', event => {
    event.preventDefault();
    if (picID) {
        errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню.';
        errorNode.style.display = '';
        return;
    }
    const file = event.dataTransfer.files[0];
    publishImage(file);
});
wrap.addEventListener('dragover', event => event.preventDefault());

// отображение содержимого при GET запросе
const regexp = /id=([^&]+)/i;
if (regexp.exec(document.location.search)) {
    picID = regexp.exec(document.location.search)[1];

    menu.style.display = 'none';
    imageLoader.style.display = '';

    fetch(`https://neto-api.herokuapp.com/pic/${picID}`)
        .then(res => {
            if (res.status >= 400) throw res.statusText;
            menu.style.display = '';
            imageLoader.style.display = 'none';
            return res.json();
        })

        .then(res => {
            treatAjaxServerAnswer(res);
            mode.forEach(elem => elem.dataset.state = '');
            comments.dataset.state = 'selected';
        })
        .catch(err => {
            menu.style.display = 'none';
            imageLoader.style.display = 'none';
            errorMessage.textContent = err;
            errorNode.style.display = '';
            console.log(err);
        });
}