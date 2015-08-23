FROM node:0.10
MAINTAINER Zas

RUN mkdir /src
ADD ./ /src

WORKDIR /src
RUN npm install

RUN npm build

ENV ZASBB_FUNCTION="Server"
EXPOSE 3000

ENTRYPOINT ["npm", "start"]
