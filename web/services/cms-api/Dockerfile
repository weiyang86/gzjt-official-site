FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json ./

RUN npm run prisma:generate
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/main.js"]

