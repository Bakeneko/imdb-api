ARG NODE_VERSION=22

FROM node:${NODE_VERSION}

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chrome that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros \
    fonts-kacst fonts-freefont-ttf dbus dbus-x11

WORKDIR /home/node

# Specify puppeteer cache dir.
ENV PUPPETEER_CACHE_DIR=/home/node/.cache/puppeteer

# Use production node environment by default.
ENV NODE_ENV=production

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Install chrome.
RUN npx puppeteer browsers install chrome --install-deps

RUN usermod -aG audio,video node
    
# Copy the rest of the source files into the image.
COPY --chown=node:node . .

# Build the application.
RUN npm run build

# Run the application as a non-root user.
USER node

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD ["npm","run", "start:prod"]
