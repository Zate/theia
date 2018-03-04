FROM node:8-alpine as builder
ENV GOLANG_VERSION=1.9.4
ARG version=next
WORKDIR /home/theia
ADD $version.package.json ./package.json
RUN apk add --no-cache wget git bash ca-certificates make gcc g++ python go \
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
    && rm -rf /go-alpine-patches 

FROM node:8-alpine
WORKDIR /home/theia
COPY --from=builder /usr/local/go /usr/local/go
COPY --from=builder /home/theia /home/theia
RUN apk add --no-cache git bash-completion openssh-client ca-certificates libstdc++ bash \
    && apk add --no-cache --virtual .build-deps \
        binutils-gold \
        curl \
        g++ \
        gcc \
        gnupg \
        libgcc \
        linux-headers \
        make \
        python \
        tar \
        musl-dev \
        go \
        wget \
        xz \
    && cd /usr/local/bin \ 
    && ln -s node nodejs \
    && cd ~ \
    && mkdir ~/.bash \
    && cd ~/.bash \
    && git clone https://github.com/jimeh/git-aware-prompt \
    && cd ~ \
    && echo 'export GITAWAREPROMPT=~/.bash/git-aware-prompt' >> ~/.bashrc \
    && echo 'source "${GITAWAREPROMPT}/main.sh"' >> ~/.bashrc \
    && echo 'export PS1="\${debian_chroot:+(\$debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\] \[$txtcyn\]\$git_branch\[$txtred\]\$git_dirty\[$txtrst\]\$ "' >> ~/.bashrc \
    && source ~/.bashrc \
    && cd /home/theia \
    && yarn --cache-folder ./ycache \
    && rm -rf ./ycache \
    && yarn theia build \
    && yarn cache clean \
    && mkdir -p /home/project/go \
    && export PATH="/usr/local/go/bin:$PATH" \
    && export GOPATH="/home/project/go" \
    && export PATH=$GOPATH/bin:$PATH \
    && go version \
    && mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 777 "$GOPATH" \
    && go get -u github.com/ramya-rao-a/go-outline \ 
    && echo "go-outline installed." \
    && go get -u github.com/acroca/go-symbols \
    && echo "go-symbols installed." \
    && go get -u github.com/nsf/gocode \
    && echo "gocode installed." \
    && go get -u github.com/rogpeppe/godef \
    && echo "godef installed." \
    && go get -u golang.org/x/tools/cmd/godoc \
    && echo "godoc installed." \
    && go get -u github.com/zmb3/gogetdoc \
    && echo "gogetdoc installed." \
    && go get -u github.com/golang/lint/golint \
    && echo "golint installed." \
    && go get -u github.com/fatih/gomodifytags \
    && echo "gomodifytags installed." \
    && go get -u github.com/uudashr/gopkgs/cmd/gopkgs \
    && echo "gopkgs installed." \
    && go get -u golang.org/x/tools/cmd/gorename \
    && echo "gorename installed." \
    && go get -u sourcegraph.com/sqs/goreturns \
    && echo "goreturns installed." \
    && go get -u github.com/cweill/gotests/... \
    && echo "gotests installed." \
    && go get -u golang.org/x/tools/cmd/guru \
    && echo "guru installed." \
    && go get -u github.com/josharian/impl \
    && echo "impl installed." \
    && go get -u github.com/haya14busa/goplay/cmd/goplay \
    && echo "goplay installed." \
    && go get -u github.com/golang/dep/cmd/dep \
    && echo "dep installed." \
    && go get -u github.com/davidrjenni/reftools/cmd/fillstruct \
    && echo "fillstruct installed." \
    && echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf \
    && yarn --cache-folder ./ycache \
    && rm -rf ./ycache \
    && yarn theia build \
    && rm -rf ./node_modules/electron* \
    && yarn cache clean \
# Optional for my personal use
    && apk del .build-deps \
    && printf '[user]\n    name = Zate\n    email = zate75@gmail.com\n' > /root/.gitconfig \
    && mkdir -p /root/.go \
    && echo '{"toolsGopath":"/root/go"}' > /root/.go/go.json


EXPOSE 3000
ENV SHELL /bin/bash
ENV USE_LOCAL_GIT true
ENV PATH "/usr/local/go/bin:$PATH"
ENV GOPATH "/home/project/go"
ENV PATH "$GOPATH/bin:$PATH"
ENV TDIR "/home/theia"
ADD docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]



