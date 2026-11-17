# The image glitchful-dev/home-lab runs at chess-kn-puzzle.glitchful.dev, under its
# docs/08-app-image-standard.md. CI (.github/workflows/image.yml) builds the same thing.

FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
RUN apk add --no-cache brotli && corepack enable
WORKDIR /src
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm typecheck && pnpm test && pnpm build
# Precompressed copies, served as-is by compression-static.
RUN find dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' \
      -o -name '*.json' -o -name '*.txt' \) -size +1024c \
      -exec sh -c 'gzip -9 -k "$1" && brotli -q 11 -k "$1"' _ {} \;
# No file times, so the server sends no Last-Modified and a deploy can never be
# answered with a 304 for the old page.
RUN find dist -exec touch -d @0 {} +

FROM ghcr.io/static-web-server/static-web-server:2@sha256:ccf2d666ffe5f8ef2ec96bc40f07757605998c04b78f7d8fdb98a584dd4f5717
LABEL org.opencontainers.image.source="https://github.com/glitchful-dev/chess-kn-puzzle"
COPY --from=build /src/dist/ /public/
COPY sws.toml /etc/sws.toml
USER 65534
EXPOSE 8080
CMD ["--config-file", "/etc/sws.toml"]
