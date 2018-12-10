// изменение цвета линий
document.querySelectorAll('.menu__color').forEach(colorInput => {
    colorInput.addEventListener('change', () => {
        if (!colorInput.checked) return;
        currentColor = colorInput.value;
    });
});

// задаем атрибуты холста и вставляем его в DOM
function createCanvas() {
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = getComputedStyle(currentImage).width.slice(0, -2);
    canvas.height = getComputedStyle(currentImage).height.slice(0, -2);

    canvas.classList.add('image-canvas');
    if (!canvasImage) {
        canvasImage = document.createElement('div');
    }
    if (currentImage.dataset.load === 'load') {
        curves = [];
        userImg.src = "./pic/back.png";
    }
    canvasImage.style.width = getComputedStyle(currentImage).width;
    canvasImage.style.height = getComputedStyle(currentImage).height;
    canvasImage.classList.add('image-canvas');
    drawing = false;
    needsRepaint = false;
    currentColor = '#6cbe47';
}

// рисуем точку
function circle(point) {
    ctx.beginPath();
    ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
    ctx.fill();
}

// рисуем плавную линию между двумя точками
function smoothCurveBetween(p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    ctx.quadraticCurveTo(...p1, ...cp);
}

// рисуем плавную линию между множеством точек
function smoothCurve(points) {
    ctx.beginPath();
    ctx.lineWidth = BRUSH_RADIUS;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.moveTo(...points[0]);

    for (let i = 1; i < points.length - 1; i++) {
        smoothCurveBetween(points[i], points[i + 1]);
    }
    ctx.stroke();
}

// задаем координаты точки в виде массива
function makePoint(x, y) {
    return [x, y];
}

// события
canvas.addEventListener('mousedown', event => {
    if (draw.dataset.state !== 'selected') return;
    drawing = true;
    let curve = [];
    curve.color = currentColor;
    curve.push(makePoint(event.offsetX, event.offsetY));
    curves.push(curve);
    needsRepaint = true;
});

canvas.addEventListener('mouseup', () => {
    drawing = false;
});

canvas.addEventListener('mouseleave', () => {
    drawing = false;
});

canvas.addEventListener('mousemove', event => {
    if (draw.dataset.state !== 'selected') return;

    if (drawing) {
        const point = makePoint(event.offsetX, event.offsetY);
        curves[curves.length - 1].push(point);
        needsRepaint = true;
        debounceSendImageToServer();
    }
});


// отрисовка
function repaint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curves
        .forEach(curve => {
            ctx.strokeStyle = curve.color;
            ctx.fillStyle = curve.color;
            circle(curve[0]);
            smoothCurve(curve);
        });
}

document.addEventListener('mousemove', throttleImg(drag));
const debounceSendImageToServer = debounceImg(sendImageToServer, 1000);

// проверяем и при необходимости перерисовываем холст
function tick () {
    if(needsRepaint) {
        repaint();
        needsRepaint = false;
    }
    window.requestAnimationFrame(tick);
};
tick();

// создаем img элемент, через который будем отражать рисунки пользователей, пришедшие с сервера
function createUserImg() {
    if (!userImg) {
        userImg = document.createElement('img');
    }
    wrap.appendChild(canvasImage);
    canvasImage.appendChild(canvas);
    userImg.style = 'background-image: url("./pic/back.png"); background-size: cover; background-repeat: no-repeat; pointer-events: none;';
    userImg.width = getComputedStyle(currentImage).width.slice(0, -2);
    userImg.height = getComputedStyle(currentImage).height.slice(0, -2);
    userImg.classList.add('image-canvas');
    canvasImage.appendChild(userImg);
}

// ограничение частоты срабатывания функции
function throttleImg(callback, delay = 0) {
    let isWaiting = false;
    return function (...rest) {
        if (!isWaiting) {
            console.log('вызываю throttle callback!');
            callback.apply(this, rest);
            isWaiting = true;
            setTimeout(() => {
                isWaiting = false;
        }, delay);
        }
    };
}

// отправка оставшихся данных
function debounceImg(callback, delay) {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            console.log('вызываю debounce callback!');
            callback();
        }, delay);
    };
}

// посылаем рисунки пользователя на сервер
function sendImageToServer() {
    canvas.toBlob(blob => {
        if (!wsGlobal) return;
        wsGlobal.send(blob);
    });
}

// отражаем рисунки пользователей пришедшие с сервера
function drawUsersStrokes(url) {
    if (!url) return;
    userImg.src = url;
}