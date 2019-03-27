FROM adblockradio/adblockradio-docker-primary:0.0.2

RUN useradd --user-group --create-home --shell /bin/false app && \
	mkdir -p /usr/src/buffer/api \
		/usr/src/buffer/client/build \
		/usr/src/buffer/config \
		/usr/src/buffer/handlers \
		/usr/src/buffer/log \
		/usr/src/buffer/model && \
	chown -R app:app /usr/src/buffer

WORKDIR /usr/src/buffer

USER app

COPY index.js ./
COPY package* ./
COPY api/*.js api/
COPY client/build/ client/build/
COPY handlers/*.js handlers/

RUN npm install --only=prod

EXPOSE 9820

CMD ["node", "index.js"]
