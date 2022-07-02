FROM ghcr.io/swiftwasm/swift:5.6-focal

LABEL maintainer="Andrew Barba <andrew@swift.cloud>"
LABEL Description="Swift Cloud is the fastest way to build and deploy server side Swift applications."
LABEL org.opencontainers.image.source https://github.com/swift-cloud/build

# Install Binaryen
RUN set -e; \
    BINARYEN_BIN_URL="https://github.com/WebAssembly/binaryen/releases/download/version_109/binaryen-version_109-x86_64-linux.tar.gz" \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -q update && apt-get -q install -y curl && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "$BINARYEN_BIN_URL" -o binaryen.tar.gz \
    && tar -xzf binaryen.tar.gz --directory / \
    && cp -r /binaryen-version_109/bin/wasm-opt /usr/bin \
    && chmod -R o+r /usr/bin/wasm-opt \
    && rm -rf binaryen.tar.gz binaryen-version_109 \
    && apt-get purge --auto-remove -y curl \
    && wasm-opt --version

# Install Node.js
RUN set -e; \
    export DEBIAN_FRONTEND=noninteractive \
    && apt-get -q update && apt-get -q install -y curl && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://deb.nodesource.com/setup_16.x" | bash - \
    && apt-get install -y nodejs \
    && apt-get purge --auto-remove -y curl \
    && node --version

# Install build app
COPY src ./src
COPY *.json *.ts ./
RUN set -e; \
    npm install \
    && npm run build \
    && npm cache clean --force \
    && rm -rf node_modules src *.json *.ts

# Set entry point
CMD [ "node", "./bin/fargate.js" ]
