FROM node as builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:slim

ENV NODE_ENV production
ENV BOT_TOKEN '5006553438:AAGtfisPFLv71VIiMj7Rzk-x63_BjJYJ4hg'

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/template.svg .
RUN apt-get update; apt-get install -y fontconfig


EXPOSE 8080
CMD [ "node", "dist/index.js" ]