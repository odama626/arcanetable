docker_container = ghcr.io/odama626/arcanetable:latest

build:
	pnpm build
	docker build . -t ${docker_container}
	make -C yjs-signaling-server build
	make -C websocket-server build

push: build
	docker push ${docker_container}
	make -C yjs-signaling-server push
	make -C websocket-server push

deploy:	build push
	kubectl apply -f secrets.yml -f deployment.yml
	kubectl rollout restart -f deployment.yml
