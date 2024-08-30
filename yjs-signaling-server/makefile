docker_container = ghcr.io/odama626/arcanetable/signaling:latest

build:
	pnpm build
	docker build . -t ${docker_container}

push:
	docker push ${docker_container}