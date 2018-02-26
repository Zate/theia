FROM node:8-alpine as builder
ENV GOLANG_VERSION=1.9.4
ARG version=next
WORKDIR /home/theia
ADD $version.package.json ./package.json
RUN apk add --no-cache wget bash ca-certificates make gcc g++ python go \
    && export GOROOT_BOOTSTRAP="$(go env GOROOT)" GOOS="$(go env GOOS)" GOARCH="$(go env GOARCH)" \
      GOHOSTOS="$(go env GOHOSTOS)" GOHOSTARCH="$(go env GOHOSTARCH)" \
    && export GO386='387' \
    && wget -O go.tgz "https://golang.org/dl/go$GOLANG_VERSION.src.tar.gz" \
    && tar -C /usr/local -xzf go.tgz \
    && rm go.tgz \
    && cd /usr/local/go/src \
    && for p in /go-alpine-patches/*.patch \
        ; do \
            [ -f "$p" ] || continue; \
            patch -p2 -i "$p"; \
        done \
    && ./make.bash \
    && rm -rf /go-alpine-patches \
    && cd /home/theia \
    && yarn \
    && yarn theia build \
    && rm -rf ./node_modules/electron \
    && yarn cache clean 

FROM node:8-alpine
WORKDIR /home/theia
COPY --from=builder /home/theia /home/theia
COPY --from=builder /usr/local/go /usr/local/go
RUN apk add --no-cache git openssh-client ca-certificates libstdc++ bash \
    && mkdir -p /home/project \
    && export PATH="/usr/local/go/bin:$PATH" \
    && export GOPATH="/home/project" \
    && export PATH=$GOPATH/bin:$PATH \
    && go version \
    && mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 777 "$GOPATH" \
    && go get -u -v github.com/ramya-rao-a/go-outline \ 
    && go get -u -v github.com/acroca/go-symbols \
    && go get -u -v github.com/nsf/gocode \
    && go get -u -v github.com/rogpeppe/godef \
    && go get -u -v golang.org/x/tools/cmd/godoc \
    && go get -u -v github.com/zmb3/gogetdoc \
    && go get -u -v github.com/golang/lint/golint \
    && go get -u -v github.com/fatih/gomodifytags \
    && go get -u -v github.com/uudashr/gopkgs/cmd/gopkgs \
    && go get -u -v golang.org/x/tools/cmd/gorename \
    && go get -u -v sourcegraph.com/sqs/goreturns \
    && go get -u -v github.com/cweill/gotests/... \
    && go get -u -v golang.org/x/tools/cmd/guru \
    && go get -u -v github.com/josharian/impl \
    && go get -u -v github.com/haya14busa/goplay/cmd/goplay \
    && go get -u -v github.com/golang/dep/cmd/dep \
    && echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf \
# Optional for my personal use
    && printf "[user]\n    name = Zate\n    email = zate75@gmail.com\n" > /root/.gitignore \
    && mkdir -p /root/.go \
    && echo '{"toolsGopath":"/root/go"}' > /root/.go/go.json


EXPOSE 3000
ENV SHELL /bin/bash
ENV USE_LOCAL_GIT true
ENV PATH "/usr/local/go/bin:$PATH"
ENV GOPATH "/home/project"
ENV PATH "$GOPATH/bin:$PATH"
ENV TDIR "/home/theia"
ADD docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]



