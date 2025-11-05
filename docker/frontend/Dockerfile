FROM node:18-bullseye

WORKDIR /usr/src/app

# copy package files and install (node_modules kept separate by volume)
COPY frontend/package.json frontend/package-lock.json* /usr/src/app/
RUN npm ci --silent || npm install --silent

# copy app sources (volume mounts in dev will override)
COPY frontend /usr/src/app

EXPOSE 3000

CMD ["npm", "start"]