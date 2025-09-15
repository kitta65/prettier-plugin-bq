.PHONY: setup
setup:
	command -v wasm-pack || cargo install wasm-pack

.PHONY: fmt
fmt:
	cargo fmt

.PHONY: test
test: setup
	cargo fmt --check
	cargo test
	wasm-pack test --node

.PHONY: build
build: test
	wasm-pack build --target nodejs
	cp ./LICENSE* pkg/

.PHONY: publish
publish:
	cd ./pkg && npm publish
