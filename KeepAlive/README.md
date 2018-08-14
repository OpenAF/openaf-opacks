# KeepAlive

This oPack works in conjunction with the OpenCli opack. The objective to simply send Ping operations every 120 seconds (configurable if needed) to keep the connection alive. This is especially helpfull when using the openaf-console.

## Install

To install it just execute with OpenAF:

````
$ opack install keepalive
````

## Using

````bash
> connect http://some.connection...
> Connected to ...
> load("keepalive.js");
KEEPALIVE: Added http://some.connection... Add more with "keepalive.add(af)".
KEEPALIVE: Started ping every 120s. Don't forget to stop "keepalive.stop()" or exit with ^C.
````

To change from the default 120 seconds keep alive just:

````bash
> keepalive.stop()
> keepalive.start(240000)
KEEPALIVE: Added http://some.connection... Add more with "keepalive.add(af)".
KEEPALIVE: Started ping every 240s. Don't forget to stop "keepalive.stop()" or exit with ^C.
````