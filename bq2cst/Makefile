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
	wasm-pack build --target nodejs --out-dir cjs
	cp ./LICENSE* cjs/
	cp src/bq2cst.d.ts cjs/
	wasm-pack build --target browser --out-dir esm
	cp ./LICENSE* esm/
	cp src/bq2cst.d.ts esm/

.PHONY: release
release:
	cd ./cjs && pnpm publish --no-git-checks
