/*

index.js - "tart-transport-udp": Tart UDP transport

The MIT License (MIT)

Copyright (c) 2013 Dale Schumacher, Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
"use strict";

var dgram = require('dgram');
var url = require('url');

var transport = module.exports;

var ENDLINE = '\r\n';

transport.sendBeh = function sendBeh(message) {
    if (!message.address) {
        if (message.fail) {
            message.fail(new Error("Missing address"));
        }
        return;
    }

    var parsed = url.parse(message.address);
    if (parsed.protocol !== 'udp:') {
        if (message.fail) {
            message.fail(new Error("Invalid protocol " + parsed.protocol));
        }
        return;
    }

    if (!parsed.hostname) {
        if (message.fail) {
            message.fail(new Error("Missing host"));
        }
        return;
    }

    if (!parsed.port) {
        if (message.fail) {
            message.fail(new Error("Missing port"));
        }
        return;
    }

    var client = dgram.createSocket('udp4');
    client.on('error', function (error) {
        if (message.fail) {
            message.fail(error);
        }
    });
    var buffer = new Buffer(
        message.address + ENDLINE + message.content + ENDLINE, 'utf8');
    client.send(buffer, 0, buffer.length, parsed.port, parsed.hostname, function (err, bytes) {
        client.close();
        if (err) {
            message.fail(err);

            return;
        }

        if (message.ok) {
            message.ok();
        }
    });
};

transport.server = function server(receptionist) {
    var _server;

    var closeBeh = function closeBeh(ack) {
        if (!_server) {
            return; // do nothing if not listening
        }

        _server.on('close', function () {
            ack && typeof ack === 'function' && ack();
        });
        _server.close();
    }; 

    var listenBeh = function listenBeh(message) {
        if (_server) {
            return; // do nothing if already listening
        }

        _server = dgram.createSocket('udp4');
        _server.on('message', function (datagram) {
            var parts = datagram.toString('utf8').split(ENDLINE);
            if (parts.length != 3 || parts[2] != '') {
                // FIXME: log invalid messages somewhere?

                return; // invalid message format
            }

            receptionist({
                address: parts[0],
                content: parts[1]
            });
        });
        _server.on('listening', function () {
            if (message.ok) {
                message.ok({host: message.host, port: message.port});
            }
        });
        _server.on('error', function (error) {
            if (message.fail) {
                message.fail(error);
            }
        });
        _server.bind(message.port, message.host);
    };

    return {
        closeBeh: closeBeh,
        listenBeh: listenBeh
    };
};