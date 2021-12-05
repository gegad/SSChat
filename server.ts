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
const url = require('url');

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
app.get('/login', async (request: Request, response: Response) => {
    console.log("get /login");
    let token: string = request.cookies.token;
    if (token && await verifyToken(token)) {
        response.redirect('/chat')
    } else {
        response.clearCookie('token');
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
            response.cookie('token', token);
            response.send("http://localhost:5000/chat")
        } else {
            response.end();
        }       
    });    
})


// GET CHAT
app.get('/chat', async (request:Request, response: Response) => {
    console.log("get /chat");
    response.statusCode = 200;

    let token: string = request.cookies.token;
    if (token && await verifyToken(token)) {
        response.sendFile(path.join(__dirname + '/chat_page.html'));
    } else {
        response.clearCookie('token');
        response.redirect('/login');
    }
})

// GET MESSAGES
app.get('/chat/messages.txt',  (request:Request, response: Response) => {
    response.sendFile(path.join(__dirname + '/messages.txt'));
})
app.listen(5000);
const db = database.connect();


// GET LOGOUT
app.get('/logout', (request: Request, response: Response) => {
    console.log("get /logout");
    response.clearCookie('token');
    response.send("http://localhost:5000/login")  
})

// WEB SOCKET

// app.get('/chat/ws', (request: Request, response: Response) => {
//     console.log("get /chat/ws");
//     wsChatServer.handleUpgrade(request, response.socket, Buffer.alloc(0), onConnection);
// })
const wsChatServer = new webSocket.Server({port: 5001});
wsChatServer.on('connection', onConnection);

const connectedUsers = new Set();

async function onConnection(ws: typeof webSocket, req: Request) {
    let user: string;

    let token = url.parse(req.url, true).query?.token;
    if(token && await verifyToken(token)) {
        user = jwt.verify(token, process.env.TOKEN_KEY).username;
        connectedUsers.add(ws);
    } else {
        ws.disconnect();
    }

    ws.on('message', function(message: string) {
        let formattedMsg = `@${user}: ${message}\n`;
        connectedUsers.forEach((conn: typeof webSocket) => {conn.send(formattedMsg)});
        fs.writeFile('./messages.txt', formattedMsg, { flag: 'a+' }, (err: Error) => { 
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
    let token =  jwt.sign({username: username}, process.env.TOKEN_KEY, { expiresIn: '2h' });
    database.updateUserToken(db, username, token);
    return token;
}

async function verifyToken(token: string) {
    try {
        let decoded: TokenData = jwt.verify(token, process.env.TOKEN_KEY);
        let dbtoken = await database.getUserData(db, decoded.username, 'token');
        return dbtoken == token;
    } catch (err) {
        console.log("token verification failed");
        return false;
    }
}

async function authenticateUser(data: string) {
    let username: string = JSON.parse(data).username;
    let password: string = JSON.parse(data).password;
    
    let hash = await database.getUserData(db, username, 'passwordhash');
    if (hash && await bcrypt.compare(password, hash)) {
        return username;
    }
    return null;
}
