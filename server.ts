import { SlowBuffer } from "buffer";
import { request, Request, Response } from "express";

const http = require("http");
const express = require("express");
const webSocket = require("ws");
const fs = require("fs");
const cookieParser = require('cookie-parser')
const path = require('path');

// const wsChatServer = require('./wsChatServer');
// const wsChatServer = new webSocket.Server({noServer: true});


const app = express();
app.use(cookieParser());
app.use(express.json());

// GET LOGIN
app.get('/', (request: Request, response: Response) => {
    console.log("get /");
    response.clearCookie('token');
    response.sendFile(path.join(__dirname + '/login_page.html'));
})

// POST LOGIN
app.post('/', (request:Request, response: Response) => {
    console.log("post /chat");
    let body: string = "";
    request.on('data', function (chunk) {
        body += chunk;
    });
    request.on('end', function () {
        console.log('POSTed: ' + body);
    });

    //TODO check user/password and generate token
    let authUser: String = authenticateUser(body);
    if (authUser) {
        let token: string = generateToken();
        
        response.cookie('token', token, {httpOnly: true});
        response.cookie('user', authUser);
        response.cookie('test', "bla");
        response.send("http://localhost:5000/chat")

    } else {
        response.end();
    }   
    
})

// GET CHAT
app.get('/chat', (request:Request, response: Response) => {
    console.log("get /chat");
    response.statusCode = 200;

    // TODO: check if token present in cookies sent chat_page
    
    response.sendFile(path.join(__dirname + '/chat_page.html'));

    // otherwise redirect to login page
    // let token: string = "testtoken2";
    // response.cookie('token', token, {
    //     // httpOnly: true,
    // });
    // response.redirect('/');
})

// app.get('/chat/ws', (request: Request, response: Response) => {
//     console.log("get /chat/ws");
//     wsChatServer.handleUpgrade(request, response.socket, Buffer.alloc(0), onConnection);
// })
const wsChatServer = new webSocket.Server({port: 5001});
wsChatServer.on('connection', onConnection);

const connectedUsers = new Set();

function onConnection(ws: typeof webSocket) {

    connectedUsers.add(ws);

    ws.on('message', function(message: String) {
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


function generateToken(): string {
    //TODO: generate token
    return "testtokenchat";
}

function authenticateUser(data: string): String {
    // TODO: check user/password 
    return "user1";
    // return null;
}


app.listen(5000);