FROM node:carbon

RUN useradd --user-group --create-home --shell /bin/false app && \
	mkdir -p /usr/src/adblockradio-buffer \
		/usr/src/adblockradio-buffer/config \
		/usr/src/adblockradio-buffer/log \
		/usr/src/adblockradio-buffer/adblockradio-dl \
		/usr/src/adblockradio-buffer/client/build && \
	chown -R app:app /usr/src/adblockradio-buffer

WORKDIR /usr/src/adblockradio-buffer
USER app

# installation of main module files
COPY *.js* ./
COPY config/default* config/
COPY adblockradio-dl adblockradio-dl/

WORKDIR /usr/src/adblockradio-buffer
COPY client/build client/build/
RUN mv config/default_user.json config/user.json && \
	mv config/default_radios.json config/radios.json && \
	npm install

EXPOSE 9820
ENV NAME World
CMD ["node", "index.js"]
