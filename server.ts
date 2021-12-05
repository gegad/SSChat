import { SlowBuffer } from "buffer";
import { request, Request, Response } from "express";

const express = require("express");
const cookieParser = require('cookie-parser')
const path = require('path');
const dotenv = require('dotenv');

const auth = require('./auth');


// get config vars
dotenv.config();

const wsChatServer = require('./wsChatServer');

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
    if (token && await auth.verifyToken(token)) {
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
        let authUser: string | null = await auth.authenticateUser(body);
        if (authUser) {
            let token: string = auth.generateToken(authUser);            
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
    if (token && await auth.verifyToken(token)) {
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

// GET LOGOUT
app.get('/logout', (request: Request, response: Response) => {
    console.log("get /logout");
    response.clearCookie('token');
    response.send("http://localhost:5000/login")  
})

