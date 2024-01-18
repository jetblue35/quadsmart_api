FROM node:16

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 8393
EXPOSE 443
EXPOSE 80

CMD ["npm", "run", "start"]