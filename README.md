# Adblock Radio Buffer
Listen to the radio ad-free and without interruptions.
Adblock Radio Buffer buffers radio content and lets you fast-forward ads.

Uses [Adblock Radio](https://github.com/adblockradio/adblockradio) as a backend, featuring machine-learning and acoustic fingerprinting techniques.

[A technical discussion describes how it works](https://www.adblockradio.com/blog/2018/11/15/designing-audio-ad-block-radio-podcast/).

## Preview

![](doc/abr-buffer.png)

### Player interface

For each radio, metadata is retrieved with the [open source live metadata scraper](https://github.com/adblockradio/webradio-metadata).

A colored bar indicates how much of audio is available. Default setting is to buffer up to 15 minutes.
Each color tells the user about the content of the audio:
- blue for music
- green for talk
- red for ads

### Select the content you want to hear

You can choose what kind of content you want to hear or skip on each radio.

On news stations, it is great just to skip ads.
On musical stations, it's convenient to skip ads and also talk interruptions.

### Many radios available, more to come

At the time of writing, 84 radios are available in the player.

It is planned to add more. You can [submit requests here](https://github.com/adblockradio/available-models/).

### Crowd-sourced improvements of the filters

Sometimes the predictor is wrong. Not a problem, it is possible to report mispredictions.

It makes Adblock Radio better for everybody.

## Installation

### Docker (recommended for most users)

Choose a directory where configuration and log files will be stored.
```
mkdir /var/lib/adblockradio
mkdir /var/lib/adblockradio/config
mkdir /var/lib/adblockradio/log
```

Built images are available on Docker Hub as `adblockradio/buffer`. Check on https://hub.docker.com/r/adblockradio/buffer.

Find the version you want to run, e.g. `0.1.0`.

```
VERSION=0.1.0
docker pull adblockradio/buffer:$VERSION
cd /var/lib/adblockradio
docker run -it -p 9820:9820 -a STDOUT --mount type=bind,source="$(pwd)"/config,target=/usr/src/adblockradio-buffer/config --mount type=bind,source="$(pwd)"/log,target=/usr/src/adblockradio-buffer/log adblockradio/buffer:$VERSION
```
The interface should now be available at http://localhost:9820/. Type Ctrl-P Ctrl-Q to detach from the container.

To make it accessible to remote clients, configure e.g. Nginx the following way:
```
server {
        server_name subdomain.your-server.com;
        root /usr/share/nginx/html;

        location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:9820;
                proxy_set_header   X-Forwarded-Proto https;
        }
        listen 80;
}
```
and use [Certbot](https://certbot.eff.org/) to enable HTTPS. You are good to go.

Advanced users and developers can build their own Docker image with `docker-build.sh`.

### Desktop binary (Linux only, alpha quality)
An Electron Linux binary is available [here](http://cdn.s00.adblockradio.com/ABR-Buffer-v1.0.tar.gz).
It has been tested on Debian 8.0/LMDE2 x64.
It needs `ffmpeg` on your system. If you do not have it, run `sudo apt install ffmpeg`.

Windows and Mac builds are expected in the future.

### From source
Installation instructions expect a minimum of technical knowledge.

Create an empty directory somewhere on your machine, we call it `DIR`.

First, install [Adblock Radio algorithm](https://github.com/adblockradio/adblockradio). You should now have `DIR/adblockradio` with the files inside. In that subdirectory, run `node demo.js` to check everything is working correctly.

Then, install this player. Run these commands in `DIR`, so that `DIR/buffer` will be created:
```
git clone https://github.com/adblockradio/buffer.git
cd buffer
npm install
cd client
npm install
npm run build
cd ..
```

#### Interface in browser
```
npm run start
```
Open `http://localhost:9820` in your favorite browser.
Add your radios and enjoy!

#### Interface in Electron (native desktop app)
```
cd node_modules/adblockradio
npm rebuild zeromq --runtime=electron --target=3.1.7 --update-binary
cd ../..
npm run electron
```
Add your radios and enjoy!


### Development

In a first terminal, open React dev server:
```
cd client
npm start
```

#### Interface in browser
In another terminal, run the backend:
```
npm run startdev
```
Open `http://localhost:9820` in your favorite browser.

#### Interface in Electron (native desktop app)
In another terminal, run the backend:
```
npm run electrondev
```

## Roadmap

- Nicer UI and UX (help would be appreciated)
- Cross platform Electron builds
- Docker builds (WIP)
- Cordova apps (WIP), or even better React native apps

Contributions welcome.

## Copyright

Copyright 2018-2019, [Alexandre Storelli](https://github.com/dest4)
