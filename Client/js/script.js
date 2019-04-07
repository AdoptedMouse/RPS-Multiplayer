const socket = io("localhost:8080");

const loginContainer = document.querySelector('.login-container');
const gameContainer = document.querySelector('.game-container');
const challengedBox = document.querySelector('#challenged-modal');
const userList = document.querySelector('.user-list');
const errModal = document.querySelector('#error-modal');
const errTitel = document.querySelector('#error-modal h2');
const errText = document.querySelector('#error-modal p');
let myName = "";

let classArr = ["far fa-hand-rock", "far fa-hand-paper", "far fa-hand-scissors"];

document.querySelector('#login').addEventListener('click', () => {
    let value = document.querySelector('.login-container input').value;
    if(value === "") {
        displayError("Login error", "You need to enter a name.")
    } else if (value.length < 2) {
        displayError("Login error", "Name is too short.")
    } else {
        myName = value;
        document.querySelector('.wrapper').style.height = "100%";
        socket.emit('attemptLogin', value);
    }
})

socket.on('login', succes => {
    if(succes) {
        loginContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        document.querySelector('.wrapper').style.display = 'block';
    } else {
        document.querySelector('.wrapper').style.height = "100vh";
        displayError('Login error', 'A user already exists with that name!');
    }
})

socket.on('userlist', usernames => {
    userList.innerHTML = "";
    addPlayer(myName)
    usernames.forEach(username => {
       if(username != myName) addPlayer(username);
    });
})

socket.on('error', arr => {
    displayError(arr[0], arr[1]);
})

socket.on('beingChallenged', user => {
    beenChallenged(user);
})

socket.on('startBattle', data => {
    startBattle(data)
})

socket.on('resultGame', data => {
    console.log(data);
    let picked = classArr[data[0]];
    let wonarr = JSON.parse(data[1])
    resultBattle(picked, checkifWon(wonarr[0], wonarr[1]));
})

/* Display the error message */

function displayError(titel, message) {
    errModal.style.display = 'flex';
    errTitel.textContent = titel;
    errText.textContent = message;
}

document.querySelector('#hideErr').addEventListener('click', () => {
    errModal.style.display = 'none';
})

/* Accept or deny the challenge */

function beenChallenged(name) {
    let h2 = document.querySelector('#challenged-modal h2');
    h2.textContent = `${name} has challenged you!`;
    challengedBox.style.display = "flex";
}

document.querySelector('#AcceptChallenge').addEventListener('click', () => {
    socket.emit('responseChallenge', true);
    challengedBox.style.display = "none";
})

document.querySelector('#DeclineChallenge').addEventListener('click', () => {
    socket.emit('responseChallenge', false)
    challengedBox.style.display = "none";
})

/* Battle in action */

function startBattle(name) {
    const btns = document.querySelectorAll('.pick-row i');
    document.querySelector('#game-modal').style.display = 'flex';
    document.querySelector('#game-modal #enemy').textContent = name;
    addClick(btns);
}

function resultBattle(picked, result) {
    document.querySelectorAll('.pick .icon i')[1].classList = picked;
    document.querySelector('.pick-row').innerHTML = ``;
    let h3 = document.createElement('h3');

    if(result === 'Won') {
        h3.style.color = "#56c056";
        h3.textContent = "You won!";
    } else if (result === 'Lost') {
        h3.style.color = "#eb6060";
        h3.textContent = "You lost";
    } else {
        h3.style.color = "#60d6eb";
        h3.textContent = "Its a tie!";
    }

    document.querySelector('.pick-row').append(h3);
    document.querySelector('#game-modal button').disabled = false;
}

function addClick(btns) {
    btns.forEach(btn => {
        btn.addEventListener('click', click)
    });
}

function removeClick() {
    const btns = document.querySelectorAll('.pick-row i');

    btns.forEach(btn => {
        btn.removeEventListener('click', click);
    });
}

function click(d) {
    if(document.querySelector('.picked') === null) {
        document.querySelector('.pick .icon i').classList = d.target.classList;
        socket.emit('choose', Number(d.target.dataset.id));

        d.target.classList = `${d.target.classList} picked`;
        removeClick();
    }
}

function checkifWon(me, won) {
    let returnMsg = "";

    if(won === false) {
        returnMsg = "Tie";
    } else if(me === won) {
        returnMsg = "Won"
    } else {
        returnMsg = "Lost"
    }

    return returnMsg;
}

document.querySelector('#game-modal button').addEventListener('click', () => {
    if(!document.querySelector("#game-modal button").disabled) {
       document.querySelector('#game-modal').style.display = "none";
       document.querySelector('.pick-row').innerHTML = `
        <i data-id="0" class="far fa-hand-rock"></i>
        <i data-id="1" class="far fa-hand-paper"></i>
        <i data-id="2" class="far fa-hand-scissors"></i>`
        document.querySelector('#game-modal button').disabled = true;

        const icons = document.querySelectorAll('.icon');

        icons.forEach(icon => {
            icon.innerHTML = '<i class="fas fa-question"></i>';
        });
    }
})

/* Add someone to the battle list */

function addPlayer(username) {
    const div = document.createElement('div');
    const p = document.createElement('p');
    const button = document.createElement('button');
    const img = document.createElement('img');

    img.src = "img/swords.svg";
    button.textContent = "Battle";
    button.setAttribute("data-user", username)
    button.append(img);

    if(username === myName) {
        button.style.backgroundColor = "rgb(73, 110, 117)";
        p.style.color = "#CE93D8";
        button.disabled = true;
    } 
        p.textContent = username;

    div.className = "user";

    button.addEventListener('click', () => {
        socket.emit('challenge', button.dataset.user);
    })

    div.append(p, button);

    userList.append(div);
}