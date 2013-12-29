/*

send.js - send test

The MIT License (MIT)

Copyright (c) 2013 Tristan Slominski

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
var tart = require('tart-tracing');
var transport = require('../index.js');

var test = module.exports = {};

test['send fails with "Missing address" error if no address'] = function (test) {
    test.expect(3);
    var tracing = tart.tracing();
    var sponsor = tracing.sponsor;

    var fail = sponsor(function (error) {
        test.ok(error instanceof Error);
        test.equal(error.message, "Missing address");
    });
    var send = sponsor(transport.sendBeh);

    send({fail: fail});
    test.ok(tracing.eventLoop());
    test.done();
};

test['send fails with "Invalid protocol" error if address scheme is not UDP'] = function (test) {
    test.expect(3);
    var tracing = tart.tracing();
    var sponsor = tracing.sponsor;

    var fail = sponsor(function (error) {
        test.ok(error instanceof Error);
        test.equal(error.message, "Invalid protocol foo:");
    });
    var send = sponsor(transport.sendBeh);

    send({address: "foo://bar.com", fail: fail});
    test.ok(tracing.eventLoop());
    test.done();
};

test['send fails with "Missing host" error if address has no host'] = function (test) {
    test.expect(3);
    var tracing = tart.tracing();
    var sponsor = tracing.sponsor;

    var fail = sponsor(function (error) {
        test.ok(error instanceof Error);
        test.equal(error.message, "Missing host");
    });
    var send = sponsor(transport.sendBeh);

    send({address: "udp://:4000", fail: fail});
    test.ok(tracing.eventLoop());
    test.done();
};

test['send fails with "Missing port" error if address has no port'] = function (test) {
    test.expect(3);
    var tracing = tart.tracing();
    var sponsor = tracing.sponsor;

    var fail = sponsor(function (error) {
        test.ok(error instanceof Error);
        test.equal(error.message, "Missing port");
    });
    var send = sponsor(transport.sendBeh);

    send({address: "udp://localhost", fail: fail});
    test.ok(tracing.eventLoop());
    test.done();
};

test['send succeeds (and sends) if no errors'] = function (test) {
    test.expect(3);
    var tracing = tart.tracing();
    var sponsor = tracing.sponsor;

    var address = 'udp://localhost:8888/#some-token';
    var content = '{"some":{"json":"content"}}'

    var fail = sponsor(function (error) {
        test.ok(false, error);
        test.done();
    });
    var ok = sponsor(function () {
        test.ok(true);
    });

    var send = sponsor(transport.sendBeh);

    var socket = dgram.createSocket('udp4', function (message) {
        var parts = message.toString('utf8').split('\r\n');
        test.equal(parts[0], address);
        test.equal(parts[1], content);
        socket.on('close', function () {
            test.done();
        });
        socket.close();
    });
    socket.bind(8888, function () {
        send({
            address: address, 
            content: content, 
            fail: fail, 
            ok: ok
        });
        test.ok(tracing.eventLoop());
    });
};