docker_container = ghcr.io/odama626/arcanetable/scry-server-pokemon:latest

build:
	docker build . -t ${docker_container}

push:
	docker push ${docker_container}

deploy:
	kubectl apply -f manifest.yaml
	kubectl rollout restart -f manifest.yaml
