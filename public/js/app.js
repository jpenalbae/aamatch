var avatars = []
var avatarUrl = {};
var matchid = undefined;
var matchInfo = undefined;
let ws = undefined;
let matchReported = false;


function generateAvatars() {
    let p1 =  Math.floor(Math.random() * 8) + 1;
    let p2 =  Math.floor(Math.random() * 8) + 1;
    
    while (p1 === p2)
        p2 =  Math.floor(Math.random() * 8) + 1;

    let baseUrl = window.location.protocol + '//' + window.location.host;
    avatars.push(baseUrl + '/img/avatars/' + p1 + '.png');
    avatars.push(baseUrl + '/img/avatars/' + p2 + '.png');
}

function setAvatars() {
    const baseurl = getUrlBase();
    avatarUrl.nell = baseurl + '/img/avatars/nell.png';
    const gBase = window.location.protocol + '//www.gravatar.com/avatar/';

    avatarUrl.player = gBase + matchInfo.user.avatar + '?d=retro';
    avatarUrl.opponent = gBase + matchInfo.opponent.avatar + '?d=retro';
}


function parseFormData(form) {
    const fdata = new FormData(form);
    let result = {};
    fdata.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}


function pad ( val ) { return val > 9 ? val : "0" + val; }

function getWsBase() {
    const url = window.location;
    let result = '';

    if (url.protocol === 'https:')
        result = 'wss://';
    else
        result = 'ws://';

    result += url.host;
    return result;
}

function getUrlBase() {
    const url = window.location;
    let result = '';

    result += url.protocol + '//' + url.host;
    return result;
}



function browserNotification(msg, type, play = false) {

    let img = '/img/icon/info.png';

    if (type === 'error') {
        img = '/img/icon/error.png';
    }

    if (Notification.permission === "granted") {
        new Notification('aamatch', { 
            body: msg,
            icon: img,
            vibrate: [200, 100, 200],
        });
    }

    if (play)
        new Audio('/audio/alert.mp3').play();
}
  

function queueRetry(type) {
    // Check if user is logged in
    if (!logged) {
        changeView('login');
        return;
    }

    // Try to enable browser notifications
    Notification.requestPermission().then((permission) => {
        if (permission !== "granted")
            alert("Notifications disabled\nApplication might not work properly");
    });

    if (!type)
        type = window.location.hash;

    if (type === '#casual') {
        changeView('wait');
        casualQueue();
    }
}


function setMatchInfo(match) {
    document.getElementById('player_name').innerText = match.user.username;
    document.getElementById('opponent_name').innerText = match.opponent.username;

    document.getElementById('player_fcode').innerText = match.user.fcode;
    document.getElementById('opponent_fcode').innerText = match.opponent.fcode;

    setAvatars();

    document.getElementById('player_avatar').src = avatarUrl.player;
    document.getElementById('opponent_avatar').src = avatarUrl.opponent;
}


function enableMatchButtons(state) {
    console.log('Changing match buttons state: ' + state);
    document.getElementById("btn_win").disabled = !state;
    document.getElementById("btn_loose").disabled = !state;
    document.getElementById("btn_disconnect").disabled = !state;
    //document.getElementById("btn_withdraw").disabled = !state;
}

function matchEnd() {
    matchReported = true;
    document.getElementById("msg").disabled = true;
    document.getElementById("match_end").classList.remove("hidden");
    enableMatchButtons(false);
}

function reportMatchEnd(type) {
    if (matchReported)
        return;

    ws.send(JSON.stringify({cmd: 'report', type: type}));
    matchEnd();

    setTimeout(() => {
        ws.close();
    }, 5000);
}

/**
 * Handle websocket for match
 */
function handleMatch() {
    matchid = window.location.pathname.split('/')[2];
    const wsUrl = getWsBase() + '/api/a/match/' + matchid;
    const socket = new WebSocket(wsUrl);
    ws = socket;

    // Alert user we found a match
    browserNotification('Match found.', 'info', true);

    // Connection opened
    socket.addEventListener("open", (event) => {
        console.log('Connected to match ws');
    });

    // Connection closed
    socket.addEventListener("close", (event) => {
        console.log('websocket has been closed');
    });

    // Handle websocket messages
    socket.addEventListener("message", (event) => {
        console.log("Message from server ", event.data);
        const jmsg = JSON.parse(event.data);

        switch (jmsg.push) {
            case 'msg':
                browserNotification(jmsg.message, jmsg.type);
                break;
            case 'match_info':
                matchInfo = jmsg;
                setMatchInfo(matchInfo);
                break;
            case 'disconnect':
                if (!matchReported) {
                    document.getElementById("msg").disabled = true;
                    displayChatMsg('Your opponent disconnected. The match has ended.',
                        'aamatch bot', avatarUrl.nell);
                }
                break;
            case 'end':
                if (!matchReported) {
                    document.getElementById("msg").disabled = true;
                    displayChatMsg('Please send your match report.',
                        'aamatch bot', avatarUrl.nell);
                }
                break;
            case 'timeout':
                readyTimeout();
                break;
            case 'ready':
                clearInterval(interval);
                document.getElementById("moverlay").classList.add("hidden");
                enableMatchButtons(true);
                displayChatMsg('Match is starting. Please agree on a map with yout opponent. ' +
                    'Do not close this window and report match results before closing.' +
                    'this window or it will count as a disconnect',
                    'aamatch bot', avatarUrl.nell);
                break;
            case 'chat':
                displayChatMsg(jmsg.message, matchInfo.opponent.username, avatarUrl.opponent);
                break;

        }
    });

    // Update the timer
    let sec = 5 * 60;
    const interval = setInterval( function(){
        document.getElementById("seconds").innerHTML=pad(--sec%60);
        document.getElementById("minutes").innerHTML=pad(parseInt(sec/60,10));

        if (sec === 0)
            clearInterval(interval);
    }, 1000);
}

function playerReady() {
    console.log('Sending ready');
    const wsData = { "cmd": "ready" };
    ws.send(JSON.stringify(wsData));

    let btn = document.getElementById("btn_ready");
    btn.disabled = true;
    btn.classList.remove("btn-primary");
    btn.innerText = 'Waititing';

    let text = document.getElementById("wait_text");
    text.innerText = 'Waiting for opponent to be ready';
}

function readyTimeout() {
    let btn = document.getElementById("btn_ready");
    btn.classList.add("hidden");

    let text = document.getElementById("wait_text");
    text.innerText = 'Timeout while waiting for ready.\nPlease try again.';

    let countdown = document.getElementById("countdown");
    countdown.classList.add("hidden");


    // After 5 mins redirect to main page
    setTimeout(() => {
        window.location.href = '/';
    }, 5 * 60 * 1000);
}


/**
 * Handle websocket for casual queue
 */
function casualQueue() {
    const wsUrl = getWsBase() + '/api/a/queue';
    const socket = new WebSocket(wsUrl);

    // Connection opened
    socket.addEventListener("open", (event) => {
        console.log('Connected to ws');
        const wsData = { "cmd": "find_casual" }
        socket.send(JSON.stringify(wsData));
    });

    // Handle websocket messages
    socket.addEventListener("message", (event) => {
        console.log("Message from server ", event.data);
        const jmsg = JSON.parse(event.data);

        switch (jmsg.push) {
            case 'msg':
                browserNotification(jmsg.message, jmsg.type);
                break;

            case 'timeout':
                clearInterval(interval);
                changeView('timeout');
                break;

            case 'matched':
                clearInterval(interval);
                window.location.href = '/match/' + jmsg.matchid;
                break;
        }
    });


    // Update the timer
    let sec = 0;
    const interval = setInterval( function(){
        document.getElementById("seconds").innerHTML=pad(++sec%60);
        document.getElementById("minutes").innerHTML=pad(parseInt(sec/60,10));
    }, 1000);
}


function displayChatMsg(message, name, avatar) {
    const chatbox = document.getElementById('chatbox');

    chatbox.innerHTML += `<div class="msg"><img src="${avatar}">` + 
    `<div><strong>${name}</strong>` +
    `<span>${message}</span></div></div>`;

    chatbox.scrollTop = chatbox.scrollHeight;
}

// Handle chat messages
function sendChatMsg(event) {
    if (event.keyCode !== 13)
        return;

    const msg = document.getElementById('msg');
    displayChatMsg(msg.value, matchInfo.user.username, avatarUrl.player);

    // send chat message
    const wsData = { "cmd": "chat", "message": msg.value };
    ws.send(JSON.stringify(wsData));

    msg.value = '';

}

/*
 *  Modal
 */
function modalOpen(data) {
    const modal = document.getElementById('main-modal');
    const modalTitle = document.getElementById('modal_title');
    const modalText = document.getElementById('modal_text');
    const modalBtn = document.getElementById('modal_btn');

    modalTitle.innerText = data.title;
    modalText.innerText = data.text;
    modalBtn.onclick = function() { data.callback(); };

    modal.classList.remove('fadeOut');
    modal.classList.add('fadeIn');
    modal.style.display = 'flex';
}


function modalClose() {
    const modal = document.getElementById('main-modal');

    modal.classList.remove('fadeIn');
    modal.classList.add('fadeOut');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 200);

    console.log('Closing modal');
}


function modalWin()
{
    const data = {};

    data.title = 'Report Win'
    data.text = 'Are you sure you want to report a win?\n';
    data.text += 'Note that this is monitored and both user reports must match';
    data.callback = function() { 
        reportMatchEnd('win');
        modalClose();
    };

    modalOpen(data);
}


function modalLoose()
{
    const data = {};

    data.title = 'Report Loose'
    data.text = 'Are you sure you want to report a loose?\n';
    data.text += 'Note that this is monitored and both user reports must match';
    data.callback = function() { 
        reportMatchEnd('loose');
        modalClose();
    };

    modalOpen(data);
}

// function modalWithdraw()
// {
//     const data = {};

//     data.title = 'Report Withdraw'
//     data.text = 'Are you sure you want to withdraw?\n';
//     data.text += 'Please try to agree with your opponent before withdrawing';
//     data.callback = function() { 
//         reportMatchEnd('withdraw');
//         modalClose();
//     };

//     modalOpen(data);
// }

function modalDisconnect()
{
    const data = {};

    data.title = 'Opponent disconnect'
    data.text = 'Are you sure you want to report a disconnect?\n';
    data.text += 'Disconnects are monitored and users abusing this feature will be banned';
    data.callback = function() { 
        reportMatchEnd('disconnect');
        modalClose();
    };

    modalOpen(data);
}

function modalPasswordReset()
{
    const data = {};

    data.title = 'Password reset'
    data.text = 'Yout password reset has been requested.\n';
    data.text += 'Check your email for further instructions.';
    data.callback = function() { 
        modalClose();
    };

    modalOpen(data);
}

function modalRegister()
{
    const data = {};

    data.title = 'User registration'
    data.text = 'Registration needs confirmation.\n';
    data.text += 'Please check your email to finish registration.';
    data.callback = function() { 
        modalClose();
    };

    modalOpen(data);
}

function modalRegisterOk()
{
    const data = {};

    data.title = 'User registration'
    data.text = 'Your has been registered.\n';
    data.text += 'You can now log in.';
    data.callback = function() { 
        modalClose();
        changeView('login');
    };

    modalOpen(data);
}


function shakeButton(btn) {
    btn.classList.add('fa-shake');
    // btn.classList.add('border-red-700');
    // btn.classList.add('border-4');
    
    setTimeout(() => {
        btn.classList.remove('fa-shake');
        // btn.classList.remove('border-red-700');
        // btn.classList.remove('border-4');
    }, 1000);
}


function login(form) {
    const icon = document.getElementById('icon_login');
    const btn = document.getElementById('btn_login');
    const fdata = parseFormData(form);

    console.log('Submit login');

    icon.classList.remove('fa-sign-in');
    icon.classList.add('fa-spinner');
    icon.classList.add('fa-spin');

    const reqData = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fdata)
    };

    fetch('/api/p/login', reqData).then(response => {
        response.json().then(data => {
            if (response.status === 200 && data.logged) {
                window.location.href = '/';
            } else if (data.error) {
                shakeButton(btn);
                setErrorMsg(data.error);
                icon.classList.remove('fa-spinner');
                icon.classList.remove('fa-spin');
                icon.classList.add('fa-sign-in');
            } else {
                shakeButton(btn);
                setErrorMsg('Error logging in');
                icon.classList.remove('fa-spinner');
                icon.classList.remove('fa-spin');
                icon.classList.add('fa-sign-in');
            }
        });
    });
}

function resetRequest(form) {
    const fdata = parseFormData(form);
    const reqData = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fdata)
    };

    fetch('/api/p/resetreq', reqData).then(response => {
        window.location.hash = '';
        changeView('main');
        modalPasswordReset();
    });
}

function setErrorMsg(msg, elem) {
    let error = document.getElementById('errormsg');
    if (elem)
        error = elem;
    error.innerText = msg;
}

function resetPassword(form) {
    const fdata = parseFormData(form);
    const uuid = window.location.pathname.replace('/reset/','');
    fdata.uuid = uuid;

    // Check if passwords match
    if (fdata.password !== fdata.repeat) {
        shakeButton(document.getElementById('btn_reset'));
        setErrorMsg('Passwords do not match');
        return;
    }

    // check if password is at least 6 chars
    if (fdata.password.length < 6) {
        shakeButton(document.getElementById('btn_reset'));
        setErrorMsg('Password must be at least 6 characters');
        return;
    }

    const reqData = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fdata)
    };

    fetch('/api/p/reset', reqData).then(response => {
        response.json().then(data => {
            if (response.status === 200 && data.reset) {
                window.location.href = '/';
            } else if (data.error) {
                shakeButton(document.getElementById('btn_reset'));
                setErrorMsg(data.error);
            } else {
                shakeButton(document.getElementById('btn_reset'));
                setErrorMsg('Something went wrong');
            }
        });
    });

}


function register(form) {
    const error = document.getElementById('errormsg_register');
    const btn = document.getElementById('btn_register');
    const fdata = parseFormData(form);

    // Check if passwords match
    if (fdata.password !== fdata.repeat) {
        shakeButton(btn);
        setErrorMsg('Passwords do not match', error);
        return;
    }

    // Check password length
    if (fdata.password.length < 6) {
        shakeButton(btn);
        setErrorMsg('Password must be at least 6 characters', error);
        return;
    }

    const reqData = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fdata)
    };

    fetch('/api/p/register', reqData).then(response => {
        response.json().then(data => {
            if (response.status === 200 && data.register) {
                window.location.hash = '';
                changeView('main');
                modalRegister();
            } else if (data.error) {
                shakeButton(btn);
                setErrorMsg(data.error, error);
            } else {
                shakeButton(btn);
                setErrorMsg('Error registering', error);
            }
        });
    });
}




const views = [ 'main', 'wait', 'timeout', 'casual', 'ranked', 'match', 'login',
                'reset', 'register', 'login' ];

function changeView(view) {
    views.forEach(entry => {
        let item = document.getElementById(entry);
        if (item)
            item.classList.add("hidden");
    });

    document.getElementById(view).classList.remove("hidden");
}


/*
 * Main code
 */
document.addEventListener("DOMContentLoaded", function() {
    // Evaluate which page to load
    let hash = window.location.hash;
    console.log("hash is: " + hash)

    generateAvatars();

    // Handle special cases
    if (window.location.pathname.startsWith('/match')) {
        enableMatchButtons(false);
        handleMatch();
        return;
    }

    switch (hash) {
        case '#casual':
            queueRetry();
            break;
        case '#timeout':
            changeView('timeout');
            break;
        case '#login':
            changeView('login');
            break;
        case '#register':
            changeView('register');
            break;
        case '#registerok':
            changeView('main');
            modalRegisterOk();
            break;
        case '#reset':
            changeView('reset');
            break;
        default:
            changeView('main');
            break;
    }

});


// Remove logo bounce anim
setTimeout(() => {
    const logo = document.getElementById('logo_main');
    logo.classList.remove('fa-bounce');
}, 1000);
