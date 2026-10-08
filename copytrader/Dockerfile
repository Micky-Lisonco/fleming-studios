FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
VOLUME /data
EXPOSE 8080
CMD ["npm", "start"]
