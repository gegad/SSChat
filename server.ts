import { SlowBuffer } from "buffer";
import { request, Request, Response } from "express";

const http = require("http");
const express = require("express");
const webSocket = require("ws");
const fs = require("fs");
const cookieParser = require('cookie-parser')
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const database = require('./database');


// get config vars
dotenv.config();

// const wsChatServer = require('./wsChatServer');
// const wsChatServer = new webSocket.Server({noServer: true});


const app = express();
app.use(cookieParser());
app.use(express.json());

//GET HOME
app.get('/', (request: Request, response: Response) => {
    console.log("get /");
    response.redirect('/login');
})

// GET LOGIN
app.get('/login', (request: Request, response: Response) => {
    console.log("get /login");
    let token: string = request.cookies.token;
    let user: string = request.cookies.user;
    if (user && token && verifyToken(user, token)) {
        response.redirect('/chat')
    } else {
        response.sendFile(path.join(__dirname + '/login_page.html'));
    }
    
})

// POST LOGIN
app.post('/login', (request:Request, response: Response) => {
    console.log("post /login");
    let body: string = "";
    request.on('data', function (chunk) {
        body += chunk;
    });
    request.on('end', async function () {
        console.log('POSTed: ' + body);
        let authUser: string | null = await authenticateUser(body);
        if (authUser) {
            let token: string = generateToken(authUser);            
            response.cookie('token', token, {httpOnly: true});
            response.cookie('user', authUser);
            response.send("http://localhost:5000/chat")
        } else {
            response.end();
        }       
    });    
})


// GET CHAT
app.get('/chat', (request:Request, response: Response) => {
    console.log("get /chat");
    response.statusCode = 200;

    let token: string = request.cookies.token;
    let user: string = request.cookies.user;
    if (user && token && verifyToken(user, token)) {
        response.sendFile(path.join(__dirname + '/chat_page.html'));
    } else {
        response.redirect('/login');
    }
})

// GET MESSAGES
app.get('/chat/messages.txt',  (request:Request, response: Response) => {
    response.sendFile(path.join(__dirname + '/messages.txt'));
})
app.listen(5000);
const db = database.connect();


// WEB SOCKET

// app.get('/chat/ws', (request: Request, response: Response) => {
//     console.log("get /chat/ws");
//     wsChatServer.handleUpgrade(request, response.socket, Buffer.alloc(0), onConnection);
// })
const wsChatServer = new webSocket.Server({port: 5001});
wsChatServer.on('connection', onConnection);

const connectedUsers = new Set();

function onConnection(ws: typeof webSocket) {

    connectedUsers.add(ws);

    ws.on('message', function(message: string) {
        console.log("rcv: " + message);
        connectedUsers.forEach((conn: typeof webSocket) => {
            console.log("send: " + message);
            conn.send("" + message)});
        fs.writeFile('./messages.txt', message + '\n', { flag: 'a+' }, (err: Error) => { 
            if (err) {
                console.log(err)
            }
        });
    });
    
    ws.on('close', () => {
        connectedUsers.delete(ws);
        console.log("close ws");
    });
}


// Helper functions
type TokenData = {
    username: string;
}

function generateToken(username: string): string {
    console.log('generateToken: key = ' + process.env.TOKEN_KEY);
    let token =  jwt.sign({username: username}, process.env.TOKEN_KEY, { expiresIn: '2h' });
    database.updateUserToken(db, username, token);
    // let token = 'testtoken';
    return token;
}

function verifyToken(user: string, token: string): boolean {
    try {
        let decoded: TokenData = jwt.verify(token, process.env.TOKEN_KEY);
        return decoded.username == user;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function authenticateUser(data: string) {
    let username: string = JSON.parse(data).username;
    let password: string = JSON.parse(data).password;
    console.log(`user: ${username}`);
    console.log(`password: ${password}`);
    
    let hash = await database.getUserData(db, username, 'passwordhash');
    console.log('authenticateUser: hash = ' + hash);
    if (hash && await bcrypt.compare(password, hash)) {
        return username;
    }
    return null;
}
