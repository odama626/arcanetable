docker_container = ghcr.io/odama626/arcanetable/scry-server-mtg
github_repo = "org.opencontainers.image.source=https://github.com/odama626/arcanetable"

# ---- build metadata ----
GIT_SHA        := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
GIT_SHA_FULL   := $(shell git rev-parse HEAD 2>/dev/null || echo unknown)
GIT_DIRTY      := $(shell git diff --quiet || echo -dirty)
BUILD_DATE     := $(shell date -u +"%Y-%m-%dT%H.%M.%SZ")
BUILD_ID       := $(GIT_SHA)$(GIT_DIRTY)
BUILD_VERSION  := $(BUILD_DATE)-$(BUILD_ID)

build:
	docker build . \
		--label $(github_repo) \
		-t $(docker_container):latest \
		-t $(docker_container):$(BUILD_ID) \
		-t $(docker_container):$(BUILD_DATE)

push:
	docker push --all-tags $(docker_container)

deploy:
	kubectl apply -f manifest.yaml
	kubectl rollout restart -f manifest.yaml
