docker_container = ghcr.io/odama626/arcanetable
github_repo = "org.opencontainers.image.source=https://github.com/odama626/arcanetable"
# ---- build metadata ----
GIT_SHA        := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
GIT_SHA_FULL   := $(shell git rev-parse HEAD 2>/dev/null || echo unknown)
GIT_DIRTY      := $(shell git diff --quiet || echo -dirty)
BUILD_DATE     := $(shell date -u +"%Y-%m-%dT%H.%M.%SZ")
BUILD_ID       := $(GIT_SHA)$(GIT_DIRTY)
BUILD_VERSION  := $(BUILD_DATE)-$(BUILD_ID)
# Vite-exposed env vars
export VITE_APP_NAME     = Arcanetable
export VITE_BUILD_ID     = $(BUILD_VERSION)
export VITE_GIT_SHA      = $(GIT_SHA)
export VITE_GIT_SHA_FULL = $(GIT_SHA_FULL)
export VITE_BUILD_DATE   = $(BUILD_DATE)
export VITE_BUILD_ENV    = production

build:
	pnpm build
	docker build . \
		--label $(github_repo) \
		-t $(docker_container):latest \
		-t $(docker_container):$(BUILD_ID) \
		-t $(docker_container):$(BUILD_DATE) \
		-t $(docker_container):beta \
		-t $(docker_container):staging
		
	make -C yjs-signaling-server build
	make -C websocket-server build
	make -C scry-server-mtg build
	make -C scry-server-yugioh build
	make -C scry-server-pokemon build
	
push: build
	docker push $(docker_container):latest
	docker push $(docker_container):$(BUILD_ID)
	docker push $(docker_container):$(BUILD_DATE)
	docker push $(docker_container):beta
	docker push $(docker_container):staging

	make -C yjs-signaling-server push
	make -C websocket-server push
	make -C scry-server-mtg push
	make -C scry-server-yugioh push
	make -C scry-server-pokemon push

deploy: build push
	make -C scry-server-mtg apply
	make -C scry-server-yugioh apply
	make -C scry-server-pokemon apply
	kubectl apply -f secrets.yml -f deployment.yml -f staging.yaml
	kubectl rollout restart deployment -n arcanetable
	
promote_staging:
	docker pull $(docker_container):staging
	docker tag $(docker_container):staging $(docker_container):production
	docker tag $(docker_container):staging $(docker_container):stable
	
	docker push $(docker_container):production
	docker push $(docker_container):stable
	docker push $(docker_container):staging
	
	kubectl apply -f secrets.yml -f deployment.yml
	kubectl rollout restart deployment -n arcanetable
