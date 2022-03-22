'use strict'

var log4js = require('log4js');
var https = require('https');
var fs = require('fs');
var socketIo=require('socket.io');

var serveIndex = require('serve-index');
var express = require('express');
var app = express();

var USERCOUNT = 3;

log4js.configure({
    appenders: {
        file: {
            type: 'file',
            filename: 'app.log',
            layout: {
                type: 'pattern',
                pattern: '%r %p - %m',
            }
        }
    },
    categories: {
       default: {
          appenders: ['file'],
          level: 'debug'
       }
    }
});

var logger = log4js.getLogger();
//顺序不能换
app.use(serveIndex('./public'));
app.use(express.static('./public'));

var options = {
	key  : fs.readFileSync('./cert/www.ainiljing.vip.key'),
	cert : fs.readFileSync('./cert/www.ainiljing.vip.pem') 
}

var https_server = https.createServer(options, app);
var io=socketIo.listen(https_server);
io.sockets.on('connection',(socket) =>{
	socket.on('message',(room,data) =>{
		socket.to(room).emit('message',room,data);
	});
	socket.on('join',(room) =>{
		socket.join(room);
		var myRoom=io.sockets.adapter.rooms[room];
		var users=(myRoom)?Object.keys(myRoom.sockets).length:0;
		logger.debug('the user number of room is :'+users);
		if(users < USERCOUNT)
		{
			socket.emit('joined',room,socket.id);
			if(users > 1)
			{
				socket.to(room).emit('otherjoin',room,socket.id);
			}
		}else
		{
			socket.leave(room);
			socket.emit('full',room,socket.id);
		}
	});
	socket.on('leave', (room)=>{
		var myRoom = io.sockets.adapter.rooms[room];
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.debug('the user number of room is: ' + (users-1));
		//socket.emit('leaved', room, socket.id);
		//socket.broadcast.emit('leaved', room, socket.id);
		socket.to(room).emit('bye', room, socket.id);
		socket.emit('leaved', room, socket.id);
		//io.in(room).emit('leaved', room, socket.id);
	});
});
https_server.listen(443, '0.0.0.0');


