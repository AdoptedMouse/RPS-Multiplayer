const server = require('http').createServer();
const io = require('socket.io')(server);

const clientIds = [];
const matches = [];
const usernames = [];
const users = {};
const usersN = {};

function inMatch(username) {
    let returnMsg = false;
    let arrIndex = -1;

    matches.forEach(match => {
        if(match.players.includes(username)) {
            returnMsg = true;
            arrIndex = matches.indexOf(match);
        }
    });

    return [returnMsg, arrIndex];
}

function returnResult(choice1, choice2) {
    let returnMsg;  
    
    if(choice1 === 1 && choice2 === 0 || choice1 === 0 && choice2 === 1) {
        if(choice1 === 1) {
            returnMsg = 0 ;
        } else {
            returnMsg = 1;
        }
    } else if(choice1 === 0 && choice2 === 2 || choice1 === 2 && choice2 === 0) {
        if(choice1 === 0) {
            returnMsg =  0;
        } else {
            returnMsg = 1;
        }
    } else if(choice1 === 2 && choice2 === 1 || choice1 === 1 && choice2 === 2) {
        if(choice1 === 2) {
            returnMsg =  0;
        } else {
            returnMsg = 1;
        }
    } else if(choice1 === choice2) {
        returnMsg = false;
    }

    return returnMsg;
}

io.on('connection', client => {
    clientIds.push(client.id);
    users[client.id] = {"name": "", "score": 0, "loggedIn": false, "inMatch": false, "isChallenged": false, "id": client.id}; 
    client.on('attemptLogin', data => {
        let name = data.slice(0, 15);
        if(!usernames.includes(name)) {
            usernames.push(name);
            usersN[data] = client.id;
            users[client.id].name = name;
            users[client.id].loggedIn = true;

            client.emit('login', true);
            io.emit('userlist', usernames);
        } else {
            client.emit('login', false);
        }
    })

    client.on('challenge', user => {
        let challenger = users[client.id];
        let challenged = users[usersN[user]];
        
        if(challenged.name === undefined || challenger.name === undefined) {
            client.emit('error', ["Challenge error!", `Unexpected error occured`])
        } if(challenged.name === challenger.name) {
            io.to(client.id).emit('error', ["Challenge error!", `You can't battle yourself!`]);
        } else if(challenged.inMatch) {
            io.to(client.id).emit('error', ["Challenge error!", `${challenged.name} is already in a match!`]);
        } else if(challenged.isChallenged) {
            io.to(client.id).emit('error', ["Challenge error!", ` ${challenged.name} is already being challenged  by someone else!`]);
        } else {
            matches.push({"players":[challenger.name, challenged.name], "turns": [], "choices":[]});
            users[challenged.id].isChallenged = true;
            io.to(challenged.id).emit('beingChallenged', challenger.name);
        }
    })

    client.on('responseChallenge', response => {
        let challenged = users[client.id];
        let matchInfo = inMatch(challenged.name);
        let challenger = users[usersN[matches[matchInfo[1]].players[0]]];
        users[client.id].isChallenged = false;

        if(response) {
            challenger.inMatch = true;
            challenged.inMatch = true;
            io.to(challenged.id).emit('startBattle', challenger.name)
            io.to(challenger.id).emit('startBattle', challenged.name)
        } else {
            matches.splice(matchInfo[1], 1);
            if(!challenger.inMatch) {
                io.to(challenger.id).emit('error', ['Challenge request', `${challenged.name} has declined your request`]);
            }
        }
    })

    client.on('choose', data => {
        let user = users[client.id];
        let matchInfo = inMatch(user.name);
        if(!matchInfo[0]) {
            io.to(user.id).emit('error', ['Choosing', `You're currently not in a match!`]);
        } else if(!matches[matchInfo[1]].turns.includes(user.name)) {
            matches[matchInfo[1]].turns.push(user.name);

            matches[matchInfo[1]].choices.push(data);
            if(matches[matchInfo[1]].choices.length === 2) {
                let challenger = users[usersN[matches[matchInfo[1]].players[0]]]
                let challenged = users[usersN[matches[matchInfo[1]].players[1]]]
                let result = returnResult(matches[matchInfo[1]].choices[matches[matchInfo[1]].turns.indexOf(challenger.name)], matches[matchInfo[1]].choices[matches[matchInfo[1]].turns.indexOf(challenged.name)]);

                io.to(challenger.id).emit("resultGame", [matches[matchInfo[1]].choices[matches[matchInfo[1]].turns.indexOf(challenged.name)], JSON.stringify([0, result])]);
                io.to(challenged.id).emit("resultGame", [matches[matchInfo[1]].choices[matches[matchInfo[1]].turns.indexOf(challenger.name)], JSON.stringify([1, result])]);

                setTimeout(() => {
                    matches.splice(matchInfo[1], 1);
                    challenged.inMatch = false
                    challenger.inMatch = false;
                }, 1000);
            }
        }
    })

    client.on('disconnect', () => {
        let index = clientIds.indexOf(client.id);

        if(users[client.id].loggedIn) {
            let match = inMatch(users[client.id].name);
            
            usernames.splice(usernames.indexOf(users[client.id].name), 1);
            delete usersN[users[client.id].name];

            if(match[0]) {
                matches.splice(match[1], 1);
            }

            io.emit('userlist', usernames);
        }

        clientIds.splice(index, 1);
        delete users[client.id];
    })
})

server.listen(8080);