docker_container = ghcr.io/odama626/arcanetable:latest


# ---- build metadata ----
GIT_SHA        := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
GIT_SHA_FULL   := $(shell git rev-parse HEAD 2>/dev/null || echo unknown)
GIT_DIRTY      := $(shell git diff --quiet || echo -dirty)
BUILD_DATE     := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
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
